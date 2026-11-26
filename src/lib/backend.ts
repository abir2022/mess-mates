import type {
  BazarExpense,
  ClientError,
  DepositMethod,
  DutyStatus,
  FixedUtility,
  GameRoom,
  GameType,
  LedgerRow,
  LiveChange,
  MealField,
  MemberRequestKind,
  Poll,
  CycleTotals,
  Profile,
  Role,
  SettlementDirection,
  SupportOverview,
  SplitType,
  Workspace,
} from './types'
import { createDemoBackend } from './demo'
import { createSupabaseBackend } from './supabaseBackend'
import { outbox, type OutboxOp } from './outbox'

export interface BazarInput {
  amount: number
  items: string
  date: string
  /** Optional per-item rows behind the free-text summary. */
  itemsList?: string[]
  /** Optional market receipt, stored in the private proof bucket. */
  proofPath?: string | null
}

export interface UtilityInput {
  title: string
  amount: number
  split: SplitType
}

export interface DepositInput {
  userId: string
  amount: number
  date: string
  note: string
  method?: DepositMethod
  reference?: string
  proofPath?: string | null
}

export interface DutyInput {
  userId: string
  date: string
  notes: string
  items: string[]
}

export interface PollInput {
  question: string
  options: string[]
  closesAt: string
}

export interface MealInput {
  userId: string
  date: string
  field: MealField
  value: number
}

/** A member's four meal counts for one day, saved as a single row. */
export interface DayMealInput {
  userId: string
  date: string
  breakfast: number
  lunch: number
  dinner: number
  guest_meals: number
}

/** A payment a member says they made; the manager still has to approve it. */
export interface DepositRequestInput {
  amount: number
  date: string
  note: string
  method?: DepositMethod
  reference?: string
  proofPath?: string | null
}

/** A late payment against a month, including one that has already closed. */
export interface SettlementInput {
  /** Omitted only when the member's own ledger row is not loaded yet. */
  cycleId: string
  amount: number
  date: string
  method?: DepositMethod
  reference?: string
  proofPath?: string | null
  note?: string
}

/** A manager recording money they already hold for a member. */
export interface SettlementRecordInput extends SettlementInput {
  userId: string
  direction: SettlementDirection
}

export interface GamePatch {  state?: Record<string, unknown>
  status?: GameRoom['status']
  winnerUserId?: string | null
}

