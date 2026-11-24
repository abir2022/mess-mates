import { describe, expect, test } from 'bun:test'
import { gettingStartedState } from '../src/lib/gettingStarted'
import type { BazarExpense, DailyMeal, MessMember, MonthlyCycle, Profile, Workspace } from '../src/lib/types'

const TODAY = '2026-11-24'

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

const member = (id: string, status: MessMember['status'] = 'active'): MessMember => ({
  id: `mm-${id}`,
  mess_id: 'mess',
  user_id: id,
  role: 'member',
  status,
  joined_at: '2026-11-01T00:00:00.000Z',
  profile: profile(id),
})

const cycle: MonthlyCycle = { id: 'nov', mess_id: 'mess', month_label: '2026-11', status: 'open' }

const workspace = (rows: Partial<Workspace> = {}): Workspace => ({
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
  members: [member('abir')],
  cycles: [cycle],
  meals: [],
  bazar: [],
  utilities: [],
  deposits: [],
  duty: [],
  polls: [],
  votes: [],
  messages: [],
  games: [],
  leaderboard: [],
  ...rows,
})

const doneSteps = (rows: Partial<Workspace> = {}) =>
  gettingStartedState(workspace(rows), cycle, TODAY)
    .filter((state) => state.done)
    .map((state) => state.step)

const meal = (date: string): DailyMeal => ({
  id: `meal-${date}`,
  cycle_id: 'nov',
  user_id: 'abir',
  date,
  breakfast: 1,
  lunch: 1,
  dinner: 1,
  guest_meals: 0,
})

const bazar = (cycleId: string): BazarExpense => ({
  id: `bazar-${cycleId}`,
  cycle_id: cycleId,
  buyer_id: 'abir',
  amount: 500,
  items_summary: 'Rice',
  expense_date: TODAY,
  status: 'approved',
})

describe('gettingStartedState', () => {
  test('a brand-new mess has nothing done', () => {
    expect(doneSteps()).toEqual([])
  })

  test('a second active member completes the invite step', () => {
    expect(doneSteps({ members: [member('abir'), member('rakib')] })).toEqual(['invite'])
  })

  test('a member who left does not count as invited', () => {
    expect(doneSteps({ members: [member('abir'), member('rakib', 'left')] })).toEqual([])
  })

  test('meals only count for today', () => {
    expect(doneSteps({ meals: [meal(TODAY)] })).toEqual(['meals'])
    expect(doneSteps({ meals: [meal('2026-11-23')] })).toEqual([])
  })

  test('utilities and bazar only count for the open cycle', () => {
    expect(
      doneSteps({
        utilities: [{ id: 'u', cycle_id: 'oct', title: 'Rent', total_amount: 900, split_type: 'equal' }],
      }),
    ).toEqual([])
    expect(doneSteps({ bazar: [bazar('oct')] })).toEqual([])
    expect(
      doneSteps({
        utilities: [{ id: 'u', cycle_id: 'nov', title: 'Rent', total_amount: 900, split_type: 'equal' }],
        bazar: [bazar('nov')],
      }),
    ).toEqual(['utilities', 'bazar'])
  })

  test('a finished setup reports every step done', () => {
    expect(
      doneSteps({
        members: [member('abir'), member('rakib')],
        meals: [meal(TODAY)],
        bazar: [bazar('nov')],
        utilities: [{ id: 'u', cycle_id: 'nov', title: 'Rent', total_amount: 900, split_type: 'equal' }],
      }),
    ).toEqual(['invite', 'utilities', 'meals', 'bazar'])
  })
})
