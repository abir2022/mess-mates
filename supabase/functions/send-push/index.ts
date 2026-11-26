// send-push — Supabase Edge Function (Deno)
//
// Two modes:
//   { "mode": "message", "title": "...", "body": "...", "messId": "...", "userIds": [...] }
//   { "mode": "reminders" }
//
// "reminders" looks at open cycles and sends at most one of each reminder per
// person per Dhaka day: unlogged meals, tomorrow's bazar duty, and pending
// bazar approvals for managers. The push_deliveries table makes retries safe.
//
// Required secrets (Dashboard → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
//   PUSH_TRIGGER_SECRET              (the caller's bearer token)
//   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
//
// Deploy: supabase functions deploy send-push
// Call:   POST /functions/v1/send-push
//         Authorization: Bearer <PUSH_TRIGGER_SECRET>
//
// The GitHub workflow .github/workflows/push-reminders.yml calls this twice a
// day when the repository has SUPABASE_URL and PUSH_TRIGGER_SECRET secrets.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Subscription = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }
type Reminder = { userId: string; kind: string; title: string; body: string; url: string }

function dhakaDay(offset = 0): string {
  const date = new Date(Date.now() + offset * 86_400_000)
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const json = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  try {
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@messmates.app'
    const triggerSecret = Deno.env.get('PUSH_TRIGGER_SECRET') ?? ''

    if (!publicKey || !privateKey) return json({ error: 'VAPID keys are not set' }, 503)
    if (!triggerSecret) return json({ error: 'PUSH_TRIGGER_SECRET is not set' }, 503)
    if ((request.headers.get('Authorization') ?? '') !== `Bearer ${triggerSecret}`) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    webpush.setVapidDetails(subject, publicKey, privateKey)

    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const mode = (payload.mode as string | undefined) ?? 'message'

    const reminders: Reminder[] = []

    if (mode === 'reminders') {
      const today = dhakaDay(0)
      const tomorrow = dhakaDay(1)

      const { data: cycles, error: cycleError } = await supabase
        .from('monthly_cycles')
        .select('id, mess_id, month_label, messes (name, meal_lock_hour)')
        .eq('status', 'open')
      if (cycleError) throw cycleError

      const messIds = (cycles ?? []).map((cycle) => cycle.mess_id as string)
      const { data: members, error: memberError } = messIds.length
        ? await supabase
            .from('mess_members')
            .select('mess_id, user_id, role')
            .eq('status', 'active')
            .in('mess_id', messIds)
        : { data: [], error: null }
      if (memberError) throw memberError

      const membersByMess = new Map<string, { user_id: string; role: string }[]>()
      for (const member of members ?? []) {
        const list = membersByMess.get(member.mess_id) ?? []
        list.push({ user_id: member.user_id, role: member.role })
        membersByMess.set(member.mess_id, list)
      }

      for (const cycle of cycles ?? []) {
        const mess = (cycle.messes ?? {}) as { name?: string; meal_lock_hour?: number }
        const messName = mess.name ?? 'Your mess'
        const lockHour = mess.meal_lock_hour ?? 22
        const active = membersByMess.get(cycle.mess_id as string) ?? []

        const { data: meals, error: mealError } = await supabase
          .from('daily_meals')
          .select('user_id, breakfast, lunch, dinner, guest_meals')
          .eq('cycle_id', cycle.id)
          .eq('date', today)
        if (mealError) throw mealError

        const logged = new Set(
          (meals ?? [])
            .filter(
              (row) =>
                Number(row.breakfast) + Number(row.lunch) + Number(row.dinner) + Number(row.guest_meals) > 0,
            )
            .map((row) => row.user_id as string),
        )

        for (const member of active) {
          if (logged.has(member.user_id)) continue
          reminders.push({
            userId: member.user_id,
            kind: 'meals',
            title: 'Log today’s meals 🍚',
            body: `${messName}: today is not logged yet. The cut-off is ${String(lockHour).padStart(2, '0')}:00.`,
            url: '/#/meals',
          })
        }

        const { data: pendingBazar, error: bazarError } = await supabase
          .from('bazar_expenses')
          .select('id')
          .eq('cycle_id', cycle.id)
          .eq('status', 'pending')
          .is('voided_at', null)
        if (bazarError) throw bazarError

        if ((pendingBazar ?? []).length) {
          for (const member of active) {
            if (member.role !== 'admin' && member.role !== 'manager') continue
            reminders.push({
              userId: member.user_id,
              kind: 'approvals',
              title: 'Bazar waiting for approval 🧾',
              body: `${messName}: ${pendingBazar?.length ?? 0} entr${(pendingBazar?.length ?? 0) === 1 ? 'y' : 'ies'} not in the meal rate yet.`,
              url: '/#/meals',
            })
          }
        }
      }

      const { data: duties, error: dutyError } = await supabase
        .from('bazar_schedule')
        .select('mess_id, assigned_user_id, shopping_list_json, messes (name)')
        .eq('scheduled_date', tomorrow)
        .eq('status', 'upcoming')
        .not('assigned_user_id', 'is', null)
      if (dutyError) throw dutyError

      for (const duty of duties ?? []) {
        if (!duty.assigned_user_id) continue
        const mess = (duty.messes ?? {}) as { name?: string }
        const items = (duty.shopping_list_json as string[] | null)?.length ?? 0
        reminders.push({
          userId: duty.assigned_user_id,
          kind: 'duty',
          title: 'Bazar duty tomorrow 🛒',
          body: `${mess.name ?? 'Your mess'}${items ? `: ${items} item${items === 1 ? '' : 's'} on the list.` : '. Check the roster.'}`,
          url: '/#/hub',
        })
      }
    } else {
      const users = Array.isArray(payload.userIds) ? (payload.userIds as string[]) : []
      const messId = payload.messId as string | undefined
      let query = supabase.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth').limit(5000)
      if (messId) query = query.eq('mess_id', messId)
      if (users.length) query = query.in('user_id', users)
      const { data, error } = await query
      if (error) throw error

      const title = (payload.title as string | undefined) ?? 'Mess Mates'
      const body = (payload.body as string | undefined) ?? 'Open the app to see today’s mess.'
      const url = (payload.url as string | undefined) ?? '/'
      const result = await deliver(supabase, (data ?? []) as Subscription[], { title, body, url })
      return json(result)
    }

    // De-duplicate: one reminder of each kind per person per Dhaka day.
    const candidates = [...new Map(reminders.map((item) => [`${item.userId}:${item.kind}`, item])).values()]
    const today = dhakaDay(0)
    const kinds = [...new Set(candidates.map((item) => item.kind))]
    const userIds = [...new Set(candidates.map((item) => item.userId))]

    const { data: alreadySent } = userIds.length
      ? await supabase
          .from('push_deliveries')
          .select('user_id, kind')
          .eq('sent_on', today)
          .in('kind', kinds)
          .in('user_id', userIds)
      : { data: [] as { user_id: string; kind: string }[] }
    const seen = new Set((alreadySent ?? []).map((row) => `${row.user_id}:${row.kind}`))
    const fresh = candidates.filter((item) => !seen.has(`${item.userId}:${item.kind}`))

    if (!fresh.length) return json({ sent: 0, failed: 0, removed: 0, skipped: candidates.length })

    await supabase
      .from('push_deliveries')
      .upsert(
        fresh.map((item) => ({ user_id: item.userId, kind: item.kind, sent_on: today })),
        { onConflict: 'user_id,kind,sent_on', ignoreDuplicates: true },
      )

    const freshIds = [...new Set(fresh.map((item) => item.userId))]
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .in('user_id', freshIds)
      .limit(5000)
    if (subError) throw subError

    const byUser = new Map<string, Subscription[]>()
    for (const row of (subscriptions ?? []) as Subscription[]) {
      const list = byUser.get(row.user_id) ?? []
      list.push(row)
      byUser.set(row.user_id, list)
    }

    const totals = { sent: 0, failed: 0, removed: 0 }
    for (const item of fresh) {
      const rows = byUser.get(item.userId) ?? []
      if (!rows.length) continue
      const result = await deliver(supabase, rows, item)
      totals.sent += result.sent
      totals.failed += result.failed
      totals.removed += result.removed
    }

    return json({ ...totals, skipped: candidates.length - fresh.length })
  } catch (error) {
    return json({ error: (error as Error).message }, 500)
  }
})

async function deliver(
  supabase: ReturnType<typeof createClient>,
  subscriptions: Subscription[],
  payload: { title: string; body: string; url: string },
) {
  let sent = 0
  let failed = 0
  const gone: string[] = []

  await Promise.allSettled(
    subscriptions.map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          JSON.stringify({ ...payload, tag: 'mess-mates-daily' }),
          { TTL: 60 * 60 * 12 },
        )
        sent += 1
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode
        // 404/410 means the browser dropped the subscription for good.
        if (status === 404 || status === 410) gone.push(row.id)
        else failed += 1
      }
    }),
  )

  if (gone.length) await supabase.from('push_subscriptions').delete().in('id', gone)
  return { sent, failed, removed: gone.length }
}