export interface Backend {
  mode: 'demo' | 'supabase'
  currentUser(): Promise<Profile | null>
  signInWithGoogle(): Promise<void>
  signInWithEmail(email: string): Promise<void>
  signInDemo(): Promise<void>
  signOut(): Promise<void>
  loadWorkspace(): Promise<Workspace | null>
  /** Server-side totals for one month; null when migration 010 is not applied. */
  loadCycleTotals(cycleId: string): Promise<CycleTotals | null>
  /**
   * Live updates: calls back when a row this user is allowed to read changes,
   * so the app can reload instead of waiting for a manual refresh. Returns the
   * unsubscribe function. Demo mode has nothing to broadcast and returns a no-op.
   */
  subscribe(onChange: (change: LiveChange) => void): () => void
  createMess(name: string, currency: string): Promise<void>
  /**
   * Direct join when the database has no join-approval migration yet; a
   * request that an admin must approve otherwise.
   */
  joinMess(code: string): Promise<'joined' | 'requested'>
  /** Admin side of join approval. */
  decideJoinRequest(id: string, approve: boolean): Promise<void>
  updateProfile(patch: Partial<Pick<Profile, 'full_name' | 'avatar_frame'>>): Promise<void>
  updateMess(patch: Partial<{ name: string; currency_symbol: string; guild_banner: string; guild_emblem: string; meal_lock_hour: number }>): Promise<void>
  /** Admin only: promote, demote or keep a mate as a plain member. */
  updateMemberRole(memberId: string, role: Role): Promise<void>
  /**
   * Admin removal now needs a poll result, so this only ever refuses until the
   * mess has voted (see `createGovernancePoll` and `applyPollResult`).
   */
  removeMember(memberId: string): Promise<void>
  /** Legacy call; the request flow below replaces it. */
  leaveMess(): Promise<void>
  /** Asks the mess admin to approve leaving, or deleting the account. */
  requestLeave(kind: MemberRequestKind, note?: string): Promise<void>
  withdrawMemberRequest(id: string): Promise<void>
  decideMemberRequest(id: string, approve: boolean, note?: string): Promise<void>
  /** Leaves while the request is still unanswered; the mess keeps the records. */
  leaveMessAnyway(): Promise<void>
  /** Admin-only: opens a removal poll or a manager election. */
  createGovernancePoll(
    kind: 'member_removal' | 'manager_selection',
    targetUserId: string | null,
    candidateIds: string[],
    closesAt: string,
  ): Promise<void>
  /** Admin-only, after the poll closes with quorum: applies the outcome. */
  applyPollResult(pollId: string): Promise<string>
  /**
   * The name and photo this mess sees for the caller. The account keeps its own
   * name, so a new mess starts clean.
   */
  setMemberIdentity(patch: { displayName: string; avatarUrl?: string | null }): Promise<void>
  /** The caller's own line in every month of every mess they were ever in. */
  loadLedger(): Promise<LedgerRow[]>
  /** Member side: tell the manager a late payment was made. */
  requestSettlement(input: SettlementInput): Promise<void>
  /** Manager side: record money already received (or refunded). */
  recordSettlement(input: SettlementRecordInput): Promise<void>
  decideSettlement(id: string, approve: boolean, note?: string): Promise<void>
  cancelSettlement(id: string): Promise<void>
  /** Member side of the money flow: send a payment to the manager. */
  requestDeposit(input: DepositRequestInput): Promise<void>
  decideDepositRequest(id: string, approve: boolean): Promise<void>
  cancelDepositRequest(id: string): Promise<void>
  /** Saves a Web Push subscription for this account and mess. */
  savePushSubscription(subscription: {
    endpoint: string
    keys: { p256dh: string; auth: string }
    userAgent?: string
  }): Promise<void>
  /** Removes this device's subscription when the user turns push off. */
  removePushSubscription(endpoint: string): Promise<void>
  /** Admin-only diagnostics from the vendor-free error table. */
  loadClientErrors(): Promise<ClientError[]>
  /** Platform support: a mess-level console, separate from mess roles. */
  isPlatformAdmin(): Promise<boolean>
  loadSupportOverview(): Promise<SupportOverview>
  setMessPro(input: { messId: string; until: string | null; plan?: string; reference?: string }): Promise<void>
  setMeal(input: MealInput): Promise<void>
  /**
   * Writes a whole day at once. Used by "copy previous day" so a five-member
   * mess costs one round trip instead of twenty.
   */
  setDayMeals(rows: DayMealInput[]): Promise<void>
  addBazar(input: BazarInput): Promise<void>
  setBazarStatus(id: string, status: BazarExpense['status']): Promise<void>
  /** Money rows are never deleted; the manager voids them with a reason. */
  voidBazar(id: string, reason: string): Promise<void>
  addUtility(input: UtilityInput): Promise<void>
  /** Kept for old databases; new code voids so the row stays visible. */
  deleteUtility(id: string): Promise<void>
  /** Takes a utility out of the split without losing the record. */
  voidUtility(id: string, reason: string): Promise<void>
  addDeposit(input: DepositInput): Promise<void>
  voidDeposit(id: string, reason: string): Promise<void>
  /** Stores a receipt image and returns the path to keep on the deposit. */
  uploadDepositProof(file: File): Promise<string>
  /** Turns a stored proof path into something the browser can open right now. */
  depositProofUrl(path: string): Promise<string | null>
  addDuty(input: DutyInput): Promise<void>
  updateDuty(id: string, patch: Partial<{ status: DutyStatus; market_route_notes: string; shopping_list: string[] }>): Promise<void>
  deleteDuty(id: string): Promise<void>
  createPoll(input: PollInput): Promise<void>
  deletePoll(id: string): Promise<void>
  vote(pollId: string, optionIndex: number): Promise<void>
  sendMessage(content: string, isAnnouncement: boolean): Promise<void>
  createGame(type: GameType, state: Record<string, unknown>): Promise<GameRoom>
  updateGame(id: string, patch: GamePatch): Promise<void>
  awardGame(roomId: string): Promise<void>
  createCycle(monthLabel: string): Promise<void>
  setCycleStatus(cycleId: string, status: 'open' | 'closed'): Promise<void>
  unlockFrame(frame: string): Promise<void>
}

export const depositMethods: { id: DepositMethod; label: string }[] = [
  { id: 'cash', label: 'Cash' },
  { id: 'bkash', label: 'bKash' },
  { id: 'nagad', label: 'Nagad' },
  { id: 'bank', label: 'Bank' },
  { id: 'other', label: 'Other' },
]

