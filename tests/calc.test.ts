import { describe, expect, test } from 'bun:test'
import { carriedBalances, computeSettlement, round2, settleUpPlan } from '../src/lib/calc'
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

const meal = (cycle: string, user: string, breakfast: number, lunch: number, dinner: number, guest = 0): DailyMeal => ({
  id: `meal-${cycle}-${user}-${breakfast}-${lunch}-${dinner}-${guest}`,
  cycle_id: cycle,
  user_id: user,
  date: '2026-11-01',
  breakfast,
  lunch,
  dinner,
  guest_meals: guest,
})

const bazar = (cycle: string, user: string, amount: number, status: BazarExpense['status'] = 'approved'): BazarExpense => ({
  id: `bazar-${cycle}-${user}-${amount}-${status}`,
  cycle_id: cycle,
  buyer_id: user,
  amount,
  items_summary: 'Rice, chicken, vegetables',
  expense_date: '2026-11-02',
  status,
})

const utility = (cycle: string, amount: number): FixedUtility => ({
  id: `util-${cycle}-${amount}`,
  cycle_id: cycle,
  title: 'Cook salary',
  total_amount: amount,
  split_type: 'equal',
})

const deposit = (cycle: string, user: string, amount: number): MemberDeposit => ({
  id: `dep-${cycle}-${user}-${amount}`,
  cycle_id: cycle,
  user_id: user,
  amount,
  paid_date: '2026-11-03',
  note: '',
})

function workspace(rows: {
  users?: string[]
  cycles?: MonthlyCycle[]
  meals?: DailyMeal[]
  bazar?: BazarExpense[]
  utilities?: FixedUtility[]
  deposits?: MemberDeposit[]
}): Workspace {
  const users = rows.users ?? ['abir', 'rakib']
  return {
    profile: profile('abir'),
    mess: {
      id: 'mess',
      name: 'Test Mess',
      invite_code: 'TEST01',
      currency_symbol: '৳',
      guild_banner_url: null,
      guild_banner: 'midnight',
      guild_emblem: '🏠',
      guild_points: 0,
      is_pro_mess: false,
      meal_lock_hour: 22,
      created_by: 'abir',
    },
    members: users.map(member),
    cycles: rows.cycles ?? [{ id: 'nov', mess_id: 'mess', month_label: '2026-11', status: 'open' }],
    meals: rows.meals ?? [],
    bazar: rows.bazar ?? [],
    utilities: rows.utilities ?? [],
    deposits: rows.deposits ?? [],
    duty: [],
    polls: [],
    votes: [],
    messages: [],
    games: [],
    leaderboard: [],
  }
}

