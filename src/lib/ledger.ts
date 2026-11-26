import type { DuesSettlement, LedgerRow, MessMember } from './types'

/**
 * Identity and money rules for the "one account, many messes" policy.
 *
 * Everything here is pure: the mess's name for a person, what a ledger row
 * really means, and which settlements still count. The UI and the tests share
 * these, so a new mess can never accidentally show an old mess's nickname.
 */

type MemberLike = Pick<MessMember, 'display_name' | 'avatar_url' | 'profile'> | null | undefined

/** The name this mess uses. Falls back to the account name for older rows. */
export function memberName(member: MemberLike): string {
  const perMess = member?.display_name?.trim()
  if (perMess) return perMess
  return member?.profile?.full_name?.trim() || 'Member'
}

/** The photo this mess uses, again falling back to the account's. */
export function memberAvatar(member: MemberLike): string | null {
  return member?.avatar_url ?? member?.profile?.avatar_url ?? null
}

export function isVoided(row: { voided_at: string | null }): boolean {
  return Boolean(row?.voided_at)
}

/**
 * What is still open on a month after every approved settlement.
 * Positive means the member owes the mess; negative means the mess owes them.
 */
export function outstandingOf(row: {
  payable: number
  deposits: number
  settled_in?: number
  settled_out?: number
}): number {
  const value =
    Number(row.payable) - Number(row.deposits) - Number(row.settled_in ?? 0) + Number(row.settled_out ?? 0)
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** The member's overall position across every mess they have ever been in. */
export function ledgerTotals(rows: LedgerRow[]): { owe: number; credit: number; net: number } {
  let owe = 0
  let credit = 0
  for (const row of rows) {
    // Use the row's own figure: the server already applied every settlement,
    // and a row arrives complete from `my_ledger()`.
    const value = Number(row.outstanding)
    if (value > 0.005) owe += value
    else if (value < -0.005) credit += Math.abs(value)
  }
  const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
  return { owe: round(owe), credit: round(credit), net: round(owe - credit) }
}

/** A settlement only moves money once the mess side has approved it. */
export function countsTowardsBalance(settlement: DuesSettlement): boolean {
  return settlement.status === 'approved'
}

/** Pending settlements the manager has to act on. */
export function pendingSettlements(settlements: DuesSettlement[]): DuesSettlement[] {
  return settlements.filter((row) => row.status === 'pending')
}

/** Settlements for one month, newest first. */
export function settlementsFor(settlements: DuesSettlement[], cycleId: string | null): DuesSettlement[] {
  return settlements
    .filter((row) => row.cycle_id === cycleId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

/** The pending request a member already has for that month, if any. */
export function openSettlementFor(
  settlements: DuesSettlement[],
  cycleId: string | null,
  userId: string,
): DuesSettlement | undefined {
  return settlements.find(
    (row) => row.cycle_id === cycleId && row.user_id === userId && row.status === 'pending',
  )
}

/**
 * A closed month keeps its figures, so the only thing left to settle is what
 * the ledger says is still open. This is a hint for the form, not a rule the
 * database trusts: the server still accepts any amount above zero.
 */
export function suggestedSettlement(row: LedgerRow | undefined): number {
  if (!row) return 0
  return Math.max(0, Math.round((row.outstanding + Number.EPSILON) * 100) / 100)
}
