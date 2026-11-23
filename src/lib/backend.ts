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
  SplitType,
  Workspace,
} from './types'
import { createDemoBackend } from './demo'
import { createSupabaseBackend } from './supabaseBackend'

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
  createMess(name: string, currency: string): Promise<void>
  joinMess(code: string): Promise<void>
  updateProfile(patch: Partial<Pick<Profile, 'full_name' | 'avatar_frame'>>): Promise<void>
  updateMess(patch: Partial<{ name: string; currency_symbol: string; guild_banner: string; guild_emblem: string; meal_lock_hour: number }>): Promise<void>
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
  upgradePro(): Promise<void>
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

let instance: Backend | null = null

export function getBackend(): Backend {
  if (instance) return instance
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  instance = url && key ? createSupabaseBackend(url, key) : createDemoBackend()
  return instance
}

export type { FixedUtility, Poll }
