import { describe, expect, test } from 'bun:test'
import { computeSettlement } from '../src/lib/calc'
import {
  isVoided,
  ledgerTotals,
  memberAvatar,
  memberName,
  openSettlementFor,
  outstandingOf,
  pendingSettlements,
  suggestedSettlement,
} from '../src/lib/ledger'
import type { DuesSettlement, LedgerRow, MessMember, Workspace } from '../src/lib/types'

function member(overrides: Partial<MessMember> = {}): MessMember {
  return {
    id: 'member-1',
    mess_id: 'mess-1',
    user_id: 'u-1',
    role: 'member',
    status: 'active',
    joined_at: '2026-01-01T00:00:00.000Z',
    display_name: '',
    avatar_url: null,
    profile: {
      id: 'u-1',
      full_name: 'Abir Hossain',
      email: 'abir@example.com',
      avatar_url: 'avatar.png',
      is_pro: false,
      xp_points: 0,
      avatar_frame: 'ring',
      frame_unlocked_until: null,
    },
    ...overrides,
  }
}

function row(overrides: Partial<LedgerRow> = {}): LedgerRow {
  return {
    mess_id: 'mess-1',
    mess_name: 'Chittagong Boys',
    currency_symbol: '৳',
    cycle_id: 'cycle-1',
    month_label: '2026-11',
    cycle_status: 'closed',
    member_status: 'left',
    meals: 30,
    meal_cost: 3000,
    utility_share: 500,
    payable: 3500,
    deposits: 3000,
    bazar_paid: 0,
    settled_in: 0,
    settled_out: 0,
    outstanding: 500,
    ...overrides,
  }
}

function settlement(overrides: Partial<DuesSettlement> = {}): DuesSettlement {
  return {
    id: 's-1',
    mess_id: 'mess-1',
    cycle_id: 'cycle-1',
    user_id: 'u-1',
    amount: 500,
    direction: 'member_to_mess',
    paid_date: '2026-11-20',
    method: 'bkash',
    reference: '',
    proof_path: null,
    note: '',
    status: 'pending',
    requested_by: 'u-1',
    decided_by: null,
    decided_at: null,
    decision_note: '',
    created_at: '2026-11-20T10:00:00.000Z',
    ...overrides,
  }
}

describe('per-mess identity', () => {
  test('uses the name set in this mess before the account name', () => {
    expect(memberName(member({ display_name: 'Abir Bhai' }))).toBe('Abir Bhai')
  })

  test('falls back to the account name, then to a neutral label', () => {
    expect(memberName(member())).toBe('Abir Hossain')
    expect(memberName(member({ profile: { ...member().profile, full_name: '  ' } }))).toBe('Member')
    expect(memberName(undefined)).toBe('Member')
  })

  test('the mess photo falls back to the account photo', () => {
    expect(memberAvatar(member({ avatar_url: 'mess.png' }))).toBe('mess.png')
    expect(memberAvatar(member())).toBe('avatar.png')
    expect(memberAvatar(undefined)).toBeNull()
  })
})

describe('ledger money', () => {
  test('outstanding is what is still owed after every settlement', () => {
    expect(outstandingOf({ payable: 3500, deposits: 3000 })).toBe(500)
    expect(outstandingOf({ payable: 3500, deposits: 3000, settled_in: 500 })).toBe(0)
    expect(outstandingOf({ payable: 3500, deposits: 3000, settled_in: 200 })).toBe(300)
    expect(outstandingOf({ payable: 3500, deposits: 3000, settled_out: 200 })).toBe(700)
  })

  test('a refund flips a credit into a due, never both', () => {
    const totals = ledgerTotals([
      row({ outstanding: 500 }),
      row({ cycle_id: 'cycle-2', outstanding: -200 }),
    ])
    expect(totals.owe).toBe(500)
    expect(totals.credit).toBe(200)
    expect(totals.net).toBe(300)
  })

  test('a voided row never counts as money', () => {
    expect(isVoided({ voided_at: null })).toBe(false)
    expect(isVoided({ voided_at: '2026-11-20T00:00:00.000Z' })).toBe(true)
  })

  test('the settle form suggests only what is still open', () => {
    expect(suggestedSettlement(row())).toBe(500)
    expect(suggestedSettlement(row({ outstanding: -100 }))).toBe(0)
    expect(suggestedSettlement(undefined)).toBe(0)
  })
})