describe('computeSettlement', () => {
  test('meal rate, utility share and per-member payable', () => {
    const ws = workspace({
      meals: [meal('nov', 'abir', 0, 60, 0), meal('nov', 'rakib', 0, 40, 0)],
      bazar: [bazar('nov', 'abir', 1000)],
      utilities: [utility('nov', 200)],
      deposits: [deposit('nov', 'abir', 500), deposit('nov', 'rakib', 800)],
    })
    const s = computeSettlement(ws, 'nov')
    expect(s.totalMeals).toBe(100)
    expect(s.mealRate).toBe(10)
    expect(s.utilityShare).toBe(100)
    expect(s.totalPayable).toBe(1200)
    expect(s.due).toBe(200)
    expect(s.refundable).toBe(300)

    const abir = s.members.find((m) => m.userId === 'abir')!
    expect(abir.mealCost).toBe(600)
    expect(abir.payable).toBe(700)
    expect(abir.balance).toBe(-200)

    const rakib = s.members.find((m) => m.userId === 'rakib')!
    expect(rakib.payable).toBe(500)
    expect(rakib.balance).toBe(300)
  })

  test('pending bazar is excluded until approved', () => {
    const ws = workspace({
      meals: [meal('nov', 'abir', 0, 50, 0), meal('nov', 'rakib', 0, 50, 0)],
      bazar: [bazar('nov', 'abir', 600), bazar('nov', 'rakib', 400, 'pending')],
    })
    const s = computeSettlement(ws, 'nov')
    expect(s.totalBazar).toBe(600)
    expect(s.pendingBazar).toBe(400)
    expect(s.mealRate).toBe(6)
  })

  test('guest meals count toward the mess meal total and the member bill', () => {
    const ws = workspace({
      meals: [meal('nov', 'abir', 1, 0, 0, 2), meal('nov', 'rakib', 1, 0, 0)],
      bazar: [bazar('nov', 'rakib', 400)],
    })
    const s = computeSettlement(ws, 'nov')
    expect(s.totalMeals).toBe(4)
    expect(s.mealRate).toBe(100)
    const abir = s.members.find((m) => m.userId === 'abir')!
    expect(abir.meals).toBe(3)
    expect(abir.mealCost).toBe(300)
  })

  test('no meals logged means a zero meal rate, not a division error', () => {
    const ws = workspace({ bazar: [bazar('nov', 'abir', 500)] })
    const s = computeSettlement(ws, 'nov')
    expect(s.mealRate).toBe(0)
    expect(s.totalPayable).toBe(0)
  })

  test('rounds money to two decimals', () => {
    const ws = workspace({
      meals: [meal('nov', 'abir', 3, 0, 0), meal('nov', 'rakib', 0, 0, 0)],
      bazar: [bazar('nov', 'abir', 100)],
    })
    const s = computeSettlement(ws, 'nov')
    expect(s.mealRate).toBe(33.33)
    expect(s.members.find((m) => m.userId === 'abir')!.mealCost).toBe(99.99)
    expect(round2(1.005)).toBe(1.01)
  })

  test('includes inactive members count correctly for the utility split', () => {
    const ws = workspace({ users: ['abir', 'rakib'], utilities: [utility('nov', 300)] })
    ws.members[1].status = 'left'
    const s = computeSettlement(ws, 'nov')
    expect(s.memberCount).toBe(1)
    expect(s.utilityShare).toBe(300)
  })
})

describe('settleUpPlan', () => {
  test('pays the creditor exactly what the debtor owes', () => {
    const ws = workspace({
      meals: [meal('nov', 'abir', 0, 60, 0), meal('nov', 'rakib', 0, 40, 0)],
      bazar: [bazar('nov', 'abir', 1000)],
      utilities: [utility('nov', 200)],
      deposits: [deposit('nov', 'abir', 500), deposit('nov', 'rakib', 800)],
    })
    const s = computeSettlement(ws, 'nov')
    const plan = settleUpPlan(s)

    expect(plan).toHaveLength(1)
    expect(plan[0]).toEqual({ fromUserId: 'abir', from: 'ABIR', toUserId: 'rakib', to: 'RAKIB', amount: 200 })
    expect(s.members.find((m) => m.userId === 'rakib')!.balance - 200).toBe(100)
  })

  test('a member in credit pays nobody', () => {
    const ws = workspace({
      users: ['abir', 'rakib', 'sajid'],
      meals: [meal('nov', 'abir', 0, 30, 0), meal('nov', 'rakib', 0, 30, 0), meal('nov', 'sajid', 0, 0, 0)],
      bazar: [bazar('nov', 'abir', 600)],
      deposits: [deposit('nov', 'abir', 300), deposit('nov', 'rakib', 100), deposit('nov', 'sajid', 400)],
    })
    const plan = settleUpPlan(computeSettlement(ws, 'nov'))
    const payers = new Set(plan.map((transfer) => transfer.fromUserId))
    expect(payers.has('sajid')).toBe(false)
    expect(payers.has('rakib')).toBe(true)
  })

  test('never needs more transfers than members minus one, and moves exactly the dues', () => {
    const ws = workspace({
      users: ['abir', 'rakib', 'sajid', 'tanvir'],
      meals: [
        meal('nov', 'abir', 0, 40, 0),
        meal('nov', 'rakib', 0, 30, 0),
        meal('nov', 'sajid', 0, 20, 0),
        meal('nov', 'tanvir', 0, 10, 0),
      ],
      bazar: [bazar('nov', 'abir', 900)],
      utilities: [utility('nov', 400)],
      deposits: [deposit('nov', 'rakib', 100)],
    })
    const s = computeSettlement(ws, 'nov')
    const plan = settleUpPlan(s)

    expect(plan.length).toBeLessThanOrEqual(s.members.length - 1)
    const moved = round2(plan.reduce((sum, transfer) => sum + transfer.amount, 0))
    const owed = round2(s.members.filter((m) => m.balance < 0).reduce((sum, m) => sum + -m.balance, 0))
    const credit = round2(s.members.filter((m) => m.balance > 0).reduce((sum, m) => sum + m.balance, 0))
    expect(moved).toBe(Math.min(owed, credit))
  })

  test('a settled month produces no transfers', () => {
    const ws = workspace({} )
    expect(settleUpPlan(computeSettlement(ws, 'nov'))).toEqual([])
  })

  test('ignores sub-paisa rounding noise', () => {
    const ws = workspace({
      meals: [meal('nov', 'abir', 0, 3, 0), meal('nov', 'rakib', 0, 3, 0)],
      bazar: [bazar('nov', 'abir', 100)],
    })
    const s = computeSettlement(ws, 'nov')
    s.members = s.members.map((member) => ({ ...member, balance: member.userId === 'abir' ? -0.004 : 0.004 }))
    expect(settleUpPlan(s)).toEqual([])
  })
})

