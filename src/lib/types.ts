export type Role = 'admin' | 'manager' | 'member'
export type MemberStatus = 'active' | 'left'
export type CycleStatus = 'open' | 'closed'
export type ExpenseStatus = 'pending' | 'approved'
export type SplitType = 'equal' | 'custom'
export type DutyStatus = 'upcoming' | 'completed' | 'missed'
export type GameType = 'chess' | 'dice' | 'challenge'
export type DepositMethod = 'cash' | 'bkash' | 'nagad' | 'bank' | 'other'
export type PollKind = 'general' | 'member_removal' | 'manager_selection'
export type MemberRequestKind = 'leave' | 'delete'
export type MemberRequestStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'auto_left'
export type DepositRequestStatus = 'pending' | 'approved' | 'rejected'
export type SettlementDirection = 'member_to_mess' | 'mess_to_member'
export type SettlementStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  is_pro: boolean
  xp_points: number
  avatar_frame: string
  frame_unlocked_until: string | null
}

export interface Mess {
  id: string
  name: string
  invite_code: string
  currency_symbol: string
  guild_banner_url: string | null
  guild_banner: string
  guild_emblem: string
  guild_points: number
  is_pro_mess: boolean
  /** Manual billing: the date the current Pro period ends, when recorded. */
  pro_until?: string | null
  pro_plan?: string | null
  pro_reference?: string | null
  meal_lock_hour: number
  created_by: string
}

export interface MessMember {
  id: string
  mess_id: string
  user_id: string
  role: Role
  status: MemberStatus
  joined_at: string
  /**
   * The name this person uses in THIS mess. The profile is the account; this is
   * the identity the mess sees, so a new mess starts from a clean name instead
   * of inheriting one from a mess the person left.
   */
  display_name: string
  avatar_url: string | null
  profile: Profile
}

export interface MonthlyCycle {
  id: string
  mess_id: string
  month_label: string
  status: CycleStatus
}

export interface DailyMeal {
  id: string
  cycle_id: string
  user_id: string
  date: string
  breakfast: number
  lunch: number
  dinner: number
  guest_meals: number
}

export interface BazarExpense {
  id: string
  cycle_id: string
  buyer_id: string
  amount: number
  items_summary: string
  expense_date: string
  status: ExpenseStatus
  /** Optional itemised list behind the free-text summary. */
  items?: string[]
  /** Market receipt, stored in the same private bucket as deposit proofs. */
  proof_path?: string | null
  /** Set instead of deleting the row, so the amount never silently disappears. */
  voided_at: string | null
  voided_by: string | null
  void_reason: string
}

export interface FixedUtility {
  id: string
  cycle_id: string
  title: string
  total_amount: number
  split_type: SplitType
  /** Utilities are voided, never silently deleted: the row stays visible. */
  voided_at?: string | null
  voided_by?: string | null
  void_reason?: string
}

export interface MemberDeposit {
  id: string
  cycle_id: string
  user_id: string
  amount: number
  paid_date: string
  note: string
  method: DepositMethod
  reference: string
  proof_path: string | null
  voided_at: string | null
  voided_by: string | null
  void_reason: string
}

export interface BazarDuty {
  id: string
  mess_id: string
  assigned_user_id: string
  scheduled_date: string
  market_route_notes: string
  shopping_list: string[]
  status: DutyStatus
}

export interface Poll {
  id: string
  mess_id: string
  question: string
  options: string[]
  closes_at: string
  created_by: string
  created_at: string
  /** Ordinary polls are open; the other two carry a rule the app enforces. */
  kind: PollKind
  target_user_id: string | null
  /** User ids behind the option labels of a manager election. */
  candidate_ids: string[]
  /** Share of active members who must vote, 0.8 by default. */
  quorum: number
  result_applied: boolean
}

export interface MemberRequest {
  id: string
  mess_id: string
  user_id: string
  member_id: string
  kind: MemberRequestKind
  status: MemberRequestStatus
  note: string
  decided_by: string | null
  decided_at: string | null
  created_at: string
}

export interface MessBan {
  id: string
  mess_id: string
  user_id: string
  reason: string
  banned_by: string | null
  created_at: string
}

