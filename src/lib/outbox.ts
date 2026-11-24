import type {
  BazarInput,
  DepositInput,
  DutyInput,
  MealInput,
  PollInput,
  UtilityInput,
} from './backend'
import type {
  BazarExpense,
  BazarDuty,
  DailyMeal,
  DutyStatus,
  FixedUtility,
  MemberDeposit,
  MessMessage,
  Poll,
  PollVote,
  Workspace,
} from './types'

/**
 * Offline outbox.
 *
 * Every write that can be safely replayed is queued in localStorage when the
 * browser is offline (or the request fails for a network reason). The queued
 * operations are applied to the last known workspace snapshot so the UI keeps
 * showing the user's changes, and are replayed in order once the connection is
 * back.
 */

export type ProfilePatch = Partial<{ full_name: string; avatar_frame: string }>

export type MessPatch = Partial<{
  name: string
  currency_symbol: string
  guild_banner: string
  guild_emblem: string
  meal_lock_hour: number
}>

export type DutyPatch = Partial<{
  status: DutyStatus
  market_route_notes: string
  shopping_list: string[]
}>

export type OutboxOp =
  | { kind: 'setMeal'; input: MealInput }
  | { kind: 'addBazar'; input: BazarInput }
  | { kind: 'setBazarStatus'; id: string; status: BazarExpense['status'] }
  | { kind: 'deleteBazar'; id: string }
  | { kind: 'addUtility'; input: UtilityInput }
  | { kind: 'deleteUtility'; id: string }
  | { kind: 'addDeposit'; input: DepositInput }
  | { kind: 'deleteDeposit'; id: string }
  | { kind: 'addDuty'; input: DutyInput }
  | { kind: 'updateDuty'; id: string; patch: DutyPatch }
  | { kind: 'deleteDuty'; id: string }
  | { kind: 'createPoll'; input: PollInput }
  | { kind: 'deletePoll'; id: string }
  | { kind: 'vote'; pollId: string; optionIndex: number }
  | { kind: 'sendMessage'; content: string; isAnnouncement: boolean }
  | { kind: 'updateProfile'; patch: ProfilePatch }
  | { kind: 'updateMess'; patch: MessPatch }

export interface OutboxEntry {
  id: string
  at: number
  attempts: number
  op: OutboxOp
}

export interface OutboxStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const QUEUE_KEY = 'mm_outbox_v1'
const CACHE_KEY = 'mm_workspace_cache_v1'
const MAX_QUEUE = 250
const MAX_ATTEMPTS = 3

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function openCycleId(ws: Workspace): string | null {
  return ws.cycles.find((cycle) => cycle.status === 'open')?.id ?? ws.cycles[0]?.id ?? null
}

function normalizeMealValue(value: number): number {
  return Math.max(0, Math.round(value * 2) / 2)
}

/**
 * A failure that only means "still offline" must not spend an attempt, or
 * three manual syncs with no connection would silently discard the change.
 */
function looksOffline(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /failed to fetch|fetch failed|networkerror|network error|load failed|network request failed|internet disconnected|err_internet/i.test(
    message,
  )
}

