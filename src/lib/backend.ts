import type {
  BazarExpense,
  DepositMethod,
  DutyStatus,
  FixedUtility,
  GameRoom,
  GameType,
  MealField,
  Poll,
  Profile,
  Role,
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

export interface GamePatch {
  state?: Record<string, unknown>
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
  /**
   * Live updates: calls back when a row this user is allowed to read changes,
   * so the app can reload instead of waiting for a manual refresh. Returns the
   * unsubscribe function. Demo mode has nothing to broadcast and returns a no-op.
   */
  subscribe(onChange: () => void): () => void
  createMess(name: string, currency: string): Promise<void>
  joinMess(code: string): Promise<void>
  updateProfile(patch: Partial<Pick<Profile, 'full_name' | 'avatar_frame'>>): Promise<void>
  updateMess(patch: Partial<{ name: string; currency_symbol: string; guild_banner: string; guild_emblem: string; meal_lock_hour: number }>): Promise<void>
  /** Admin only: promote, demote or keep a mate as a plain member. */
  updateMemberRole(memberId: string, role: Role): Promise<void>
  /** Marks the membership as left; their history stays for past settlements. */
  removeMember(memberId: string): Promise<void>
  /** Removes your own active membership so you land back on create/join. */
  leaveMess(): Promise<void>
  setMeal(input: MealInput): Promise<void>
  addBazar(input: BazarInput): Promise<void>
  setBazarStatus(id: string, status: BazarExpense['status']): Promise<void>
  deleteBazar(id: string): Promise<void>
  addUtility(input: UtilityInput): Promise<void>
  deleteUtility(id: string): Promise<void>
  addDeposit(input: DepositInput): Promise<void>
  deleteDeposit(id: string): Promise<void>
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

    async addBazar(input) {
      await queued({ kind: 'addBazar', input }, () => inner.addBazar(input))
    },

    async setBazarStatus(id, status) {
      await queued({ kind: 'setBazarStatus', id, status }, () => inner.setBazarStatus(id, status))
    },

    async deleteBazar(id) {
      await queued({ kind: 'deleteBazar', id }, () => inner.deleteBazar(id))
    },

    async addUtility(input) {
      await queued({ kind: 'addUtility', input }, () => inner.addUtility(input))
    },

    async deleteUtility(id) {
      await queued({ kind: 'deleteUtility', id }, () => inner.deleteUtility(id))
    },

    async addDeposit(input) {
      await queued({ kind: 'addDeposit', input }, () => inner.addDeposit(input))
    },

    async deleteDeposit(id) {
      await queued({ kind: 'deleteDeposit', id }, () => inner.deleteDeposit(id))
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
      case 'addBazar':
        return inner.addBazar(op.input)
      case 'setBazarStatus':
        return inner.setBazarStatus(op.id, op.status)
      case 'deleteBazar':
        return inner.deleteBazar(op.id)
      case 'addUtility':
        return inner.addUtility(op.input)
      case 'deleteUtility':
        return inner.deleteUtility(op.id)
      case 'addDeposit':
        return inner.addDeposit(op.input)
      case 'deleteDeposit':
        return inner.deleteDeposit(op.id)
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
