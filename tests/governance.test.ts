import { describe, expect, test } from 'bun:test'
import {
  QUORUM,
  canLeaveWithoutWaiting,
  currentManagerTerm,
  isBanned,
  managerWinner,
  openRequestFor,
  pendingRequests,
  pollProgress,
  removalVerdict,
} from '../src/lib/governance'
import type { ManagerTerm, MemberRequest, Poll, PollVote } from '../src/lib/types'

const poll = (overrides: Partial<Poll> = {}): Poll => ({
  id: 'p1',
  mess_id: 'mess',
  question: 'Remove Rakib?',
  options: ['Remove from mess', 'Keep in mess'],
  closes_at: '2026-11-20T00:00:00.000Z',
  created_by: 'admin',
  created_at: '2026-11-18T00:00:00.000Z',
  kind: 'member_removal',
  target_user_id: 'rakib',
  candidate_ids: [],
  quorum: QUORUM,
  result_applied: false,
  ...overrides,
})

const vote = (user: string, option: number, pollId = 'p1'): PollVote => ({
  id: `v-${user}`,
  poll_id: pollId,
  user_id: user,
  option_index: option,
})

const request = (overrides: Partial<MemberRequest> = {}): MemberRequest => ({
  id: 'r1',
  mess_id: 'mess',
  user_id: 'rakib',
  member_id: 'm1',
  kind: 'leave',
  status: 'pending',
  note: '',
  decided_by: null,
  decided_at: null,
  created_at: '2026-11-18T00:00:00.000Z',
  ...overrides,
})

const afterClose = new Date('2026-11-21T00:00:00.000Z')
const beforeClose = new Date('2026-11-19T00:00:00.000Z')

describe('pollProgress', () => {
  test('quorum is 80% of active members, rounded up', () => {
    const progress = pollProgress(poll(), [], 5)
    expect(progress.required).toBe(4)
    expect(progress.quorumMet).toBe(false)
  })

  test('one short of quorum is not enough', () => {
    const votes = [vote('a', 0), vote('b', 0), vote('c', 1)]
    const progress = pollProgress(poll(), votes, 5)
    expect(progress.votes).toBe(3)
    expect(progress.required).toBe(4)
    expect(progress.quorumMet).toBe(false)
  })

  test('quorum met with four of five members', () => {
    const votes = [vote('a', 0), vote('b', 0), vote('c', 1), vote('d', 1)]
    const progress = pollProgress(poll(), votes, 5)
    expect(progress.quorumMet).toBe(true)
    expect(progress.leadingIndex).toBeNull() // 2–2 tie
    expect(progress.counts).toEqual([2, 2])
  })

  test('a smaller mess of two needs both votes', () => {
    expect(pollProgress(poll(), [vote('a', 0)], 2).required).toBe(2)
  })

  test('only votes for this poll are counted', () => {
    const votes = [vote('a', 0), vote('b', 1, 'other-poll')]
    const progress = pollProgress(poll(), votes, 2)
    expect(progress.votes).toBe(1)
    expect(progress.quorumMet).toBe(false)
  })
})

describe('removalVerdict', () => {
  const majorityFor = [vote('a', 0), vote('b', 0), vote('c', 0), vote('d', 1)]
  const majorityAgainst = [vote('a', 1), vote('b', 1), vote('c', 1), vote('d', 0)]

  test('nothing is decided while the poll is open', () => {
    expect(removalVerdict(poll(), majorityFor, 5, beforeClose)).toBe('waiting')
  })

  test('nothing is decided below 80% turnout', () => {
    const votes = [vote('a', 0), vote('b', 0), vote('c', 0)]
    expect(removalVerdict(poll(), votes, 5, afterClose)).toBe('waiting')
  })

  test('a majority for removal bans the member from rejoining', () => {
    expect(removalVerdict(poll(), majorityFor, 5, afterClose)).toBe('remove_and_ban')
  })

  test('a majority against removal still lets the admin remove, without a ban', () => {
    expect(removalVerdict(poll(), majorityAgainst, 5, afterClose)).toBe('remove_can_rejoin')
  })

  test('a tie does not remove anyone', () => {
    const tie = [vote('a', 0), vote('b', 0), vote('c', 1), vote('d', 1)]
    expect(removalVerdict(poll(), tie, 4, afterClose)).toBe('waiting')
  })

  test('ordinary polls have no removal verdict', () => {
    expect(removalVerdict(poll({ kind: 'general' }), majorityFor, 5, afterClose)).toBe('waiting')
  })
})

describe('managerWinner', () => {
  const election = poll({
    id: 'p2',
    kind: 'manager_selection',
    target_user_id: null,
    options: ['Abir', 'Rakib', 'Nabil'],
    candidate_ids: ['abir', 'rakib', 'nabil'],
    question: 'Who should be the mess manager?',
  })
  const votes = [
    vote('x', 1, 'p2'),
    vote('y', 1, 'p2'),
    vote('z', 0, 'p2'),
    vote('w', 2, 'p2'),
  ]

  test('the candidate with the most votes wins once closed and quorate', () => {
    expect(managerWinner(election, votes, 5, afterClose)).toBe('rakib')
  })

  test('no winner before the poll closes', () => {
    expect(managerWinner(election, votes, 5, beforeClose)).toBeNull()
  })

  test('no winner below quorum', () => {
    expect(managerWinner(election, votes.slice(0, 2), 5, afterClose)).toBeNull()
  })

  test('a tie elects nobody', () => {
    const tie = [vote('x', 1, 'p2'), vote('y', 1, 'p2'), vote('z', 0, 'p2'), vote('w', 0, 'p2')]
    expect(managerWinner(election, tie, 4, afterClose)).toBeNull()
  })
})

describe('requests and terms', () => {
  test('the open request for a member is the pending one', () => {
    const requests = [request({ id: 'old', status: 'approved' }), request({ id: 'new' })]
    expect(openRequestFor(requests, 'rakib')?.id).toBe('new')
    expect(pendingRequests(requests).map((entry) => entry.id)).toEqual(['new'])
  })

  test('a leave request may be left without waiting, a delete request may not', () => {
    expect(canLeaveWithoutWaiting(request())).toBe(true)
    expect(canLeaveWithoutWaiting(request({ kind: 'delete' }))).toBe(false)
    expect(canLeaveWithoutWaiting(null)).toBe(false)
  })

  test('the current manager term is the newest one still covering today', () => {
    const terms: ManagerTerm[] = [
      {
        id: 't1',
        mess_id: 'mess',
        user_id: 'old',
        starts_on: '2026-09-01',
        ends_on: '2026-09-30',
        note: '',
        created_by: null,
        created_at: '2026-09-01T00:00:00.000Z',
      },
      {
        id: 't2',
        mess_id: 'mess',
        user_id: 'rakib',
        starts_on: '2026-11-01',
        ends_on: null,
        note: 'Elected',
        created_by: null,
        created_at: '2026-11-01T00:00:00.000Z',
      },
    ]
    expect(currentManagerTerm(terms, '2026-11-24')?.user_id).toBe('rakib')
    expect(currentManagerTerm(terms, '2026-10-05')).toBeNull()
  })

  test('a ban blocks rejoining', () => {
    expect(
      isBanned(
        [
          {
            id: 'b1',
            mess_id: 'mess',
            user_id: 'sajid',
            reason: 'vote',
            banned_by: null,
            created_at: '2026-11-01T00:00:00.000Z',
          },
        ],
        'sajid',
      ),
    ).toBe(true)
    expect(isBanned([], 'sajid')).toBe(false)
  })
})