/** Applies one queued operation to a workspace snapshot, returning a new object. */
export function applyOp(ws: Workspace, op: OutboxOp): Workspace {
  const cycleId = openCycleId(ws)
  const now = new Date().toISOString()

  switch (op.kind) {
    case 'setMeal': {
      if (!cycleId) return ws
      const value = normalizeMealValue(op.input.value)
      const index = ws.meals.findIndex(
        (meal) =>
          meal.cycle_id === cycleId &&
          meal.user_id === op.input.userId &&
          meal.date === op.input.date,
      )
      if (index >= 0) {
        const next = [...ws.meals]
        next[index] = { ...next[index], [op.input.field]: value }
        return { ...ws, meals: next }
      }
      const meal: DailyMeal = {
        id: `local-${newId()}`,
        cycle_id: cycleId,
        user_id: op.input.userId,
        date: op.input.date,
        breakfast: 0,
        lunch: 0,
        dinner: 0,
        guest_meals: 0,
        [op.input.field]: value,
      }
      return { ...ws, meals: [...ws.meals, meal] }
    }

    case 'addBazar': {
      if (!cycleId) return ws
      const row: BazarExpense = {
        id: `local-${newId()}`,
        cycle_id: cycleId,
        buyer_id: ws.profile.id,
        amount: op.input.amount,
        items_summary: op.input.items,
        expense_date: op.input.date,
        status: 'pending',
      }
      return { ...ws, bazar: [...ws.bazar, row] }
    }

    case 'setBazarStatus':
      return {
        ...ws,
        bazar: ws.bazar.map((row) => (row.id === op.id ? { ...row, status: op.status } : row)),
      }

    case 'deleteBazar':
      return { ...ws, bazar: ws.bazar.filter((row) => row.id !== op.id) }

    case 'addUtility': {
      if (!cycleId) return ws
      const row: FixedUtility = {
        id: `local-${newId()}`,
        cycle_id: cycleId,
        title: op.input.title,
        total_amount: op.input.amount,
        split_type: op.input.split,
      }
      return { ...ws, utilities: [...ws.utilities, row] }
    }

    case 'deleteUtility':
      return { ...ws, utilities: ws.utilities.filter((row) => row.id !== op.id) }

    case 'addDeposit': {
      if (!cycleId) return ws
      const row: MemberDeposit = {
        id: `local-${newId()}`,
        cycle_id: cycleId,
        user_id: op.input.userId,
        amount: op.input.amount,
        paid_date: op.input.date,
        note: op.input.note,
        method: op.input.method ?? 'cash',
        reference: op.input.reference ?? '',
        proof_path: op.input.proofPath ?? null,
      }
      return { ...ws, deposits: [...ws.deposits, row] }
    }

    case 'deleteDeposit':
      return { ...ws, deposits: ws.deposits.filter((row) => row.id !== op.id) }

    case 'addDuty': {
      const row: BazarDuty = {
        id: `local-${newId()}`,
        mess_id: ws.mess.id,
        assigned_user_id: op.input.userId,
        scheduled_date: op.input.date,
        market_route_notes: op.input.notes,
        shopping_list: op.input.items,
        status: 'upcoming',
      }
      return { ...ws, duty: [...ws.duty, row] }
    }

    case 'updateDuty':
      return {
        ...ws,
        duty: ws.duty.map((row) =>
          row.id === op.id
            ? {
                ...row,
                ...(op.patch.status !== undefined ? { status: op.patch.status } : {}),
                ...(op.patch.market_route_notes !== undefined
                  ? { market_route_notes: op.patch.market_route_notes }
                  : {}),
                ...(op.patch.shopping_list !== undefined ? { shopping_list: op.patch.shopping_list } : {}),
              }
            : row,
        ),
      }

    case 'deleteDuty':
      return { ...ws, duty: ws.duty.filter((row) => row.id !== op.id) }

    case 'createPoll': {
      const row: Poll = {
        id: `local-${newId()}`,
        mess_id: ws.mess.id,
        question: op.input.question,
        options: op.input.options,
        closes_at: op.input.closesAt,
        created_by: ws.profile.id,
        created_at: now,
      }
      return { ...ws, polls: [row, ...ws.polls] }
    }

    case 'deletePoll':
      return {
        ...ws,
        polls: ws.polls.filter((row) => row.id !== op.id),
        votes: ws.votes.filter((vote) => vote.poll_id !== op.id),
      }

    case 'vote': {
      const index = ws.votes.findIndex(
        (vote) => vote.poll_id === op.pollId && vote.user_id === ws.profile.id,
      )
      const next: PollVote = {
        id: index >= 0 ? ws.votes[index].id : `local-${newId()}`,
        poll_id: op.pollId,
        user_id: ws.profile.id,
        option_index: op.optionIndex,
      }
      const votes = index >= 0 ? ws.votes.map((vote, i) => (i === index ? next : vote)) : [...ws.votes, next]
      return { ...ws, votes }
    }

    case 'sendMessage': {
      const message: MessMessage = {
        id: `local-${newId()}`,
        mess_id: ws.mess.id,
        user_id: ws.profile.id,
        content: op.content,
        is_announcement: op.isAnnouncement,
        created_at: now,
      }
      return { ...ws, messages: [...ws.messages, message] }
    }

    case 'updateProfile': {
      const me = { ...ws.profile, ...op.patch }
      return {
        ...ws,
        profile: me,
        members: ws.members.map((member) =>
          member.user_id === me.id ? { ...member, profile: { ...member.profile, ...op.patch } } : member,
        ),
      }
    }

    case 'updateMess':
      return { ...ws, mess: { ...ws.mess, ...op.patch } }
  }
}

