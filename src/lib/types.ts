export type Role = 'admin' | 'manager' | 'member'
export type MemberStatus = 'active' | 'left'
export type CycleStatus = 'open' | 'closed'
export type ExpenseStatus = 'pending' | 'approved'
export type SplitType = 'equal' | 'custom'
export type DutyStatus = 'upcoming' | 'completed' | 'missed'
export type GameType = 'chess' | 'dice' | 'challenge'
export type DepositMethod = 'cash' | 'bkash' | 'nagad' | 'bank' | 'other'

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
}

export interface FixedUtility {
  id: string
  cycle_id: string
  title: string
  total_amount: number
  split_type: SplitType
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
}

export type MealField = 'breakfast' | 'lunch' | 'dinner' | 'guest_meals'

export interface GuildPreset {
  id: string
  label: string
  className: string
}