export const guildBanners: { id: string; label: string; className: string }[] = [
  { id: 'midnight', label: 'Midnight Teal', className: 'from-ink-900 via-brand-800 to-brand-600' },
  { id: 'sunrise', label: 'Sunrise Flame', className: 'from-flame-600 via-flame-500 to-amber-400' },
  { id: 'stadium', label: 'Stadium Night', className: 'from-indigo-950 via-indigo-700 to-brand-500' },
  { id: 'hills', label: 'Hillside', className: 'from-emerald-900 via-brand-700 to-lime-500' },
  { id: 'royal', label: 'Royal Pro', className: 'from-purple-950 via-fuchsia-800 to-flame-500' },
]

export const guildEmblems = ['🏠', '🦅', '🐯', '⚡', '🍛', '🌙', '🐉', '🛡️', '🔥', '🍀']

export const avatarFrames: { id: string; label: string; ring: string; premium: boolean }[] = [
  { id: 'ring', label: 'Teal Ring', ring: 'ring-brand-400', premium: false },
  { id: 'gold', label: 'Gold', ring: 'ring-amber-400', premium: false },
  { id: 'neon', label: 'Neon Pulse', ring: 'ring-fuchsia-400', premium: true },
  { id: 'flame', label: 'Flame', ring: 'ring-flame-500', premium: true },
]

export function bannerClass(id: string): string {
  return guildBanners.find((banner) => banner.id === id)?.className ?? guildBanners[0].className
}

export function frameRing(id: string): string {
  return avatarFrames.find((frame) => frame.id === id)?.ring ?? 'ring-brand-300'
}

function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /failed to fetch|fetch failed|networkerror|network error|load failed|network request failed|internet disconnected|err_internet|timed? ?out|\b(502|503|504)\b/i.test(
    message,
  )
}

type QueueableWriter = () => Promise<unknown>

/**
 * Wraps the live backend so writes survive a dropped connection: when the
 * request cannot reach Supabase the change is kept in the offline outbox and
 * replayed in order once the connection is back. The last server snapshot is
 * cached so the app still opens (and shows queued changes) offline.
 */
