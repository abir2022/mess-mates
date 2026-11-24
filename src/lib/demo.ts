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
  Role,
  Workspace,
} from './types'
import type { Backend, BazarInput, DepositInput, DutyInput, GamePatch, MealInput, PollInput, UtilityInput } from './backend'
import { monthLabelFor, todayISO } from './format'

const STORAGE_KEY = 'messmates.demo.v1'
const DEMO_MONTH = monthLabelFor(new Date())

interface DemoState {
  signedIn: boolean
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
  leaderboard: { id: string; name: string; guild_points: number; guild_emblem: string; guild_banner: string }[]
}

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`

function isoAt(month: string, day: number): string {
  return `${month}-${String(day).padStart(2, '0')}`
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString()
}

function daysFromToday(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const BASE_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

interface PersonSeed {
  id: string
  name: string
  email: string
  role: Role
  frame: string
  isPro: boolean
  xp: number
  breakfast: number
  lunch: number
  dinner: number
}

const people: PersonSeed[] = [
  { id: 'u-abir', name: 'Abir Hossain', email: 'abir@messmates.app', role: 'admin', frame: 'ring', isPro: false, xp: 340, breakfast: 1, lunch: 1, dinner: 1 },
  { id: 'u-rakib', name: 'Rakib Hasan', email: 'rakib@messmates.app', role: 'manager', frame: 'gold', isPro: false, xp: 260, breakfast: 0.5, lunch: 1, dinner: 1 },
  { id: 'u-tanvir', name: 'Tanvir Ahmed', email: 'tanvir@messmates.app', role: 'member', frame: 'neon', isPro: false, xp: 180, breakfast: 1, lunch: 1, dinner: 1 },
  { id: 'u-sajid', name: 'Sajid Karim', email: 'sajid@messmates.app', role: 'member', frame: 'ring', isPro: false, xp: 120, breakfast: 0.5, lunch: 1, dinner: 1 },
  { id: 'u-nayeem', name: 'Nayeem Chowdhury', email: 'nayeem@messmates.app', role: 'member', frame: 'flame', isPro: false, xp: 90, breakfast: 1, lunch: 1, dinner: 1 },
]

function seedMonth(
  month: string,
  cycleId: string,
  dayCount: number,
  bazarSpec: { day: number; buyer: string; amount: number; items: string; status?: 'approved' | 'pending' }[],
  utilitySpec: { title: string; amount: number }[],
  depositSpec: { user: string; amount: number }[],
): { meals: DailyMeal[]; bazar: BazarExpense[]; utilities: FixedUtility[]; deposits: MemberDeposit[] } {
  const meals: DailyMeal[] = []
  for (let day = 1; day <= dayCount; day += 1) {
    const date = isoAt(month, day)
    const weekday = new Date(`${date}T12:00:00`).getDay()
    people.forEach((person) => {
      const skipDinner = weekday === 5 && person.id === 'u-tanvir' ? 0 : person.dinner
      meals.push({
        id: `meal-${cycleId}-${person.id}-${day}`,
        cycle_id: cycleId,
        user_id: person.id,
        date,
        breakfast: person.breakfast,
        lunch: person.lunch,
        dinner: skipDinner,
        guest_meals: weekday === 5 && person.id === 'u-abir' ? 2 : 0,
      })
    })
  }

  const bazar: BazarExpense[] = bazarSpec.map((entry) => ({
    id: `bazar-${cycleId}-${entry.day}-${entry.buyer}`,
    cycle_id: cycleId,
    buyer_id: entry.buyer,
    amount: entry.amount,
    items_summary: entry.items,
    expense_date: isoAt(month, entry.day),
    status: entry.status ?? 'approved',
  }))

  const utilities: FixedUtility[] = utilitySpec.map((entry) => ({
    id: `util-${cycleId}-${entry.title}`,
    cycle_id: cycleId,
    title: entry.title,
    total_amount: entry.amount,
    split_type: 'equal',
  }))

  const deposits: MemberDeposit[] = depositSpec.map((entry) => ({
    id: `dep-${cycleId}-${entry.user}`,
    cycle_id: cycleId,
    user_id: entry.user,
    amount: entry.amount,
    paid_date: isoAt(month, Math.min(5, dayCount)),
    note: 'Monthly deposit',
    method: 'bkash',
    reference: '',
    proof_path: null,
  }))

  return { meals, bazar, utilities, deposits }
}

function seedState(): DemoState {
  const currentCycleId = `cycle-${DEMO_MONTH}`
  const previousDate = new Date()
  previousDate.setMonth(previousDate.getMonth() - 1)
  const previousMonth = monthLabelFor(previousDate)
  const previousCycleId = `cycle-${previousMonth}`
  const dayCount = new Date().getDate()

  const current = seedMonth(
    DEMO_MONTH,
    currentCycleId,
    dayCount,
    [
      { day: 1, buyer: 'u-rakib', amount: 1650, items: 'Rice 10kg, soybean oil 2L' },
      { day: 2, buyer: 'u-abir', amount: 720, items: 'Vegetables, eggs, milk' },
      { day: 4, buyer: 'u-tanvir', amount: 2380, items: 'Chicken 4kg, spices' },
      { day: 6, buyer: 'u-sajid', amount: 1980, items: 'Fish, potatoes, onions' },
      { day: 8, buyer: 'u-nayeem', amount: 1420, items: 'Beef 2kg, ginger, garlic' },
      { day: 10, buyer: 'u-abir', amount: 860, items: 'Tea, sugar, biscuits, cleaning' },
      { day: 12, buyer: 'u-rakib', amount: 1540, items: 'Rice 8kg, dal 2kg, salt' },
      { day: 14, buyer: 'u-tanvir', amount: 2240, items: 'Chicken, vegetables, eggs' },
      { day: 16, buyer: 'u-sajid', amount: 1290, items: 'Fish, oil, spices' },
      { day: 18, buyer: 'u-nayeem', amount: 1760, items: 'Beef, onions, potatoes' },
      { day: 20, buyer: 'u-abir', amount: 1660, items: 'Groceries, gas cylinder refill' },
      { day: Math.max(dayCount - 1, 21), buyer: 'u-sajid', amount: 640, items: 'Milk, bread, tea', status: 'pending' },
    ],
    [
      { title: 'Cook / Maid', amount: 6000 },
      { title: 'Electricity', amount: 2400 },
      { title: 'Gas', amount: 1500 },
      { title: 'Wi-Fi', amount: 1200 },
    ],
    [
      { user: 'u-abir', amount: 6000 },
      { user: 'u-rakib', amount: 5500 },
      { user: 'u-tanvir', amount: 5000 },
      { user: 'u-sajid', amount: 4500 },
      { user: 'u-nayeem', amount: 4000 },
    ],
  )

  const previous = seedMonth(
    previousMonth,
    previousCycleId,
    28,
    [
      { day: 2, buyer: 'u-rakib', amount: 1700, items: 'Rice, oil, dal' },
      { day: 5, buyer: 'u-abir', amount: 1450, items: 'Chicken, vegetables' },
      { day: 9, buyer: 'u-tanvir', amount: 2150, items: 'Fish, beef, spices' },
      { day: 13, buyer: 'u-sajid', amount: 1600, items: 'Groceries, eggs, milk' },
      { day: 18, buyer: 'u-nayeem', amount: 1250, items: 'Vegetables, oil' },
      { day: 23, buyer: 'u-abir', amount: 1900, items: 'Rice 10kg, gas refill' },
    ],
    [
      { title: 'Cook / Maid', amount: 6000 },
      { title: 'Electricity', amount: 2650 },
      { title: 'Gas', amount: 1500 },
      { title: 'Wi-Fi', amount: 1200 },
    ],
    [
      { user: 'u-abir', amount: 6000 },
      { user: 'u-rakib', amount: 6000 },
      { user: 'u-tanvir', amount: 5500 },
      { user: 'u-sajid', amount: 5000 },
      { user: 'u-nayeem', amount: 4500 },
    ],
  )

  const profiles = people.map<Profile>((person) => ({
    id: person.id,
    full_name: person.name,
    email: person.email,
    avatar_url: null,
    is_pro: person.isPro,
    xp_points: person.xp,
    avatar_frame: person.frame,
    frame_unlocked_until: null,
  }))

  const members: MessMember[] = people.map((person, index) => ({
    id: `member-${person.id}`,
    mess_id: 'mess-chittagong',
    user_id: person.id,
    role: person.role,
    status: 'active',
    joined_at: new Date(Date.now() - (90 - index * 5) * 86400_000).toISOString(),
    profile: profiles[index],
  }))

  const games: GameRoom[] = [
    {
      id: 'game-welcome',
      mess_id: 'mess-chittagong',
      game_type: 'chess',
      code: 'CHS7QK',
      state: { fen: BASE_FEN, history: [], lastMove: null, orientation: 'white' },
      status: 'active',
      winner_user_id: null,
      points_awarded: false,
      created_by: 'u-rakib',
      created_at: hoursAgo(26),
      updated_at: hoursAgo(26),
    },
  ]

  return {
    signedIn: false,
    profile: profiles[0],
    mess: {
      id: 'mess-chittagong',
      name: 'Chittagong Boys Mess',
      invite_code: 'MM7K2Q',
      currency_symbol: '৳',
      guild_banner_url: null,
      guild_banner: 'midnight',
      guild_emblem: '🦅',
      guild_points: 1840,
      is_pro_mess: false,
      meal_lock_hour: 22,
      created_by: 'u-abir',
    },
    members,
    cycles: [
      { id: currentCycleId, mess_id: 'mess-chittagong', month_label: DEMO_MONTH, status: 'open' },
      { id: previousCycleId, mess_id: 'mess-chittagong', month_label: previousMonth, status: 'closed' },
    ],
    meals: [...current.meals, ...previous.meals],
    bazar: [...current.bazar, ...previous.bazar],
    utilities: [...current.utilities, ...previous.utilities],
    deposits: [...current.deposits, ...previous.deposits],
    duty: [
      {
        id: 'duty-1',
        mess_id: 'mess-chittagong',
        assigned_user_id: 'u-nayeem',
        scheduled_date: daysFromToday(-1),
        market_route_notes: 'Karwan Bazar — vegetables wing',
        shopping_list: ['Vegetables', 'Onions', 'Eggs'],
        status: 'completed',
      },
      {
        id: 'duty-2',
        mess_id: 'mess-chittagong',
        assigned_user_id: 'u-rakib',
        scheduled_date: todayISO(),
        market_route_notes: 'New Market — enter from Gate 2, ask for Rahim Bhai',
        shopping_list: ['Rice 10kg', 'Chicken 3kg', 'Cooking oil 2L', 'Vegetables'],
        status: 'upcoming',
      },
      {
        id: 'duty-3',
        mess_id: 'mess-chittagong',
        assigned_user_id: 'u-abir',
        scheduled_date: daysFromToday(1),
        market_route_notes: 'Karwan Bazar — start 8:30 AM, fish section first',
        shopping_list: ['Rice 10kg', 'Chicken 3kg', 'Vegetables', 'Eggs 2 dozen', 'Cooking oil 2L'],
        status: 'upcoming',
      },
      {
        id: 'duty-4',
        mess_id: 'mess-chittagong',
        assigned_user_id: 'u-tanvir',
        scheduled_date: daysFromToday(3),
        market_route_notes: 'Shantinagar Bazar — weekly spices run',
        shopping_list: ['Spices', 'Dal 2kg', 'Salt', 'Tea'],
        status: 'upcoming',
      },
    ],
    polls: [
      {
        id: 'poll-1',
        mess_id: 'mess-chittagong',
        question: 'Friday Special Menu: Beef vs. Chicken Biryani?',
        options: ['Beef Tehari', 'Chicken Biryani', 'Kacchi Biryani'],
        closes_at: new Date(Date.now() + 2 * 86400_000).toISOString(),
        created_by: 'u-rakib',
        created_at: hoursAgo(20),
      },
      {
        id: 'poll-2',
        mess_id: 'mess-chittagong',
        question: 'Approve Cook Salary Hike (৳6,000 → ৳6,800)?',
        options: ['Approve', 'Reject', 'Discuss at meeting'],
        closes_at: new Date(Date.now() + 3 * 86400_000).toISOString(),
        created_by: 'u-abir',
        created_at: hoursAgo(6),
      },
    ],
    votes: [
      { id: 'vote-1', poll_id: 'poll-1', user_id: 'u-abir', option_index: 0 },
      { id: 'vote-2', poll_id: 'poll-1', user_id: 'u-rakib', option_index: 0 },
      { id: 'vote-3', poll_id: 'poll-1', user_id: 'u-tanvir', option_index: 1 },
      { id: 'vote-4', poll_id: 'poll-1', user_id: 'u-sajid', option_index: 2 },
      { id: 'vote-5', poll_id: 'poll-1', user_id: 'u-nayeem', option_index: 1 },
      { id: 'vote-6', poll_id: 'poll-2', user_id: 'u-rakib', option_index: 0 },
      { id: 'vote-7', poll_id: 'poll-2', user_id: 'u-tanvir', option_index: 0 },
      { id: 'vote-8', poll_id: 'poll-2', user_id: 'u-sajid', option_index: 2 },
    ],
    messages: [
      {
        id: 'msg-1',
        mess_id: 'mess-chittagong',
        user_id: 'u-rakib',
        content: 'Water supply maintenance this Saturday 10 AM–1 PM. Please store water on Friday night.',
        is_announcement: true,
        created_at: hoursAgo(2),
      },
      {
        id: 'msg-2',
        mess_id: 'mess-chittagong',
        user_id: 'u-abir',
        content: 'Bazar duty list for tomorrow is up — check the roster tab. 🛒',
        is_announcement: false,
        created_at: hoursAgo(3),
      },
      {
        id: 'msg-3',
        mess_id: 'mess-chittagong',
        user_id: 'u-nayeem',
        content: 'Dinner tonight at 9:30, cook is making khichuri 🍲',
        is_announcement: false,
        created_at: hoursAgo(5),
      },
      {
        id: 'msg-4',
        mess_id: 'mess-chittagong',
        user_id: 'u-sajid',
        content: "I'll bring eggs from New Market in the morning.",
        is_announcement: false,
        created_at: hoursAgo(7),
      },
      {
        id: 'msg-5',
        mess_id: 'mess-chittagong',
        user_id: 'u-tanvir',
        content: 'Who finished the last of the milk? 😤',
        is_announcement: false,
        created_at: hoursAgo(9),
      },
      {
        id: 'msg-6',
        mess_id: 'mess-chittagong',
        user_id: 'u-abir',
        content: 'November cycle closes on the 30th. Please clear your dues before settlement.',
        is_announcement: true,
        created_at: hoursAgo(26),
      },
    ],
    games,
    leaderboard: [
      { id: 'mess-greenview', name: 'Green View Boys', guild_points: 2140, guild_emblem: '🌿', guild_banner: 'hills' },
      { id: 'mess-chittagong', name: 'Chittagong Boys Mess', guild_points: 1840, guild_emblem: '🦅', guild_banner: 'midnight' },
      { id: 'mess-mirpur', name: 'Mirpur Warriors', guild_points: 1675, guild_emblem: '⚡', guild_banner: 'stadium' },
      { id: 'mess-sylhet', name: 'Sylhet Spice House', guild_points: 1420, guild_emblem: '🍛', guild_banner: 'sunrise' },
      { id: 'mess-dhaka', name: 'Dhaka Dreamers', guild_points: 1195, guild_emblem: '🌙', guild_banner: 'royal' },
      { id: 'mess-uttara', name: 'Uttara United', guild_points: 980, guild_emblem: '🛡️', guild_banner: 'midnight' },
    ],
  }
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState
      if (parsed?.mess?.id && parsed.profile?.id) return parsed
    }
  } catch {
    /* ignore corrupt demo state */
  }
  const seeded = seedState()
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
  } catch {
    /* storage may be unavailable */
  }
  return seeded
}

export function createDemoBackend(): Backend {
  const state = load()

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }

  const activeCycle = (): MonthlyCycle =>
    state.cycles.find((cycle) => cycle.status === 'open') ?? state.cycles[state.cycles.length - 1]

  const myRole = (): Role => state.members.find((member) => member.user_id === state.profile.id)?.role ?? 'member'
  const isManager = () => ['admin', 'manager'].includes(myRole())

  const syncLeaderboardRow = () => {
    const row = state.leaderboard.find((entry) => entry.id === state.mess.id)
    if (row) {
      row.name = state.mess.name
      row.guild_points = state.mess.guild_points
      row.guild_emblem = state.mess.guild_emblem
      row.guild_banner = state.mess.guild_banner
    } else {
      state.leaderboard.push({
        id: state.mess.id,
        name: state.mess.name,
        guild_points: state.mess.guild_points,
        guild_emblem: state.mess.guild_emblem,
        guild_banner: state.mess.guild_banner,
      })
    }
    state.leaderboard.sort((a, b) => b.guild_points - a.guild_points)
  }

  const buildWorkspace = (): Workspace => ({
    profile: state.profile,
    mess: state.mess,
    members: state.members,
    cycles: state.cycles,
    meals: state.meals,
    bazar: state.bazar,
    utilities: state.utilities,
    deposits: state.deposits,
    duty: state.duty,
    polls: state.polls,
    votes: state.votes,
    messages: state.messages,
    games: state.games,
    leaderboard: state.leaderboard.map((row) => ({ ...row, is_own: row.id === state.mess.id })),
  })

  const resetIfNeeded = () => {
    if (!state.members.some((member) => member.user_id === state.profile.id)) {
      state.members.push({
        id: uid('member'),
        mess_id: state.mess.id,
        user_id: state.profile.id,
        role: 'admin',
        status: 'active',
        joined_at: new Date().toISOString(),
        profile: state.profile,
      })
    }
  }

  return {
    mode: 'demo',

    async currentUser() {
      return state.signedIn ? state.profile : null
    },

    async signInWithGoogle() {
      state.signedIn = true
      persist()
    },

    async signInWithEmail() {
      state.signedIn = true
      persist()
    },

    async signInDemo() {
      state.signedIn = true
      persist()
    },

    async signOut() {
      state.signedIn = false
      persist()
    },

    // The demo workspace lives in one browser and has no server to broadcast
    // from, so there is nothing to subscribe to.
    subscribe() {
      return () => undefined
    },

    async loadWorkspace() {
      if (!state.signedIn) return null
      resetIfNeeded()
      const mine = state.members.find(
        (member) => member.user_id === state.profile.id && member.status === 'active',
      )
      if (!mine) return null
      return buildWorkspace()
    },

    async createMess(name, currency) {
      const now = new Date()
      const cycleId = uid('cycle')
      state.mess = {
        id: uid('mess'),
        name,
        invite_code: Math.random().toString(36).slice(2, 8).toUpperCase(),
        currency_symbol: currency,
        guild_banner_url: null,
        guild_banner: 'midnight',
        guild_emblem: '🏠',
        guild_points: 0,
        is_pro_mess: false,
        meal_lock_hour: 22,
        created_by: state.profile.id,
      }
      state.members = [
        {
          id: uid('member'),
          mess_id: state.mess.id,
          user_id: state.profile.id,
          role: 'admin',
          status: 'active',
          joined_at: now.toISOString(),
          profile: { ...state.profile, is_pro: state.profile.is_pro },
        },
      ]
      state.cycles = [{ id: cycleId, mess_id: state.mess.id, month_label: monthLabelFor(now), status: 'open' }]
      state.meals = []
      state.bazar = []
      state.utilities = []
      state.deposits = []
      state.duty = []
      state.polls = []
      state.votes = []
      state.messages = []
      state.games = []
      syncLeaderboardRow()
      persist()
    },

    async joinMess(code) {
      if (code.trim().toUpperCase() !== state.mess.invite_code) {
        throw new Error('Invalid invite code. Ask your mess admin for the 6-character code.')
      }
      const mine = state.members.find((member) => member.user_id === state.profile.id)
      if (mine) {
        mine.status = 'active'
      } else {
        state.members.push({
          id: uid('member'),
          mess_id: state.mess.id,
          user_id: state.profile.id,
          role: 'member',
          status: 'active',
          joined_at: new Date().toISOString(),
          profile: state.profile,
        })
      }
      persist()
    },

    async updateProfile(patch) {
      state.profile = { ...state.profile, ...patch }
      const member = state.members.find((entry) => entry.user_id === state.profile.id)
      if (member) member.profile = state.profile
      persist()
    },

    async updateMess(patch) {
      state.mess = { ...state.mess, ...patch }
      syncLeaderboardRow()
      persist()
    },

    async setMeal(input: MealInput) {
      const cycle = activeCycle()
      const existing = state.meals.find(
        (meal) => meal.cycle_id === cycle.id && meal.user_id === input.userId && meal.date === input.date,
      )
      const value = Math.max(0, Math.round(input.value * 2) / 2)
      if (existing) {
        existing[input.field] = value
      } else {
        state.meals.push({
          id: uid('meal'),
          cycle_id: cycle.id,
          user_id: input.userId,
          date: input.date,
          breakfast: 0,
          lunch: 0,
          dinner: 0,
          guest_meals: 0,
          [input.field]: value,
        })
      }
      persist()
    },

    async addBazar(input: BazarInput) {
      const cycle = activeCycle()
      state.bazar.push({
        id: uid('bazar'),
        cycle_id: cycle.id,
        buyer_id: state.profile.id,
        amount: input.amount,
        items_summary: input.items,
        expense_date: input.date,
        status: isManager() ? 'approved' : 'pending',
      })
      persist()
    },

    async setBazarStatus(id, status) {
      const entry = state.bazar.find((item) => item.id === id)
      if (entry) entry.status = status
      persist()
    },

    async deleteBazar(id) {
      state.bazar = state.bazar.filter((item) => item.id !== id)
      persist()
    },

    async addUtility(input: UtilityInput) {
      state.utilities.push({
        id: uid('util'),
        cycle_id: activeCycle().id,
        title: input.title,
        total_amount: input.amount,
        split_type: input.split,
      })
      persist()
    },

    async deleteUtility(id) {
      state.utilities = state.utilities.filter((item) => item.id !== id)
      persist()
    },

    async addDeposit(input: DepositInput) {
      state.deposits.push({
        id: uid('dep'),
        cycle_id: activeCycle().id,
        user_id: input.userId,
        amount: input.amount,
        paid_date: input.date,
        note: input.note,
        method: input.method ?? 'cash',
        reference: input.reference ?? '',
        proof_path: input.proofPath ?? null,
      })
      persist()
    },

    async uploadDepositProof(file: File) {
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('Could not read that receipt file.'))
        reader.readAsDataURL(file)
      })
    },

    async depositProofUrl(path: string) {
      return path
    },

    async deleteDeposit(id) {
      state.deposits = state.deposits.filter((item) => item.id !== id)
      persist()
    },

    async addDuty(input: DutyInput) {
      state.duty.push({
        id: uid('duty'),
        mess_id: state.mess.id,
        assigned_user_id: input.userId,
        scheduled_date: input.date,
        market_route_notes: input.notes,
        shopping_list: input.items,
        status: 'upcoming',
      })
      persist()
    },

    async updateDuty(id, patch) {
      const entry = state.duty.find((item) => item.id === id)
      if (entry) Object.assign(entry, patch)
      persist()
    },

    async deleteDuty(id) {
      state.duty = state.duty.filter((item) => item.id !== id)
      persist()
    },

    async createPoll(input: PollInput) {
      state.polls.push({
        id: uid('poll'),
        mess_id: state.mess.id,
        question: input.question,
        options: input.options,
        closes_at: input.closesAt,
        created_by: state.profile.id,
        created_at: new Date().toISOString(),
      })
      persist()
    },

    async deletePoll(id) {
      state.polls = state.polls.filter((poll) => poll.id !== id)
      state.votes = state.votes.filter((vote) => vote.poll_id !== id)
      persist()
    },

    async vote(pollId, optionIndex) {
      const existing = state.votes.find((v) => v.poll_id === pollId && v.user_id === state.profile.id)
      if (existing) {
        existing.option_index = optionIndex
      } else {
        state.votes.push({ id: uid('vote'), poll_id: pollId, user_id: state.profile.id, option_index: optionIndex })
      }
      persist()
    },

    async sendMessage(content, isAnnouncement) {
      state.messages.push({
        id: uid('msg'),
        mess_id: state.mess.id,
        user_id: state.profile.id,
        content,
        is_announcement: isAnnouncement,
        created_at: new Date().toISOString(),
      })
      state.messages.sort((a, b) => a.created_at.localeCompare(b.created_at))
      if (state.messages.length > 100) {
        state.messages = state.messages.slice(state.messages.length - 100)
      }
      persist()
    },

    async createGame(type: GameType, gameState) {
      const room: GameRoom = {
        id: uid('game'),
        mess_id: state.mess.id,
        game_type: type,
        code: Math.random().toString(36).slice(2, 8).toUpperCase(),
        state: gameState,
        status: 'active',
        winner_user_id: null,
        points_awarded: false,
        created_by: state.profile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      state.games.unshift(room)
      persist()
      return room
    },

    async updateGame(id: string, patch: GamePatch) {
      const room = state.games.find((game) => game.id === id)
      if (!room) return
      if (patch.state) room.state = patch.state
      if (patch.status) room.status = patch.status
      if (patch.winnerUserId !== undefined) room.winner_user_id = patch.winnerUserId
      room.updated_at = new Date().toISOString()
      persist()
    },

    async awardGame(roomId) {
      const room = state.games.find((game) => game.id === roomId)
      if (!room || room.points_awarded) return
      room.points_awarded = true
      state.mess.guild_points += 25
      state.profile.xp_points += 10
      const member = state.members.find((entry) => entry.user_id === state.profile.id)
      if (member) member.profile = state.profile
      syncLeaderboardRow()
      persist()
    },

    async createCycle(month: string) {
      if (state.cycles.some((cycle) => cycle.month_label === month)) return
      state.cycles.unshift({ id: uid('cycle'), mess_id: state.mess.id, month_label: month, status: 'open' })
      state.cycles.forEach((cycle) => {
        if (cycle.month_label !== month) cycle.status = 'closed'
      })
      persist()
    },

    async setCycleStatus(cycleId, status) {
      const cycle = state.cycles.find((entry) => entry.id === cycleId)
      if (cycle) cycle.status = status
      persist()
    },

    async updateMemberRole(memberId: string, role: Role) {
      if (myRole() !== 'admin') throw new Error('Only an admin can change roles.')
      const target = state.members.find((member) => member.id === memberId)
      if (!target) throw new Error('That member is no longer in the mess.')
      const admins = state.members.filter((member) => member.status === 'active' && member.role === 'admin')
      if (target.role === 'admin' && role !== 'admin' && admins.length <= 1) {
        throw new Error('Keep at least one admin in the mess.')
      }
      target.role = role
      persist()
    },

    async removeMember(memberId: string) {
      const mine = myRole()
      if (!['admin', 'manager'].includes(mine)) {
        throw new Error('Only an admin or manager can remove a member.')
      }
      const target = state.members.find((member) => member.id === memberId)
      if (!target) throw new Error('That member is no longer in the mess.')
      if (target.user_id === state.profile.id) {
        throw new Error('Use "Leave this mess" to remove yourself.')
      }
      if (target.role === 'admin' && mine !== 'admin') {
        throw new Error('Only an admin can remove another admin.')
      }
      const admins = state.members.filter((member) => member.status === 'active' && member.role === 'admin')
      if (target.role === 'admin' && admins.length <= 1) {
        throw new Error('Keep at least one admin in the mess.')
      }
      target.status = 'left'
      persist()
    },

    async leaveMess() {
      const mine = state.members.find(
        (member) => member.user_id === state.profile.id && member.status === 'active',
      )
      if (!mine) return
      const admins = state.members.filter((member) => member.status === 'active' && member.role === 'admin')
      if (mine.role === 'admin' && admins.length <= 1) {
        throw new Error('Make another member an admin before you leave.')
      }
      mine.status = 'left'
      persist()
    },

    async upgradePro() {
      state.mess.is_pro_mess = true
      state.profile.is_pro = true
      const member = state.members.find((entry) => entry.user_id === state.profile.id)
      if (member) member.profile = state.profile
      persist()
    },

    async unlockFrame(frame) {
      state.profile.avatar_frame = frame
      state.profile.frame_unlocked_until = new Date(Date.now() + 24 * 3600_000).toISOString()
      const member = state.members.find((entry) => entry.user_id === state.profile.id)
      if (member) member.profile = state.profile
      persist()
    },
  }
}

export function resetDemoData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}


