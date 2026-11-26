import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  BazarDuty,
  BazarExpense,
  JoinRequest,
  ClientError,
  DailyMeal,
  DepositRequest,
  CycleTotals,
  DuesSettlement,
  FixedUtility,
  GameRoom,
  GameType,
  LedgerRow,
  LiveChange,
  ManagerTerm,
  MemberDeposit,
  MemberRequest,
  Mess,
  MessBan,
  MessMember,
  MessMessage,
  MonthlyCycle,
  Poll,
  PollVote,
  Profile,
  SupportOverview,
  Workspace,
} from './types'
import type {
  Backend,
  BazarInput,
  DayMealInput,
  DepositInput,
  DepositRequestInput,
  DutyInput,
  GamePatch,
  MealInput,
  PollInput,
  SettlementInput,
  SettlementRecordInput,
  UtilityInput,
} from './backend'

type Row = Record<string, unknown>

function unwrap<T>(data: unknown, error: { message: string } | null): T {
  if (error) throw new Error(error.message)
  return data as T
}

export function createSupabaseBackend(url: string, key: string): Backend {
  const supabase: SupabaseClient = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })

  let context: { messId: string; cycleId: string | null } | null = null

  async function requireUser() {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) throw new Error('Your session expired. Please sign in again.')
    return data.user
  }

  async function ensureProfile(): Promise<Profile | null> {
    const user = await requireUser()
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (error) throw new Error(error.message)
    if (data) return data as Profile

    const meta = (user.user_metadata ?? {}) as Record<string, string>
    const profile = {
      id: user.id,
      full_name: meta.full_name || meta.name || user.email?.split('@')[0] || 'Member',
      email: user.email ?? '',
      avatar_url: meta.avatar_url ?? null,
      is_pro: false,
      xp_points: 0,
      avatar_frame: 'ring',
      frame_unlocked_until: null,
    }

    const { error: insertError } = await supabase.from('profiles').insert(profile)
    if (!insertError) return profile

    if (insertError.code === '23505') {
      const { data: existing } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (existing) return existing as Profile
    }

    // A project migrated from an older schema can have extra required columns,
    // so retry with the only columns every version has before giving up.
    const fallbacks = [
      () => supabase.from('profiles').insert({ id: profile.id, full_name: profile.full_name }),
      () => supabase.from('profiles').insert({ id: profile.id }),
    ]
    for (const attempt of fallbacks) {
      const { error: retryError } = await attempt()
      if (!retryError) return profile
    }
    throw new Error(insertError.message)
  }

  async function requireContext() {
    if (context) return context
    const profile = await ensureProfile()
    if (!profile) throw new Error('Not signed in')
    const { data: membership } = await supabase
      .from('mess_members')
      .select('mess_id')
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
    if (!membership) throw new Error('You are not in a mess yet.')
    const { data: cycle } = await supabase
      .from('monthly_cycles')
      .select('id')
      .eq('mess_id', (membership as { mess_id: string }).mess_id)
      .eq('status', 'open')
      .order('month_label', { ascending: false })
      .limit(1)
      .maybeSingle()
    context = {
      messId: (membership as { mess_id: string }).mess_id,
      cycleId: cycle ? (cycle as { id: string }).id : null,
    }
    return context
  }

  async function requireCycleId(): Promise<string> {
    const ctx = await requireContext()
    if (!ctx.cycleId) throw new Error('Start a monthly cycle first from Mess Hub → Settings.')
    return ctx.cycleId
  }

  // ---- Live updates -------------------------------------------------------
  // One channel for every table the workspace renders. Realtime still applies
  // RLS, so a member only hears about rows in messes they belong to.
  const liveTables = [
    'daily_meals',
    'bazar_expenses',
    'bazar_schedule',
    'fixed_utilities',
    'member_deposits',
    'mess_members',
    'mess_messages',
    'polls',
    'poll_votes',
    'game_rooms',
    'monthly_cycles',
    'messes',
    'profiles',
    'member_requests',
    'mess_bans',
    'manager_terms',
    'deposit_requests',
    'dues_settlements',
    'join_requests',
  ]

  let liveChannel: ReturnType<typeof supabase.channel> | null = null

  function stopLive() {
    if (!liveChannel) return
    void supabase.removeChannel(liveChannel)
    liveChannel = null
  }

  function subscribe(onChange: (change: LiveChange) => void) {
    stopLive()
    const channel = supabase.channel('mess-mates-workspace')
    for (const table of liveTables) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        const event = payload as unknown as {
          eventType?: LiveChange['eventType']
          new?: Record<string, unknown>
          old?: Record<string, unknown>
        }
        onChange({
          table,
          eventType: event.eventType ?? 'UPDATE',
          row: event.new ?? null,
          oldRow: event.old ?? null,
        })
      })
    }
    channel.subscribe()
    liveChannel = channel
    return stopLive
  }

  return {
    mode: 'supabase',
    subscribe,

    async currentUser() {
      // A failed OAuth redirect (e.g. the auth server could not create the user)
      // is only reported by initialize(), otherwise we silently land back on the
      // login page with no explanation.
      const init = await supabase.auth.initialize()
      if (init?.error) {
        if (window.location.hash.includes('error')) {
          window.history.replaceState(null, '', window.location.pathname)
        }
        throw new Error(init.error.message)
      }
      const { data, error } = await supabase.auth.getSession()
      if (error) throw new Error(error.message)
      if (!data.session?.user) return null
      return ensureProfile()
    },

    async signInWithGoogle() {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname },
      })
      if (error) throw new Error(error.message)
    },

    async signInWithEmail(email: string) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin + window.location.pathname },
      })
      if (error) throw new Error(error.message)
    },

    async signInDemo() {
      throw new Error('Demo sign-in is unavailable when Supabase is connected.')
    },

    async signOut() {
      context = null
      const { error } = await supabase.auth.signOut()
      if (error) throw new Error(error.message)
    },

    async loadWorkspace() {
      const profile = await ensureProfile()
      if (!profile) return null

      const { data: memberships } = await supabase
        .from('mess_members')
        .select('mess_id')
        .eq('user_id', profile.id)
        .eq('status', 'active')
        .limit(1)

      const membership = (memberships as { mess_id: string }[] | null)?.[0]
      if (!membership) return null

      const messId = membership.mess_id
      const { data: mess, error: messError } = await supabase.from('messes').select('*').eq('id', messId).single()
      if (messError) throw new Error(messError.message)

      const { data: memberRows } = await supabase
        .from('mess_members')
        .select('*, profile:profiles(*)')
        .eq('mess_id', messId)
        .order('joined_at', { ascending: true })

      const members: MessMember[] = ((memberRows ?? []) as unknown as (Row & { profile: Profile | null })[]).map((row) => ({
        id: String(row.id),
        mess_id: String(row.mess_id),
        user_id: String(row.user_id),
        role: row.role as MessMember['role'],
        status: row.status as MessMember['status'],
        joined_at: String(row.joined_at),
        display_name: (row.display_name as string | undefined) ?? '',
        avatar_url: (row.avatar_url as string | null | undefined) ?? null,
        profile:
          row.profile ??
          ({
            id: String(row.user_id),
            full_name: 'Member',
            email: '',
            avatar_url: null,
            is_pro: false,
            xp_points: 0,
            avatar_frame: 'ring',
            frame_unlocked_until: null,
          } as Profile),
      }))

      const { data: cycleRows } = await supabase
        .from('monthly_cycles')
        .select('*')
        .eq('mess_id', messId)
        .order('month_label', { ascending: false })
      const cycles = ((cycleRows ?? []) as MonthlyCycle[]) ?? []
      const cycleIds = cycles.map((cycle) => cycle.id)

      const [meals, bazar, utilities, deposits] = await Promise.all([
        cycleIds.length
          ? supabase.from('daily_meals').select('*').in('cycle_id', cycleIds)
          : Promise.resolve({ data: [] }),
        cycleIds.length
          ? supabase.from('bazar_expenses').select('*').in('cycle_id', cycleIds)
          : Promise.resolve({ data: [] }),
        cycleIds.length
          ? supabase.from('fixed_utilities').select('*').in('cycle_id', cycleIds)
          : Promise.resolve({ data: [] }),
        cycleIds.length
          ? supabase.from('member_deposits').select('*').in('cycle_id', cycleIds)
          : Promise.resolve({ data: [] }),
      ])

      const [dutyRows, pollRows, messageRows, gameRows, leaderboardRows] = await Promise.all([
        supabase.from('bazar_schedule').select('*').eq('mess_id', messId).order('scheduled_date', { ascending: true }),
        supabase.from('polls').select('*').eq('mess_id', messId).order('created_at', { ascending: false }),
        supabase.from('mess_messages').select('*').eq('mess_id', messId).order('created_at', { ascending: true }),
        supabase.from('game_rooms').select('*').eq('mess_id', messId).order('updated_at', { ascending: false }),
        supabase
          .from('guild_leaderboard')
          .select('id, name, guild_points, guild_emblem, guild_banner')
          .order('guild_points', { ascending: false })
          .limit(10),
      ])

      const pollIds = ((pollRows.data ?? []) as Poll[]).map((poll) => poll.id)
      const { data: voteRows } = pollIds.length
        ? await supabase.from('poll_votes').select('*').in('poll_id', pollIds)
        : { data: [] as PollVote[] }

      // Governance tables arrive with 007. On a project that has not run it
      // yet these queries fail quietly and the app behaves as before.
      const [requestRows, banRows, termRows, depositRequestRows, settlementRows, joinRequestRows] = await Promise.all([
        supabase.from('member_requests').select('*').eq('mess_id', messId).order('created_at', { ascending: false }),
        supabase.from('mess_bans').select('*').eq('mess_id', messId),
        supabase.from('manager_terms').select('*').eq('mess_id', messId).order('starts_on', { ascending: false }),
        cycleIds.length
          ? supabase.from('deposit_requests').select('*').in('cycle_id', cycleIds)
          : Promise.resolve({ data: [] }),
        supabase.from('dues_settlements').select('*').eq('mess_id', messId).order('created_at', { ascending: false }),
        supabase
          .from('join_requests')
          // `user_id` and `decided_by` both reference profiles, so the embed
          // must name the requester FK or PostgREST answers 300 (ambiguous).
          .select('*, profile:profiles!join_requests_user_id_fkey(full_name, email, avatar_url)')
          .eq('mess_id', messId)
          .order('created_at', { ascending: false }),
      ])

      const openCycle = cycles.find((cycle) => cycle.status === 'open') ?? cycles[0] ?? null
      context = { messId, cycleId: openCycle?.id ?? null }

      // Postgres keeps JSON columns under their storage names (`options_json`,
      // `shopping_list_json`, `state_json`) while the app models them as
      // `options`, `shopping_list` and `state`. Map them here so live rows have
      // the same shape as the demo backend instead of reaching the UI undefined.
      const rowList = (value: unknown) => (value ?? []) as Record<string, unknown>[]

      const duty: BazarDuty[] = rowList(dutyRows.data).map((row) => ({
        ...(row as unknown as BazarDuty),
        shopping_list: (row.shopping_list_json as string[] | undefined) ?? [],
      }))

      const polls: Poll[] = rowList(pollRows.data).map((row) => ({
        ...(row as unknown as Poll),
        options: (row.options_json as string[] | undefined) ?? [],
        kind: (row.kind as Poll['kind'] | undefined) ?? 'general',
        candidate_ids: (row.candidate_ids as string[] | undefined) ?? [],
        quorum: Number(row.quorum ?? 0.8),
        result_applied: Boolean(row.result_applied ?? false),
        target_user_id: (row.target_user_id as string | null | undefined) ?? null,
      }))

      const games: GameRoom[] = rowList(gameRows.data).map((row) => ({
        ...(row as unknown as GameRoom),
        state: (row.state_json as Record<string, unknown> | undefined) ?? {},
      }))

      return {
        profile,
        mess: mess as Mess,
        members,
        cycles,
        meals: (meals.data ?? []) as DailyMeal[],
        bazar: rowList(bazar.data).map((row) => ({
          ...(row as unknown as BazarExpense),
          items: (row.items_json as string[] | undefined) ?? [],
        })),
        utilities: (utilities.data ?? []) as FixedUtility[],
        deposits: (deposits.data ?? []) as MemberDeposit[],
        duty,
        polls,
        votes: (voteRows ?? []) as PollVote[],
        messages: (messageRows.data ?? []) as MessMessage[],
        games,
        requests: rowList(requestRows.data) as unknown as MemberRequest[],
        bans: rowList(banRows.data) as unknown as MessBan[],
        managerTerms: rowList(termRows.data) as unknown as ManagerTerm[],
        depositRequests: rowList(depositRequestRows.data) as unknown as DepositRequest[],
        settlements: rowList(settlementRows.data) as unknown as DuesSettlement[],
        joinRequests: rowList(joinRequestRows.data) as unknown as JoinRequest[],
        leaderboard: (
          (leaderboardRows.data ?? []) as {
            id: string
            name: string
            guild_points: number
            guild_emblem: string
            guild_banner: string
          }[]
        ).map((row) => ({
          ...row,
          is_own: row.id === messId,
        })),
      } satisfies Workspace
    },

    async createMess(name: string, currency: string) {
      const { error } = await supabase.rpc('create_mess', { p_name: name, p_currency: currency })
      if (error) throw new Error(error.message)
      context = null
    },

    async joinMess(code: string): Promise<'joined' | 'requested'> {
      const profile = await ensureProfile()
      if (!profile) throw new Error('Not signed in')

      // One mess per account for now. `loadWorkspace` picks a single active
      // membership, so joining a second one would silently hide the first — a
      // wrong number is worse than a clear refusal.
      const { data: existing, error: existingError } = await supabase
        .from('mess_members')
        .select('mess_id')
        .eq('user_id', profile.id)
        .eq('status', 'active')
        .limit(1)
      if (existingError) throw new Error(existingError.message)
      if ((existing ?? []).length > 0) {
        throw new Error(
          'This account is already in a mess. Leave it from Mess Hub → Settings before joining another — one mess per account for now.',
        )
      }

      const joinCode = code.trim().toUpperCase()

      // With 009 applied, the code only opens a request; an admin approves it.
      const request = await supabase.rpc('request_join_mess', { p_code: joinCode, p_note: '' })
      if (!request.error) {
        context = null
        const payload = request.data as { status?: string } | null
        return payload?.status === 'joined' ? 'joined' : 'requested'
      }
      if (!/function|schema cache|does not exist|could not find/i.test(request.error.message)) {
        throw new Error(request.error.message)
      }

      // A database migrated before 009 still joins straight away.
      const { error } = await supabase.rpc('join_mess', { p_code: joinCode })
      if (error) throw new Error(error.message)
      context = null
      return 'joined'
    },

    async decideJoinRequest(id: string, approve: boolean) {
      const { error } = await supabase.rpc('decide_join_request', {
        p_request: id,
        p_approve: approve,
      })
      if (error) throw new Error(error.message)
    },

    async updateProfile(patch) {
      const profile = await ensureProfile()
      if (!profile) throw new Error('Not signed in')
      const { error } = await supabase.from('profiles').update(patch).eq('id', profile.id)
      if (error) throw new Error(error.message)
    },

    async updateMess(patch) {
      const ctx = await requireContext()
      const { error } = await supabase.from('messes').update(patch).eq('id', ctx.messId)
      if (error) throw new Error(error.message)
    },

    async setMeal(input: MealInput) {
      const cycleId = await requireCycleId()
      const { data: existing } = await supabase
        .from('daily_meals')
        .select('id')
        .eq('cycle_id', cycleId)
        .eq('user_id', input.userId)
        .eq('date', input.date)
        .maybeSingle()
      const value = Math.max(0, Math.round(input.value * 2) / 2)
      if (existing) {
        const { error } = await supabase
          .from('daily_meals')
          .update({ [input.field]: value })
          .eq('id', (existing as { id: string }).id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('daily_meals').insert({
          cycle_id: cycleId,
          user_id: input.userId,
          date: input.date,
          breakfast: 0,
          lunch: 0,
          dinner: 0,
          guest_meals: 0,
          [input.field]: value,
        })
        if (error) throw new Error(error.message)
      }
    },

    async setDayMeals(rows: DayMealInput[]) {
      if (!rows.length) return
      const cycleId = await requireCycleId()
      const payload = rows.map((row) => ({
        cycle_id: cycleId,
        user_id: row.userId,
        date: row.date,
        breakfast: Math.max(0, Math.round(row.breakfast * 2) / 2),
        lunch: Math.max(0, Math.round(row.lunch * 2) / 2),
        dinner: Math.max(0, Math.round(row.dinner * 2) / 2),
        guest_meals: Math.max(0, Math.round(row.guest_meals * 2) / 2),
      }))
      // One statement for the whole day; the unique (cycle, member, date)
      // constraint decides insert vs update, and the meal-lock trigger still
      // guards each row.
      const { error } = await supabase
        .from('daily_meals')
        .upsert(payload, { onConflict: 'cycle_id,user_id,date' })
      if (error) throw new Error(error.message)
    },

    async addBazar(input: BazarInput) {
      const cycleId = await requireCycleId()
      const profile = await ensureProfile()
      if (!profile) throw new Error('Not signed in')
      const row: Row = {
        cycle_id: cycleId,
        buyer_id: profile.id,
        amount: input.amount,
        items_summary: input.items,
        expense_date: input.date,
        items_json: input.itemsList ?? [],
        proof_path: input.proofPath ?? null,
      }
      const { error } = await supabase.from('bazar_expenses').insert(row)
      if (!error) return
      // A database before 009 has no receipt or item columns; keep the expense.
      if (/column|schema cache|does not exist/i.test(error.message)) {
        const legacy = await supabase.from('bazar_expenses').insert({
          cycle_id: cycleId,
          buyer_id: profile.id,
          amount: input.amount,
          items_summary: input.items,
          expense_date: input.date,
        })
        if (!legacy.error) return
        throw new Error(legacy.error.message)
      }
      throw new Error(error.message)
    },

    async setBazarStatus(id, status) {
      const { error } = await supabase.from('bazar_expenses').update({ status }).eq('id', id)
      if (error) throw new Error(error.message)
    },

    async voidBazar(id, reason) {
      const { error } = await supabase.rpc('void_bazar_expense', { p_expense: id, p_reason: reason })
      if (error) throw new Error(error.message)
    },

    async addUtility(input: UtilityInput) {
      const cycleId = await requireCycleId()
      const { error } = await supabase.from('fixed_utilities').insert({
        cycle_id: cycleId,
        title: input.title,
        total_amount: input.amount,
        split_type: input.split,
      })
      if (error) throw new Error(error.message)
    },

    async deleteUtility(id) {
      const { error } = await supabase.from('fixed_utilities').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },

    async voidUtility(id, reason) {
      const rpc = await supabase.rpc('void_utility', { p_utility: id, p_reason: reason })
      if (!rpc.error) return
      if (!/function|schema cache|does not exist|could not find/i.test(rpc.error.message)) {
        throw new Error(rpc.error.message)
      }
      const update = await supabase
        .from('fixed_utilities')
        .update({ voided_at: new Date().toISOString(), void_reason: reason })
        .eq('id', id)
      if (!update.error) return
      // Last resort on a pre-009 database: remove the row rather than leave a
      // figure the manager cannot correct.
      const remove = await supabase.from('fixed_utilities').delete().eq('id', id)
      if (remove.error) throw new Error(remove.error.message)
    },

    async addDeposit(input: DepositInput) {
      const cycleId = await requireCycleId()
      const { error } = await supabase.from('member_deposits').insert({
        cycle_id: cycleId,
        user_id: input.userId,
        amount: input.amount,
        paid_date: input.date,
        note: input.note,
        method: input.method ?? 'cash',
        reference: input.reference ?? '',
        proof_path: input.proofPath ?? null,
      })
      if (!error) return
      // A database that has not run 002_hardening.sql yet has no payment columns;
      // record the amount anyway instead of failing the deposit.
      if (/column|schema cache|does not exist/i.test(error.message)) {
        const legacy = await supabase.from('member_deposits').insert({
          cycle_id: cycleId,
          user_id: input.userId,
          amount: input.amount,
          paid_date: input.date,
          note: input.note,
        })
        if (!legacy.error) return
        throw new Error(legacy.error.message)
      }
      throw new Error(error.message)
    },

    async uploadDepositProof(file: File) {
      const ctx = await requireContext()
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
      const path = `${ctx.messId}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage
        .from('deposit-proofs')
        .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })
      if (error) throw new Error(error.message)
      return path
    },

    async depositProofUrl(path: string) {
      const { data, error } = await supabase.storage.from('deposit-proofs').createSignedUrl(path, 3600)
      if (error) return null
      return data?.signedUrl ?? null
    },

    async voidDeposit(id, reason) {
      const { error } = await supabase.rpc('void_deposit', { p_deposit: id, p_reason: reason })
      if (error) throw new Error(error.message)
    },

    async addDuty(input: DutyInput) {
      const ctx = await requireContext()
      const { error } = await supabase.from('bazar_schedule').insert({
        mess_id: ctx.messId,
        assigned_user_id: input.userId,
        scheduled_date: input.date,
        market_route_notes: input.notes,
        shopping_list_json: input.items,
      })
      if (error) throw new Error(error.message)
    },

    async updateDuty(id, patch) {
      const payload: Row = {}
      if (patch.status) payload.status = patch.status
      if (patch.market_route_notes !== undefined) payload.market_route_notes = patch.market_route_notes
      if (patch.shopping_list !== undefined) payload.shopping_list_json = patch.shopping_list
      const { error } = await supabase.from('bazar_schedule').update(payload).eq('id', id)
      if (error) throw new Error(error.message)
    },

    async deleteDuty(id) {
      const { error } = await supabase.from('bazar_schedule').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },

    async createPoll(input: PollInput) {
      const ctx = await requireContext()
      const profile = await ensureProfile()
      if (!profile) throw new Error('Not signed in')
      const { error } = await supabase.from('polls').insert({
        mess_id: ctx.messId,
        question: input.question,
        options_json: input.options,
        closes_at: input.closesAt,
        created_by: profile.id,
      })
      if (error) throw new Error(error.message)
    },

    async deletePoll(id) {
      const { error } = await supabase.from('polls').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },

    async vote(pollId, optionIndex) {
      const profile = await ensureProfile()
      if (!profile) throw new Error('Not signed in')
      const { error } = await supabase.from('poll_votes').upsert(
        { poll_id: pollId, user_id: profile.id, option_index: optionIndex },
        { onConflict: 'poll_id,user_id' },
      )
      if (error) throw new Error(error.message)
    },

    async sendMessage(content, isAnnouncement) {
      const ctx = await requireContext()
      const profile = await ensureProfile()
      if (!profile) throw new Error('Not signed in')
      const { error } = await supabase.from('mess_messages').insert({
        mess_id: ctx.messId,
        user_id: profile.id,
        content,
        is_announcement: isAnnouncement,
      })
      if (error) throw new Error(error.message)
    },

    async createGame(type: GameType, state: Record<string, unknown>) {
      const ctx = await requireContext()
      const profile = await ensureProfile()
      if (!profile) throw new Error('Not signed in')
      const code = Math.random().toString(36).slice(2, 8).toUpperCase()
      const { data, error } = await supabase
        .from('game_rooms')
        .insert({
          mess_id: ctx.messId,
          game_type: type,
          code,
          state_json: state,
          status: 'active',
          created_by: profile.id,
        })
        .select('*')
        .single()
      const room = unwrap<Record<string, unknown>>(data, error)
      return {
        ...(room as unknown as GameRoom),
        state: (room.state_json as Record<string, unknown> | undefined) ?? {},
      }
    },

    async updateGame(id: string, patch: GamePatch) {
      const payload: Row = {}
      if (patch.state) payload.state_json = patch.state
      if (patch.status) payload.status = patch.status
      if (patch.winnerUserId !== undefined) payload.winner_user_id = patch.winnerUserId
      payload.updated_at = new Date().toISOString()
      const { error } = await supabase.from('game_rooms').update(payload).eq('id', id)
      if (error) throw new Error(error.message)
    },

    async awardGame(roomId) {
      const { error } = await supabase.rpc('award_game_win', { p_room: roomId })
      if (error) throw new Error(error.message)
    },

    async createCycle(month: string) {
      const ctx = await requireContext()
      const { error } = await supabase.from('monthly_cycles').insert({
        mess_id: ctx.messId,
        month_label: month,
        status: 'open',
      })
      if (error) throw new Error(error.message)
      await supabase.from('monthly_cycles').update({ status: 'closed' }).eq('mess_id', ctx.messId).neq('month_label', month)
      context = { ...ctx, cycleId: null }
    },

    async setCycleStatus(cycleId, status) {
      const { error } = await supabase.from('monthly_cycles').update({ status }).eq('id', cycleId)
      if (error) throw new Error(error.message)
    },

    async updateMemberRole(memberId, role) {
      const { error } = await supabase.rpc('set_member_role', { p_member: memberId, p_role: role })
      if (error) throw new Error(error.message)
    },

    async removeMember(memberId) {
      const { error } = await supabase.rpc('remove_mess_member', { p_member: memberId })
      if (error) throw new Error(error.message)
    },

    async leaveMess() {
      const { error } = await supabase.rpc('leave_mess')
      if (error) throw new Error(error.message)
      context = null
    },

    // ---- Governance ------------------------------------------------------

    async requestLeave(kind, note = '') {
      const { error } = await supabase.rpc('create_member_request', { p_kind: kind, p_note: note })
      if (error) throw new Error(error.message)
    },

    async withdrawMemberRequest(id) {
      const { error } = await supabase.rpc('withdraw_member_request', { p_request: id })
      if (error) throw new Error(error.message)
    },

    async decideMemberRequest(id, approve, note = '') {
      const { error } = await supabase.rpc('decide_member_request', {
        p_request: id,
        p_approve: approve,
        p_note: note,
      })
      if (error) throw new Error(error.message)
    },

    async leaveMessAnyway() {
      const { error } = await supabase.rpc('leave_mess_override')
      if (error) throw new Error(error.message)
      context = null
    },

    async createGovernancePoll(kind, targetUserId, candidateIds, closesAt) {
      const { error } = await supabase.rpc('create_governance_poll', {
        p_kind: kind,
        p_target: targetUserId,
        p_candidate_ids: candidateIds,
        p_closes_at: closesAt,
      })
      if (error) throw new Error(error.message)
    },

    async applyPollResult(pollId) {
      const { data, error } = await supabase.rpc('apply_poll_result', { p_poll: pollId })
      if (error) throw new Error(error.message)
      return String(data ?? '')
    },

    async requestDeposit(input: DepositRequestInput) {
      const cycleId = await requireCycleId()
      const { error } = await supabase.rpc('request_deposit', {
        p_cycle: cycleId,
        p_amount: input.amount,
        p_date: input.date,
        p_note: input.note,
        p_method: input.method ?? 'bkash',
        p_reference: input.reference ?? '',
        p_proof: input.proofPath ?? null,
      })
      if (error) throw new Error(error.message)
    },

    async decideDepositRequest(id, approve) {
      const { error } = await supabase.rpc('decide_deposit_request', { p_request: id, p_approve: approve })
      if (error) throw new Error(error.message)
    },

    async cancelDepositRequest(id) {
      const { error } = await supabase.rpc('cancel_deposit_request', { p_request: id })
      if (error) throw new Error(error.message)
    },

    async setMemberIdentity(patch) {
      const ctx = await requireContext()
      const { error } = await supabase.rpc('set_member_identity', {
        p_display_name: patch.displayName,
        p_mess: ctx.messId,
      })
      if (error) throw new Error(error.message)
      if (patch.avatarUrl !== undefined) {
        const profile = await ensureProfile()
        if (!profile) throw new Error('Not signed in')
        const { error: avatarError } = await supabase
          .from('mess_members')
          .update({ avatar_url: patch.avatarUrl })
          .eq('mess_id', ctx.messId)
          .eq('user_id', profile.id)
        if (avatarError) throw new Error(avatarError.message)
      }
    },

    async loadLedger(): Promise<LedgerRow[]> {
      const { data, error } = await supabase.rpc('my_ledger')
      if (error) throw new Error(error.message)
      return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
        mess_id: String(row.mess_id),
        mess_name: String(row.mess_name ?? 'Mess'),
        currency_symbol: String(row.currency_symbol ?? '৳'),
        cycle_id: String(row.cycle_id),
        month_label: String(row.month_label ?? ''),
        cycle_status: (row.cycle_status as LedgerRow['cycle_status']) ?? 'closed',
        member_status: (row.member_status as LedgerRow['member_status']) ?? 'left',
        meals: Number(row.meals ?? 0),
        meal_cost: Number(row.meal_cost ?? 0),
        utility_share: Number(row.utility_share ?? 0),
        payable: Number(row.payable ?? 0),
        deposits: Number(row.deposits ?? 0),
        bazar_paid: Number(row.bazar_paid ?? 0),
        settled_in: Number(row.settled_in ?? 0),
        settled_out: Number(row.settled_out ?? 0),
        outstanding: Number(row.outstanding ?? 0),
      }))
    },

    async requestSettlement(input: SettlementInput) {
      const { error } = await supabase.rpc('request_settlement', {
        p_cycle: input.cycleId,
        p_amount: input.amount,
        p_date: input.date,
        p_method: input.method ?? 'cash',
        p_reference: input.reference ?? '',
        p_proof: input.proofPath ?? null,
        p_note: input.note ?? '',
      })
      if (error) throw new Error(error.message)
    },

    async recordSettlement(input: SettlementRecordInput) {
      const { error } = await supabase.rpc('record_settlement', {
        p_cycle: input.cycleId,
        p_user: input.userId,
        p_amount: input.amount,
        p_direction: input.direction,
        p_date: input.date,
        p_method: input.method ?? 'cash',
        p_reference: input.reference ?? '',
        p_proof: input.proofPath ?? null,
        p_note: input.note ?? '',
      })
      if (error) throw new Error(error.message)
    },

    async decideSettlement(id, approve, note = '') {
      const { error } = await supabase.rpc('decide_settlement', {
        p_settlement: id,
        p_approve: approve,
        p_note: note,
      })
      if (error) throw new Error(error.message)
    },

    async cancelSettlement(id) {
      const { error } = await supabase.rpc('cancel_settlement', { p_settlement: id })
      if (error) throw new Error(error.message)
    },

    async loadCycleTotals(cycleId): Promise<CycleTotals | null> {
      const { data, error } = await supabase.rpc('cycle_totals', { p_cycle: cycleId })
      // A project that has not run 010 yet keeps using the client calculation.
      if (error) return null
      return (data ?? null) as CycleTotals | null
    },

    async isPlatformAdmin() {
      const { data, error } = await supabase.rpc('is_platform_admin')
      if (error) return false
      return Boolean(data)
    },

    async loadSupportOverview(): Promise<SupportOverview> {
      const { data, error } = await supabase.rpc('support_overview')
      if (error) return { allowed: false, messes: [], errors: [] }
      return (data ?? { allowed: false, messes: [], errors: [] }) as SupportOverview
    },

    async setMessPro(input) {
      const { error } = await supabase.rpc('admin_set_pro', {
        p_mess: input.messId,
        p_until: input.until,
        p_plan: input.plan ?? '',
        p_reference: input.reference ?? '',
      })
      if (error) throw new Error(error.message)
    },

    async savePushSubscription(subscription) {
      const ctx = await requireContext()
      const profile = await ensureProfile()
      if (!profile) throw new Error('Not signed in')
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: profile.id,
          mess_id: ctx.messId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: subscription.userAgent ?? '',
        },
        { onConflict: 'endpoint' },
      )
      if (error) throw new Error(error.message)
    },

    async removePushSubscription(endpoint) {
      const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
      if (error) throw new Error(error.message)
    },

    async loadClientErrors() {
      const ctx = await requireContext()
      const { data, error } = await supabase
        .from('client_errors')
        .select('*')
        .eq('mess_id', ctx.messId)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw new Error(error.message)
      return (data ?? []) as ClientError[]
    },

    async unlockFrame(frame) {
      const profile = await ensureProfile()
      if (!profile) throw new Error('Not signed in')
      const until = new Date(Date.now() + 24 * 3600_000).toISOString()
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_frame: frame, frame_unlocked_until: until })
        .eq('id', profile.id)
      if (error) throw new Error(error.message)
    },
  }
}