function createOfflineBackend(inner: Backend): Backend {
  async function queued(op: OutboxOp, write: QueueableWriter): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      outbox.queue(op)
      return
    }
    try {
      await write()
    } catch (error) {
      if (!isNetworkError(error)) throw error
      outbox.queue(op)
    }
  }

  const offline: Backend = {
    ...inner,

    async currentUser() {
      try {
        return await inner.currentUser()
      } catch (error) {
        if (!isNetworkError(error)) throw error
        return outbox.cachedWorkspace()?.profile ?? null
      }
    },

    async loadWorkspace() {
      try {
        const workspace = await inner.loadWorkspace()
        if (workspace) {
          outbox.cacheWorkspace(workspace)
          return outbox.applyPending(workspace)
        }
        outbox.clearCache()
        return null
      } catch (error) {
        if (!isNetworkError(error)) throw error
        const cached = outbox.cachedWorkspace()
        if (!cached) throw error
        return outbox.applyPending(cached)
      }
    },

    async signOut() {
      if (outbox.count() > 0) await outbox.flush().catch(() => undefined)
      await inner.signOut()
      outbox.clear()
    },

    async setMeal(input) {
      await queued({ kind: 'setMeal', input }, () => inner.setMeal(input))
    },

    async setDayMeals(rows) {
      if (!rows.length) return
      await queued({ kind: 'setDayMeals', rows }, () => inner.setDayMeals(rows))
    },

    async addBazar(input) {
      await queued({ kind: 'addBazar', input }, () => inner.addBazar(input))
    },

    async setBazarStatus(id, status) {
      await queued({ kind: 'setBazarStatus', id, status }, () => inner.setBazarStatus(id, status))
    },

    async voidBazar(id, reason) {
      await queued({ kind: 'voidBazar', id, reason }, () => inner.voidBazar(id, reason))
    },

    async addUtility(input) {
      await queued({ kind: 'addUtility', input }, () => inner.addUtility(input))
    },

    async deleteUtility(id) {
      await queued({ kind: 'deleteUtility', id }, () => inner.deleteUtility(id))
    },

    async voidUtility(id, reason) {
      await queued({ kind: 'voidUtility', id, reason }, () => inner.voidUtility(id, reason))
    },

    async requestSettlement(input) {
      await queued({ kind: 'requestSettlement', input }, () => inner.requestSettlement(input))
    },

    async recordSettlement(input) {
      await queued({ kind: 'recordSettlement', input }, () => inner.recordSettlement(input))
    },

    async decideSettlement(id, approve, note) {
      await queued({ kind: 'decideSettlement', id, approve, note: note ?? '' }, () =>
        inner.decideSettlement(id, approve, note),
      )
    },

    async cancelSettlement(id) {
      await queued({ kind: 'cancelSettlement', id }, () => inner.cancelSettlement(id))
    },

    async requestDeposit(input) {
      await queued({ kind: 'requestDeposit', input }, () => inner.requestDeposit(input))
    },

    async decideDepositRequest(id, approve) {
      await queued({ kind: 'decideDepositRequest', id, approve }, () =>
        inner.decideDepositRequest(id, approve),
      )
    },

    async cancelDepositRequest(id) {
      await queued({ kind: 'cancelDepositRequest', id }, () => inner.cancelDepositRequest(id))
    },

    async addDeposit(input) {
      await queued({ kind: 'addDeposit', input }, () => inner.addDeposit(input))
    },

    async voidDeposit(id, reason) {
      await queued({ kind: 'voidDeposit', id, reason }, () => inner.voidDeposit(id, reason))
    },

    async addDuty(input) {
      await queued({ kind: 'addDuty', input }, () => inner.addDuty(input))
    },

    async updateDuty(id, patch) {
      await queued({ kind: 'updateDuty', id, patch }, () => inner.updateDuty(id, patch))
    },

    async deleteDuty(id) {
      await queued({ kind: 'deleteDuty', id }, () => inner.deleteDuty(id))
    },

    async createPoll(input) {
      await queued({ kind: 'createPoll', input }, () => inner.createPoll(input))
    },

    async deletePoll(id) {
      await queued({ kind: 'deletePoll', id }, () => inner.deletePoll(id))
    },

    async vote(pollId, optionIndex) {
      await queued({ kind: 'vote', pollId, optionIndex }, () => inner.vote(pollId, optionIndex))
    },

    async sendMessage(content, isAnnouncement) {
      await queued({ kind: 'sendMessage', content, isAnnouncement }, () =>
        inner.sendMessage(content, isAnnouncement),
      )
    },

    async updateProfile(patch) {
      await queued({ kind: 'updateProfile', patch }, () => inner.updateProfile(patch))
    },

    async updateMess(patch) {
      await queued({ kind: 'updateMess', patch }, () => inner.updateMess(patch))
    },
  }

  // Replaying always goes straight to the live backend, never back through the
  // outbox, so a still-offline flush cannot duplicate an operation.
  outbox.setReplayer(async (op) => {
    switch (op.kind) {
      case 'setMeal':
        return inner.setMeal(op.input)
      case 'setDayMeals':
        return inner.setDayMeals(op.rows)
      case 'addBazar':
        return inner.addBazar(op.input)
      case 'setBazarStatus':
        return inner.setBazarStatus(op.id, op.status)
      case 'voidBazar':
        return inner.voidBazar(op.id, op.reason)
      case 'addUtility':
        return inner.addUtility(op.input)
      case 'deleteUtility':
        return inner.deleteUtility(op.id)
      case 'voidUtility':
        return inner.voidUtility(op.id, op.reason)
      case 'requestSettlement':
        return inner.requestSettlement(op.input)
      case 'recordSettlement':
        return inner.recordSettlement(op.input)
      case 'decideSettlement':
        return inner.decideSettlement(op.id, op.approve, op.note)
      case 'cancelSettlement':
        return inner.cancelSettlement(op.id)
      case 'requestDeposit':
        return inner.requestDeposit(op.input)
      case 'decideDepositRequest':
        return inner.decideDepositRequest(op.id, op.approve)
      case 'cancelDepositRequest':
        return inner.cancelDepositRequest(op.id)
      case 'addDeposit':
        return inner.addDeposit(op.input)
      case 'voidDeposit':
        return inner.voidDeposit(op.id, op.reason)
      case 'addDuty':
        return inner.addDuty(op.input)
      case 'updateDuty':
        return inner.updateDuty(op.id, op.patch)
      case 'deleteDuty':
        return inner.deleteDuty(op.id)
      case 'createPoll':
        return inner.createPoll(op.input)
      case 'deletePoll':
        return inner.deletePoll(op.id)
      case 'vote':
        return inner.vote(op.pollId, op.optionIndex)
      case 'sendMessage':
        return inner.sendMessage(op.content, op.isAnnouncement)
      case 'updateProfile':
        return inner.updateProfile(op.patch)
      case 'updateMess':
        return inner.updateMess(op.patch)
    }
  })

  return offline
}

let instance: Backend | null = null

export function getBackend(): Backend {
  if (instance) return instance
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  instance = url && key ? createOfflineBackend(createSupabaseBackend(url, key)) : createDemoBackend()
  return instance
}

export type { FixedUtility, Poll }
