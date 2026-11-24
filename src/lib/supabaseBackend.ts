import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  BazarDuty,
  BazarExpense,
  DailyMeal,
  FixedUtility,
  GameRoom,
  GameType,
  MemberDeposit,
  Mess,
  MessMember,
  MessMessage,
  MonthlyCycle,
  Poll,
  PollVote,
  Profile,
  Workspace,
} from './types'
import type { Backend, BazarInput, DepositInput, DutyInput, GamePatch, MealInput, PollInput, UtilityInput } from './backend'

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
  ]

  let liveChannel: ReturnType<typeof supabase.channel> | null = null

  function stopLive() {
    if (!liveChannel) return
    void supabase.removeChannel(liveChannel)
    liveChannel = null
  }

  function subscribe(onChange: () => void) {
    stopLive()
    const channel = supabase.channel('mess-mates-workspace')
    for (const table of liveTables) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange())
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
        bazar: (bazar.data ?? []) as BazarExpense[],
        utilities: (utilities.data ?? []) as FixedUtility[],
        deposits: (deposits.data ?? []) as MemberDeposit[],
        duty,
        polls,
        votes: (voteRows ?? []) as PollVote[],
        messages: (messageRows.data ?? []) as MessMessage[],
        games,
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

    async joinMess(code: string) {
      const { error } = await supabase.rpc('join_mess', { p_code: code.trim().toUpperCase() })
      if (error) throw new Error(error.message)
      context = null
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

    async addBazar(input: BazarInput) {
      const cycleId = await requireCycleId()
      const profile = await ensureProfile()
      if (!profile) throw new Error('Not signed in')
      const { error } = await supabase.from('bazar_expenses').insert({
        cycle_id: cycleId,
        buyer_id: profile.id,
        amount: input.amount,
        items_summary: input.items,
        expense_date: input.date,
      })
      if (error) throw new Error(error.message)
    },

    async setBazarStatus(id, status) {
      const { error } = await supabase.from('bazar_expenses').update({ status }).eq('id', id)
      if (error) throw new Error(error.message)
    },

    async deleteBazar(id) {
      const { error } = await supabase.from('bazar_expenses').delete().eq('id', id)
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

    async deleteDeposit(id) {
      const { error } = await supabase.from('member_deposits').delete().eq('id', id)
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
