import type {
  DepositRequest,
  MemberRequest,
  ManagerTerm,
  MessBan,
  Poll,
  PollVote,
  Workspace,
} from './types'

/**
 * The mess's own rules, in one pure place.
 *
 * The database enforces the same numbers (007_governance.sql); these helpers
 * exist so the screens can say "3 of 4 votes needed" before anybody presses a
 * button, and so the rules are testable without a server.
 */

/** Share of active members who must vote for a governance poll to count. */
export const QUORUM = 0.8

export interface PollProgress {
  activeMembers: number
  votes: number
  /** Votes needed for the poll to count, rounded up. */
  required: number
  quorumMet: boolean
  counts: number[]
  leadingIndex: number | null
  leadingVotes: number
  /** Winning option's share of the votes cast, 0–1. */
  winningShare: number
}

function quorumOf(poll: Poll): number {
  const value = Number(poll.quorum)
  return Number.isFinite(value) && value > 0 && value <= 1 ? value : QUORUM
}

export function pollProgress(poll: Poll, votes: PollVote[], activeMembers: number): PollProgress {
  const cast = votes.filter((vote) => vote.poll_id === poll.id)
  const counts = poll.options.map(
    (_option, index) => cast.filter((vote) => vote.option_index === index).length,
  )
  const members = Math.max(0, Math.floor(activeMembers))
  const required = Math.max(1, Math.ceil(members * quorumOf(poll)))

  let leadingIndex: number | null = null
  for (let index = 0; index < counts.length; index += 1) {
    if (leadingIndex === null || counts[index] > counts[leadingIndex]) leadingIndex = index
  }
  // A tie is not a mandate: only a strict lead counts as a winner.
  const lead: number | null = leadingIndex
  if (lead !== null) {
    const tied = counts.filter((count) => count === counts[lead]).length > 1
    if (tied || counts[lead] === 0) leadingIndex = null
  }

  return {
    activeMembers: members,
    votes: cast.length,
    required,
    quorumMet: cast.length >= required && cast.length > 0,
    counts,
    leadingIndex,
    leadingVotes: leadingIndex === null ? 0 : counts[leadingIndex],
    winningShare: cast.length > 0 && leadingIndex !== null ? counts[leadingIndex] / cast.length : 0,
  }
}

export type RemovalVerdict = 'waiting' | 'remove_and_ban' | 'remove_can_rejoin'

/**
 * What the vote decided. Before the poll closes, or before 80% have voted,
 * nothing is decided — the admin has no removal to apply yet.
 */
export function removalVerdict(
  poll: Poll,
  votes: PollVote[],
  activeMembers: number,
  now: Date = new Date(),
): RemovalVerdict {
  if (poll.kind !== 'member_removal') return 'waiting'
  const progress = pollProgress(poll, votes, activeMembers)
  if (!progress.quorumMet) return 'waiting'
  if (new Date(poll.closes_at).getTime() > now.getTime()) return 'waiting'
  const forRemoval = progress.counts[0] ?? 0
  const against = progress.counts[1] ?? 0
  // A tie leaves the member in place: removal needs a clear majority.
  if (forRemoval === against) return 'waiting'
  return forRemoval > against ? 'remove_and_ban' : 'remove_can_rejoin'
}

/** The elected manager's user id, or null while the poll is not decided. */
export function managerWinner(
  poll: Poll,
  votes: PollVote[],
  activeMembers: number,
  now: Date = new Date(),
): string | null {
  if (poll.kind !== 'manager_selection') return null
  if (new Date(poll.closes_at).getTime() > now.getTime()) return null
  const progress = pollProgress(poll, votes, activeMembers)
  if (!progress.quorumMet || progress.leadingIndex === null) return null
  return poll.candidate_ids[progress.leadingIndex] ?? null
}

export function openRequestFor(requests: MemberRequest[], userId: string): MemberRequest | null {
  return (
    requests.find((request) => request.user_id === userId && request.status === 'pending') ?? null
  )
}

export function pendingRequests(requests: MemberRequest[]): MemberRequest[] {
  return requests
    .filter((request) => request.status === 'pending')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
}

/** The manager whose term still covers today, newest term first. */
export function currentManagerTerm(terms: ManagerTerm[], today: string): ManagerTerm | null {
  return (
    [...terms]
      .filter((term) => term.starts_on <= today && (!term.ends_on || term.ends_on >= today))
      .sort((a, b) => b.starts_on.localeCompare(a.starts_on))[0] ?? null
  )
}

export function openGovernancePolls(polls: Poll[], kind: Poll['kind']): Poll[] {
  return polls
    .filter((poll) => poll.kind === kind && !poll.result_applied)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function isBanned(bans: MessBan[], userId: string): boolean {
  return bans.some((ban) => ban.user_id === userId)
}

export function pendingDepositRequests(requests: DepositRequest[], cycleId: string): DepositRequest[] {
  return requests
    .filter((request) => request.cycle_id === cycleId && request.status === 'pending')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export function myDepositRequests(requests: DepositRequest[], cycleId: string, userId: string): DepositRequest[] {
  return requests
    .filter((request) => request.cycle_id === cycleId && request.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

/**
 * Whether this member may still walk away on their own. A member with a leave
 * request waiting may use the override; someone with an account-deletion
 * request has to wait for the admin, because the data must be cleared first.
 */
export function canLeaveWithoutWaiting(request: MemberRequest | null): boolean {
  return Boolean(request && request.kind === 'leave' && request.status === 'pending')
}

/** A quick summary of a member's footprint, used for the leave-statement export. */
export function memberFootprint(ws: Workspace, userId: string) {
  return {
    meals: ws.meals.filter((meal) => meal.user_id === userId).length,
    bazar: ws.bazar.filter((expense) => expense.buyer_id === userId).length,
    deposits: ws.deposits.filter((deposit) => deposit.user_id === userId).length,
  }
}