export interface ManagerTerm {
  id: string
  mess_id: string
  user_id: string
  starts_on: string
  ends_on: string | null
  note: string
  created_by: string | null
  created_at: string
}

export interface JoinRequest {
  id: string
  mess_id: string
  user_id: string
  note: string
  status: JoinRequestStatus
  decided_by: string | null
  decided_at: string | null
  created_at: string
  /** Joined for display by the workspace query; absent on old databases. */
  profile?: Pick<Profile, 'full_name' | 'email' | 'avatar_url'> | null
}

export interface DepositRequest {
  id: string
  cycle_id: string
  user_id: string
  amount: number
  paid_date: string
  note: string
  method: DepositMethod
  reference: string
  proof_path: string | null
  status: DepositRequestStatus
  requested_by: string | null
  decided_by: string | null
  decided_at: string | null
  created_at: string
}

export interface DuesSettlement {
  id: string
  mess_id: string
  cycle_id: string | null
  user_id: string
  amount: number
  direction: SettlementDirection
  paid_date: string
  method: DepositMethod
  reference: string
  proof_path: string | null
  note: string
  status: SettlementStatus
  requested_by: string | null
  decided_by: string | null
  decided_at: string | null
  decision_note: string
  created_at: string
}

/** One month of one mess, as the signed-in member sees it in their own ledger. */
export interface LedgerRow {
  mess_id: string
  mess_name: string
  currency_symbol: string
  cycle_id: string
  month_label: string
  cycle_status: CycleStatus
  member_status: MemberStatus
  meals: number
  meal_cost: number
  utility_share: number
  payable: number
  deposits: number
  bazar_paid: number
  settled_in: number
  settled_out: number
  /** Positive: the member still owes this mess. Negative: the mess owes them. */
  outstanding: number
}

export interface ClientError {
  id: string
  user_id: string | null
  mess_id: string | null
  message: string
  stack: string
  route: string
  user_agent: string
  app_version: string
  created_at: string
}

export interface PollVote {
  id: string
  poll_id: string
  user_id: string
  option_index: number
}

export interface MessMessage {
  id: string
  mess_id: string
  user_id: string
  content: string
  is_announcement: boolean
  created_at: string
}

export interface GameRoom {
  id: string
  mess_id: string
  game_type: GameType
  code: string
  state: Record<string, unknown>
  status: 'waiting' | 'active' | 'finished'
  winner_user_id: string | null
  points_awarded: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface LeaderboardRow {
  id: string
  name: string
  guild_points: number
  guild_emblem: string
  guild_banner: string
  is_own: boolean
}

export interface CycleTotals {
  cycle_id: string
  total_meals: number
  meal_rate: number
  total_bazar: number
  pending_bazar: number
  total_utilities: number
  total_deposits: number
  active_members: number
}

export interface SupportMess {
  id: string
  name: string
  invite_code: string
  is_pro_mess: boolean
  pro_until: string | null
  pro_plan: string | null
  pro_reference: string | null
  member_count: number
  cycle_label: string | null
  cycle_status: CycleStatus | null
  created_at: string
}

export interface SupportError {
  id: string
  message: string
  route: string
  created_at: string
  mess_name: string | null
}

export interface SupportOverview {
  allowed: boolean
  messes: SupportMess[]
  errors: SupportError[]
}

export interface Workspace {
  profile: Profile
  mess: Mess
  members: MessMember[]
  cycles: MonthlyCycle[]
  meals: DailyMeal[]
  bazar: BazarExpense[]
  utilities: FixedUtility[]
  deposits: MemberDeposit[]
  duty: BazarDuty[]
  polls: Poll[]
  votes: PollVote[]
  messages: MessMessage[]
  games: GameRoom[]
  leaderboard: LeaderboardRow[]
  requests: MemberRequest[]
  bans: MessBan[]
  managerTerms: ManagerTerm[]
  depositRequests: DepositRequest[]
  settlements: DuesSettlement[]
  joinRequests: JoinRequest[]
}

export interface LiveChange {
  table: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  row: Record<string, unknown> | null
  oldRow: Record<string, unknown> | null
}

export type MealField = 'breakfast' | 'lunch' | 'dinner' | 'guest_meals'

export interface GuildPreset {
  id: string
  label: string
  className: string
}