export function applyPending(ws: Workspace, entries: OutboxEntry[]): Workspace {
  return entries.reduce((current, entry) => applyOp(current, entry.op), ws)
}

export type OutboxReplayer = (op: OutboxOp) => Promise<void>

export function createOutbox(storage: OutboxStorage | null) {
  const listeners = new Set<() => void>()
  let replayer: OutboxReplayer | null = null
  let flushing = false
  let lastError: string | null = null

  function notify() {
    listeners.forEach((listener) => {
      try {
        listener()
      } catch {
        // A broken subscriber must not stop the queue.
      }
    })
  }

  function readJson<T>(key: string, fallback: T): T {
    if (!storage) return fallback
    try {
      const raw = storage.getItem(key)
      if (!raw) return fallback
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  }

  function writeJson(key: string, value: unknown): boolean {
    if (!storage) return false
    try {
      storage.setItem(key, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  }

  function entries(): OutboxEntry[] {
    const parsed = readJson<unknown>(QUEUE_KEY, [])
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is OutboxEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as OutboxEntry).id === 'string' &&
        typeof (entry as OutboxEntry).op === 'object',
    )
  }

  function save(next: OutboxEntry[]) {
    writeJson(QUEUE_KEY, next)
    notify()
  }

  function queue(op: OutboxOp) {
    const next = entries()
    next.push({ id: newId(), at: Date.now(), attempts: 0, op })
    save(next.slice(-MAX_QUEUE))
  }

  function count(): number {
    return entries().length
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  function setReplayer(next: OutboxReplayer | null) {
    replayer = next
  }

  /** Caches the server snapshot (without queued changes) for offline reading. */
  function cacheWorkspace(ws: Workspace) {
    writeJson(CACHE_KEY, { at: Date.now(), ws })
  }

  function cachedWorkspace(): Workspace | null {
    const cached = readJson<{ at?: number; ws?: Workspace } | null>(CACHE_KEY, null)
    return cached && cached.ws && Array.isArray(cached.ws.cycles) ? cached.ws : null
  }

  function clear() {
    if (storage) {
      storage.removeItem(QUEUE_KEY)
      storage.removeItem(CACHE_KEY)
    }
    lastError = null
    notify()
  }

  function clearCache() {
    if (storage) storage.removeItem(CACHE_KEY)
  }

  async function flush(override?: OutboxReplayer): Promise<{ synced: number; remaining: number }> {
    const replay = override ?? replayer
    if (!replay || flushing) return { synced: 0, remaining: count() }
    flushing = true
    let synced = 0
    lastError = null
    try {
      let pending = entries()
      while (pending.length) {
        const [head, ...rest] = pending
        try {
          await replay(head.op)
          save(rest)
          pending = rest
          synced += 1
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Could not sync a queued change.'
          if (looksOffline(error)) {
            // Keep the queued change untouched until the connection is back.
            break
          }
          const attempts = head.attempts + 1
          if (attempts < MAX_ATTEMPTS) {
            save([{ ...head, attempts }, ...rest])
            break
          }
          // A change that keeps failing is dropped so it cannot block the queue
          // forever; the reason stays available to the UI.
          save(rest)
          pending = rest
        }
      }
      return { synced, remaining: count() }
    } finally {
      flushing = false
      notify()
    }
  }

  return {
    queue,
    count,
    subscribe,
    setReplayer,
    flush,
    applyPending: (ws: Workspace) => applyPending(ws, entries()),
    cacheWorkspace,
    cachedWorkspace,
    clear,
    clearCache,
    lastError: () => lastError,
    isFlushing: () => flushing,
  }
}

function defaultStorage(): OutboxStorage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

export const outbox = createOutbox(defaultStorage())
export type Outbox = ReturnType<typeof createOutbox>
