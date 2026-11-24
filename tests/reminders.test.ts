import { describe, expect, test } from 'bun:test'
import { computeSettlement } from '../src/lib/calc'
import { buildReminders, duesReminderText, outstandingDues } from '../src/lib/reminders'
import type { BazarDuty, Workspace } from '../src/lib/types'

const TODAY = '2026-11-23'

function profile(id: string, name: string) {
  return {
    id,
    full_name: name,
    email: `${id}@example.com`,
    avatar_url: null,
    is_pro: false,
    xp_points: 0,
    avatar_frame: 'ring',
    frame_unlocked_until: null,
  }
}

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    profile: profile('me', 'Abir'),
    mess: {
      id: 'mess',
      name: 'Green House',
      invite_code: 'ABC123',
      currency_symbol: '৳',
      guild_banner_url: null,
      guild_banner: 'midnight',
      guild_emblem: '🏠',
      guild_points: 0,
      is_pro_mess: false,
      meal_lock_hour: 22,
      created_by: 'me',
    },
    members: [
      { id: 'mm-me', mess_id: 'mess', user_id: 'me', role: 'admin', status: 'active', joined_at: '2026-11-01', profile: profile('me', 'Abir') },
      { id: 'mm-mate', mess_id: 'mess', user_id: 'mate', role: 'member', status: 'active', joined_at: '2026-11-01', profile: profile('mate', 'Rafi') },
    ],
    cycles: [{ id: 'cycle', mess_id: 'mess', month_label: '2026-11', status: 'open' }],
    meals: [
      { id: 'm1', cycle_id: 'cycle', user_id: 'me', date: TODAY, breakfast: 0, lunch: 1, dinner: 0, guest_meals: 0 },
      { id: 'm2', cycle_id: 'cycle', user_id: 'mate', date: TODAY, breakfast: 0, lunch: 2, dinner: 0, guest_meals: 0 },
    ],
    bazar: [
      { id: 'b1', cycle_id: 'cycle', buyer_id: 'mate', amount: 600, items_summary: 'Rice', expense_date: TODAY, status: 'approved' },
      { id: 'b2', cycle_id: 'cycle', buyer_id: 'mate', amount: 300, items_summary: 'Oil', expense_date: TODAY, status: 'pending' },
    ],
    utilities: [{ id: 'u1', cycle_id: 'cycle', title: 'Gas', total_amount: 1000, split_type: 'equal' }],
    deposits: [
      { id: 'd1', cycle_id: 'cycle', user_id: 'mate', amount: 1000, paid_date: TODAY, note: '', method: 'cash', reference: '', proof_path: null },
    ],
    duty: [],
    polls: [],
    votes: [],
    messages: [],
    games: [],
    leaderboard: [],
    ...overrides,
  }
}

function context(ws: Workspace, canManage = false) {
  return {
    ws,
    settlement: computeSettlement(ws, 'cycle'),
    userId: 'me',
    today: TODAY,
    canManage,
  }
}

function dutyRow(date: string, userId = 'me'): BazarDuty {
  return {
    id: `duty-${date}`,
    mess_id: 'mess',
    assigned_user_id: userId,
    scheduled_date: date,
    market_route_notes: 'Karwan Bazar',
    shopping_list: ['Rice', 'Oil'],
    status: 'upcoming',
  }
}

describe('reminders', () => {
  test('flags my unpaid dues and leaves settled members alone', () => {
    const ws = workspace()
    const list = buildReminders(context(ws))
    const dues = list.find((reminder) => reminder.kind === 'dues')
    expect(dues?.title).toContain('৳700.00')
    expect(dues?.href).toBe('/meals')

    const mate = buildReminders({ ...context(ws), userId: 'mate' })
    expect(mate.some((reminder) => reminder.kind === 'dues')).toBe(false)
  })

  test('only my duty today or tomorrow becomes a reminder', () => {
    const ws = workspace({ duty: [dutyRow('2026-11-24'), dutyRow('2026-11-28'), dutyRow('2026-11-23', 'mate')] })
    const list = buildReminders(context(ws))
    const duties = list.filter((reminder) => reminder.kind === 'duty')
    expect(duties).toHaveLength(1)
    expect(duties[0].title).toContain('tomorrow')
    expect(duties[0].body).toContain('2 items')
  })

  test('asks for meals only when today has none', () => {
    const logged = buildReminders(context(workspace()))
    expect(logged.some((reminder) => reminder.kind === 'meals')).toBe(false)

    const empty = buildReminders(context(workspace({ meals: [] })))
    expect(empty.some((reminder) => reminder.kind === 'meals')).toBe(true)

    const closed = buildReminders(
      context(workspace({ meals: [], cycles: [{ id: 'cycle', mess_id: 'mess', month_label: '2026-11', status: 'closed' }] })),
    )
    expect(closed.some((reminder) => reminder.kind === 'meals')).toBe(false)
  })

  test('nudges an unvoted poll that closes today or tomorrow', () => {
    const ws = workspace({
      polls: [
        { id: 'p1', mess_id: 'mess', question: 'Beef or fish?', options: ['Beef', 'Fish'], closes_at: '2026-11-24', created_by: 'mate', created_at: '2026-11-20T00:00:00.000Z' },
        { id: 'p2', mess_id: 'mess', question: 'Next week menu', options: ['A', 'B'], closes_at: '2026-12-05', created_by: 'mate', created_at: '2026-11-20T00:00:00.000Z' },
      ],
    })
    const list = buildReminders(context(ws))
    const polls = list.filter((reminder) => reminder.kind === 'poll')
    expect(polls).toHaveLength(1)
    expect(polls[0].title).toBe('Vote: Beef or fish?')

    const voted = buildReminders(
      context({ ...ws, votes: [{ id: 'v1', poll_id: 'p1', user_id: 'me', option_index: 0 }] }),
    )
    expect(voted.some((reminder) => reminder.kind === 'poll')).toBe(false)
  })

  test('approval reminders are manager-only', () => {
    const ws = workspace()
    expect(buildReminders(context(ws)).some((reminder) => reminder.kind === 'approvals')).toBe(false)
    const manager = buildReminders(context(ws, true))
    expect(manager.find((reminder) => reminder.kind === 'approvals')?.title).toContain('1 bazar entry')
  })

  test('dues reminder text lists every defaulter largest first', () => {
    const ws = workspace()
    const settlement = computeSettlement(ws, 'cycle')
    expect(outstandingDues(settlement).map((due) => due.name)).toEqual(['Abir'])
    const text = duesReminderText(ws, settlement)
    expect(text).toContain('• Abir: ৳700.00')
    expect(text).toContain('Total outstanding: ৳700.00')
    const settled = { ...settlement, members: settlement.members.map((member) => ({ ...member, balance: 0 })) }
    expect(duesReminderText(ws, settled)).toBeNull()
  })
})