describe('carry-forward of earlier months', () => {
  const cycles: MonthlyCycle[] = [
    { id: 'nov', mess_id: 'mess', month_label: '2026-11', status: 'open' },
    { id: 'oct', mess_id: 'mess', month_label: '2026-10', status: 'closed' },
    { id: 'dec', mess_id: 'mess', month_label: '2026-12', status: 'open' },
  ]

  test('an unpaid due from last month rolls into this month', () => {
    const ws = workspace({
      cycles,
      meals: [meal('oct', 'abir', 0, 100, 0)],
      bazar: [bazar('oct', 'rakib', 1000)],
      deposits: [deposit('nov', 'abir', 200)],
    })

    expect(carriedBalances(ws, 'nov').get('abir')).toBe(-1000)

    const s = computeSettlement(ws, 'nov')
    const abir = s.members.find((m) => m.userId === 'abir')!
    expect(abir.carriedBalance).toBe(-1000)
    expect(abir.payable).toBe(0)
    expect(abir.balance).toBe(-800)
    expect(s.carriedDue).toBe(1000)
    expect(s.carriedTotal).toBe(-1000)
  })

  test('an overpayment carries as advance credit', () => {
    const ws = workspace({
      cycles,
      deposits: [deposit('oct', 'rakib', 500)],
    })
    const s = computeSettlement(ws, 'nov')
    const rakib = s.members.find((m) => m.userId === 'rakib')!
    expect(rakib.carriedBalance).toBe(500)
    expect(rakib.balance).toBe(500)
    expect(s.carriedAdvance).toBe(500)
  })

  test('later cycles never affect the current month', () => {
    const ws = workspace({
      cycles,
      meals: [meal('dec', 'abir', 0, 100, 0)],
      bazar: [bazar('dec', 'rakib', 900)],
    })
    expect(carriedBalances(ws, 'nov').get('abir') ?? 0).toBe(0)
    expect(computeSettlement(ws, 'nov').carriedTotal).toBe(0)
  })

  test('carried dues compound across several earlier months', () => {
    const many: MonthlyCycle[] = [
      { id: 'nov', mess_id: 'mess', month_label: '2026-11', status: 'open' },
      { id: 'oct', mess_id: 'mess', month_label: '2026-10', status: 'closed' },
      { id: 'sep', mess_id: 'mess', month_label: '2026-09', status: 'closed' },
    ]
    const ws = workspace({
      cycles: many,
      meals: [meal('sep', 'abir', 0, 50, 0), meal('oct', 'abir', 0, 50, 0)],
      bazar: [bazar('sep', 'rakib', 500), bazar('oct', 'rakib', 500)],
    })
    const s = computeSettlement(ws, 'nov')
    expect(s.members.find((m) => m.userId === 'abir')!.carriedBalance).toBe(-1000)
  })

  test('carryForward:false shows only the selected month', () => {
    const ws = workspace({
      cycles,
      meals: [meal('oct', 'abir', 0, 100, 0)],
      bazar: [bazar('oct', 'rakib', 1000)],
      deposits: [deposit('nov', 'abir', 200)],
    })
    const s = computeSettlement(ws, 'nov', { carryForward: false })
    const abir = s.members.find((m) => m.userId === 'abir')!
    expect(abir.carriedBalance).toBe(0)
    expect(abir.balance).toBe(200)
  })
})
