import { describe, expect, test } from 'bun:test'
import { applyPending, createOutbox, type OutboxOp, type OutboxStorage } from '../src/lib/outbox'
import type { Workspace } from '../src/lib/types'

function memoryStorage(): OutboxStorage {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
}

function workspace(): Workspace {
  return {
    profile: {
      id: 'me',
      full_name: 'Abir',
      email: 'abir@example.com',
      avatar_url: null,
      is_pro: false,
      xp_points: 0,
      avatar_frame: 'ring',
      frame_unlocked_until: null,
    },
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
      {
        id: 'mm-me',
        mess_id: 'mess',
        user_id: 'me',
        role: 'admin',
        status: 'active',
        joined_at: '2026-11-01T00:00:00.000Z',
        display_name: '',
        avatar_url: null,
        profile: {
          id: 'me',
          full_name: 'Abir',
          email: 'abir@example.com',
          avatar_url: null,
          is_pro: false,
          xp_points: 0,
          avatar_frame: 'ring',
          frame_unlocked_until: null,
        },
      },
    ],
    cycles: [{ id: 'cycle', mess_id: 'mess', month_label: '2026-11', status: 'open' }],
    meals: [],
    bazar: [],
    utilities: [
      {
        id: 'util-1',
        cycle_id: 'cycle',
        title: 'Cook',
        total_amount: 1200,
        split_type: 'equal',
      },
    ],
    deposits: [],
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
    joinRequests: [],
  }
}