describe('settlement requests', () => {
  test('only pending settlements need a decision', () => {
    const pending = settlement()
    const approved = settlement({ id: 's-2', status: 'approved' })
    expect(pendingSettlements([pending, approved]).map((entry) => entry.id)).toEqual(['s-1'])
  })

  test('one open request per member per month', () => {
    const rows = [settlement(), settlement({ id: 's-2', status: 'approved' })]
    expect(openSettlementFor(rows, 'cycle-1', 'u-1')?.id).toBe('s-1')
    expect(openSettlementFor(rows, 'cycle-2', 'u-1')).toBeUndefined()
    expect(openSettlementFor(rows, 'cycle-1', 'u-2')).toBeUndefined()
  })
})

describe('voided money is invisible to the month', () => {
  const base: Workspace = {
    profile: member().profile,
    mess: {
      id: 'mess-1',
      name: 'Chittagong Boys',
      invite_code: 'MM7K2Q',
      currency_symbol: '৳',
      guild_banner_url: null,
      guild_banner: 'midnight',
      guild_emblem: '🦅',
      guild_points: 0,
      is_pro_mess: false,
      meal_lock_hour: 22,
      created_by: 'u-1',
    },
    members: [member(), member({ id: 'member-2', user_id: 'u-2', display_name: 'Rakib' })],
    cycles: [{ id: 'cycle-1', mess_id: 'mess-1', month_label: '2026-11', status: 'closed' }],
    meals: [
      {
        id: 'meal-1',
        cycle_id: 'cycle-1',
        user_id: 'u-1',
        date: '2026-11-01',
        breakfast: 1,
        lunch: 1,
        dinner: 1,
        guest_meals: 0,
      },
    ],
    bazar: [
      {
        id: 'bazar-1',
        cycle_id: 'cycle-1',
        buyer_id: 'u-1',
        amount: 600,
        items_summary: 'Rice',
        expense_date: '2026-11-01',
        status: 'approved',
        voided_at: null,
        voided_by: null,
        void_reason: '',
      },
      {
        id: 'bazar-2',
        cycle_id: 'cycle-1',
        buyer_id: 'u-1',
        amount: 9999,
        items_summary: 'Typo',
        expense_date: '2026-11-02',
        status: 'approved',
        voided_at: '2026-11-03T00:00:00.000Z',
        voided_by: 'u-2',
        void_reason: 'Entered twice',
      },
    ],
    utilities: [],
    deposits: [
      {
        id: 'dep-1',
        cycle_id: 'cycle-1',
        user_id: 'u-1',
        amount: 300,
        paid_date: '2026-11-01',
        note: '',
        method: 'cash',
        reference: '',
        proof_path: null,
        voided_at: null,
        voided_by: null,
        void_reason: '',
      },
      {
        id: 'dep-2',
        cycle_id: 'cycle-1',
        user_id: 'u-1',
        amount: 5000,
        paid_date: '2026-11-02',
        note: '',
        method: 'bkash',
        reference: '',
        proof_path: null,
        voided_at: '2026-11-03T00:00:00.000Z',
        voided_by: 'u-2',
        void_reason: 'Wrong member',
      },
    ],
    duty: [],
    polls: [],
    votes: [],
    messages: [],
    games: [],
    leaderboard: [],
    requests: [],
    bans: [],
    managerTerms: [],
    depositRequests: [],
    settlements: [],
  }

  test('a voided bazar entry and a voided deposit leave the meal rate alone', () => {
    const figures = computeSettlement(base, 'cycle-1', { carryForward: false })
    expect(figures.totalBazar).toBe(600)
    expect(figures.totalDeposits).toBe(300)
    expect(figures.mealRate).toBe(200)
    const me = figures.members.find((entry) => entry.userId === 'u-1')
    expect(me?.payable).toBe(600)
    expect(me?.balance).toBe(-300)
  })

  test('the statement shows the name this mess uses', () => {
    const figures = computeSettlement(base, 'cycle-1', { carryForward: false })
    expect(figures.members.find((entry) => entry.userId === 'u-2')?.name).toBe('Rakib')
  })
})
