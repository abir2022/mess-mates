import { describe, expect, test } from 'bun:test'
import { computeSettlement } from '../src/lib/calc'
import { closeOutReview } from '../src/lib/closeOut'
import type {
  BazarExpense,
  DailyMeal,
  FixedUtility,
  MemberDeposit,
  MessMember,
  MonthlyCycle,
  Profile,
  Workspace,
} from '../src/lib/types'

const profile = (id: string): Profile => ({
  id,
  full_name: id.toUpperCase(),
  email: `${id}@example.com`,
  avatar_url: null,
  is_pro: false,
  xp_points: 0,
  avatar_frame: 'ring',
  frame_unlocked_until: null,
})

const member = (id: string): MessMember => ({
  id: `mm-${id}`,
  mess_id: 'mess',
  user_id: id,
  role: 'member',
  status: 'active',
  joined_at: '2026-01-01T00:00:00.000Z',
  profile: profile(id),
})

const cycle: MonthlyCycle = { id: 'c1', mess_id: 'mess', month_label: '2026-11', status: 'open' }

const meal = (user: string, lunch: number): DailyMeal => ({
  id: `meal-${user}`,
  cycle_id: 'c1',
  user_id: user,
  date: '2026-11-10',
  breakfast: 0,
  lunch,
  dinner: 0,
  guest_meals: 0,
})

const approvedBazar: BazarExpense = {
  id: 'b1',
  cycle_id: 'c1',
  buyer_id: 'a',
  amount: 600,
  items_summary: 'Rice',
  expense_date: '2026-11-10',
  status: 'approved',
}

const pendingBazar: BazarExpense = {
  id: 'b2',
  cycle_id: 'c1',
  buyer_id: 'b',
  amount: 250,
  items_summary: 'Oil',
  expense_date: '2026-11-11',
  status: 'pending',
}

const utility: FixedUtility = {
  id: 'u1',
  cycle_id: 'c1',
  title: 'Cook',
  total_amount: 200,
  split_type: 'equal',
}

const deposit = (user: string, amount: number): MemberDeposit => ({
  id: `d-${user}`,
  cycle_id: 'c1',
  user_id: user,
  amount,
  paid_date: '2026-11-05',
  note: '',
  method: 'cash',
  reference: '',
  proof_path: null,
})

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  const base: Workspace = {
    profile: profile('a'),
    mess: {
      id: 'mess',
      name: 'Test Mess',
      invite_code: 'ABC123',
      currency_symbol: '৳',
      guild_banner_url: null,
      guild_banner: 'midnight',
      guild_emblem: '🏠',
      guild_points: 0,
      is_pro_mess: false,
      meal_lock_hour: 22,
      created_by: 'a',
    },
    members: [member('a'), member('b')],
    cycles: [cycle],
    meals: [meal('a', 3), meal('b', 2)],
    bazar: [approvedBazar],
    utilities: [utility],
    deposits: [deposit('a', 500), deposit('b', 500)],
    duty: [],
    polls: [],
    votes: [],
    messages: [],
    games: [],
    leaderboard: [],
  }
  return { ...base, ...overrides }
}

function review(ws: Workspace) {
  return closeOutReview(ws, cycle, computeSettlement(ws, 'c1'))
}

describe('closeOutReview', () => {
  test('a fully funded month with no pending bazar is ready', () => {
    const result = review(workspace())
    expect(result.ready).toBe(true)
    expect(result.issues.some((entry) => entry.tone === 'warn')).toBe(false)
    expect(result.transfers).toBe(0)
  })

  test('pending bazar blocks the close and reports its value', () => {
    const result = review(workspace({ bazar: [approvedBazar, pendingBazar] }))
    const issue = result.issues.find((entry) => entry.kind === 'pendingBazar')
    expect(issue).toMatchObject({ tone: 'warn', count: 1, amount: 250 })
    expect(result.ready).toBe(false)
  })

  test('a month with no meals warns about a zero meal rate', () => {
    const result = review(workspace({ meals: [] }))
    expect(result.issues.some((entry) => entry.kind === 'noMeals')).toBe(true)
    expect(result.ready).toBe(false)
  })

  test('no deposits warns even when meals exist', () => {
    const result = review(workspace({ deposits: [] }))
    expect(result.issues.some((entry) => entry.kind === 'noDeposits')).toBe(true)
    expect(result.ready).toBe(false)
  })

  test('dues and credit are reported without blocking the close', () => {
    const result = review(workspace({ deposits: [deposit('a', 500)] }))
    const dues = result.issues.find((entry) => entry.kind === 'dues')
    expect(dues).toMatchObject({ tone: 'info' })
    expect(dues?.count).toBeGreaterThan(0)
    expect(result.issues.some((entry) => entry.kind === 'credit')).toBe(true)
    // Money still owed is normal at month end — it carries forward.
    expect(result.ready).toBe(true)
    expect(result.transfers).toBeGreaterThan(0)
  })

  test('missing utilities is informational, not a blocker', () => {
    const result = review(workspace({ utilities: [] }))
    const issue = result.issues.find((entry) => entry.kind === 'noUtilities')
    expect(issue?.tone).toBe('info')
    expect(result.ready).toBe(true)
  })
})