describe('offline outbox', () => {
  test('queued changes are persisted and applied to the workspace', async () => {
    const box = createOutbox(memoryStorage())
    box.queue({ kind: 'setMeal', input: { userId: 'me', date: '2026-11-23', field: 'lunch', value: 1.25 } })
    box.queue({ kind: 'setMeal', input: { userId: 'me', date: '2026-11-23', field: 'dinner', value: 2 } })
    box.queue({ kind: 'addBazar', input: { amount: 540, items: 'Rice, oil', date: '2026-11-23' } })
    box.queue({
      kind: 'addDeposit',
      input: { userId: 'me', amount: 1000, date: '2026-11-23', note: 'Cash', method: 'bkash', reference: 'TXN1' },
    })
    box.queue({ kind: 'sendMessage', content: 'Bazar done', isAnnouncement: false })

    expect(box.count()).toBe(5)

    const next = box.applyPending(workspace())
    expect(next.meals[0]).toMatchObject({ user_id: 'me', lunch: 1.5, dinner: 2 })
    expect(next.bazar[0]).toMatchObject({ amount: 540, buyer_id: 'me', status: 'pending' })
    expect(next.deposits[0]).toMatchObject({ amount: 1000, method: 'bkash', reference: 'TXN1' })
    expect(next.messages[0]).toMatchObject({ content: 'Bazar done', mess_id: 'mess' })
    // The original snapshot is untouched.
    expect(workspace().meals).toHaveLength(0)
  })

  test('a fresh outbox instance reads the stored queue', () => {
    const storage = memoryStorage()
    createOutbox(storage).queue({ kind: 'voidBazar', id: 'b1', reason: 'Entered twice' })
    const reopened = createOutbox(storage)
    expect(reopened.count()).toBe(1)
    const next = reopened.applyPending({ ...workspace(), bazar: [
      {
        id: 'b1',
        cycle_id: 'cycle',
        buyer_id: 'me',
        amount: 10,
        items_summary: 'x',
        expense_date: '2026-11-01',
        status: 'approved',
        voided_at: null,
        voided_by: null,
        void_reason: '',
      },
    ] })
    // A voided entry is kept: the amount and the reason stay on the record.
    expect(next.bazar).toHaveLength(1)
    expect(next.bazar[0].void_reason).toBe('Entered twice')
    expect(next.bazar[0].voided_at).toBeTruthy()
  })

  test('flush replays in order, clears sent changes and keeps the failures', async () => {
    const box = createOutbox(memoryStorage())
    const meal: OutboxOp = { kind: 'setMeal', input: { userId: 'me', date: '2026-11-23', field: 'lunch', value: 1 } }
    const vote: OutboxOp = { kind: 'vote', pollId: 'p1', optionIndex: 2 }
    box.queue(meal)
    box.queue(vote)

    const seen: string[] = []
    const result = await box.flush(async (op) => {
      seen.push(op.kind)
      if (op.kind === 'vote') throw new Error('offline')
    })

    expect(seen).toEqual(['setMeal', 'vote'])
    expect(result).toEqual({ synced: 1, remaining: 1 })
    expect(box.count()).toBe(1)
    expect(box.lastError()).toBe('offline')
  })

  test('a change that fails repeatedly is dropped so the queue cannot stall', async () => {
    const box = createOutbox(memoryStorage())
    box.queue({ kind: 'deleteDuty', id: 'd1' })
    box.queue({ kind: 'deleteDuty', id: 'd2' })

    let calls = 0
    const failing = async (op: OutboxOp) => {
      calls += 1
      if (op.kind === 'deleteDuty' && op.id === 'd1') throw new Error('permission denied')
    }
    await box.flush(failing)
    await box.flush(failing)
    const last = await box.flush(failing)

    expect(calls).toBe(4)
    expect(last.synced).toBe(1)
    expect(box.count()).toBe(0)
  })

  test('a still-offline retry does not spend an attempt or drop the change', async () => {
    const box = createOutbox(memoryStorage())
    box.queue({ kind: 'addBazar', input: { amount: 120, items: 'Fish', date: '2026-11-23' } })

    const offline = async () => {
      throw new Error('Failed to fetch')
    }
    for (let attempt = 0; attempt < 5; attempt += 1) await box.flush(offline)

    expect(box.count()).toBe(1)
    expect(box.applyPending(workspace()).bazar[0]).toMatchObject({ amount: 120 })
  })

  test('workspace cache round-trips and clears', () => {
    const box = createOutbox(memoryStorage())
    box.cacheWorkspace(workspace())
    expect(box.cachedWorkspace()?.mess.name).toBe('Green House')
    box.clearCache()
    expect(box.cachedWorkspace()).toBeNull()
  })

  test('voided utilities and queued settlements replay offline', () => {
    const box = createOutbox(memoryStorage())
    box.queue({ kind: 'voidUtility', id: 'util-1', reason: 'Wrong bill' })
    box.queue({
      kind: 'requestSettlement',
      input: { cycleId: 'cycle', amount: 500, date: '2026-11-25', note: 'bKash' },
    })

    const next = box.applyPending(workspace())
    expect(next.utilities[0].void_reason).toBe('Wrong bill')
    expect(next.utilities[0].voided_at).toBeTruthy()
    expect(next.settlements).toHaveLength(1)
    expect(next.settlements[0].status).toBe('pending')
    expect(next.settlements[0].amount).toBe(500)
  })

  test('applyPending handles profile, mess, poll and duty changes', () => {
    const ops: OutboxOp[] = [
      { kind: 'updateProfile', patch: { full_name: 'Abir H.' } },
      { kind: 'updateMess', patch: { name: 'Blue House', meal_lock_hour: 21 } },
      { kind: 'createPoll', input: { question: 'Cricket?', options: ['Yes', 'No'], closesAt: '2026-11-30' } },
      { kind: 'addDuty', input: { userId: 'me', date: '2026-11-24', notes: 'Karwan Bazar', items: ['Rice'] } },
      { kind: 'updateDuty', id: 'local-duty', patch: { status: 'completed' } },
    ]
    const base = workspace()
    const next = applyPending(base, ops.slice(0, 4).map((op, index) => ({ id: String(index), at: 0, attempts: 0, op })))
    expect(next.profile.full_name).toBe('Abir H.')
    expect(next.mess).toMatchObject({ name: 'Blue House', meal_lock_hour: 21 })
    expect(next.polls[0].question).toBe('Cricket?')
    expect(next.duty[0]).toMatchObject({ assigned_user_id: 'me', status: 'upcoming', shopping_list: ['Rice'] })
    const done = applyPending(next, [{ id: '5', at: 0, attempts: 0, op: { kind: 'updateDuty', id: next.duty[0].id, patch: { status: 'completed' } } }])
    expect(done.duty[0].status).toBe('completed')
  })
})
