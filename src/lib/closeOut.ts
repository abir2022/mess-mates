import type { Settlement } from './calc'
import { settleUpPlan } from './calc'
import type { MonthlyCycle, Workspace } from './types'

/**
 * Month close-out review.
 *
 * Closing a cycle is final: the database blocks every meal, bazar, utility and
 * deposit write afterwards. This is the cheap pre-flight that tells a manager
 * what they are about to lock — pending bazar that would be excluded, a month
 * with no meals or deposits, and the dues that will carry forward. It is a pure
 * derivation so it can be tested without a browser.
 */

export type CloseOutIssueKind =
  | 'pendingBazar'
  | 'noMeals'
  | 'noUtilities'
  | 'noDeposits'
  | 'dues'
  | 'credit'

export interface CloseOutIssue {
  kind: CloseOutIssueKind
  tone: 'warn' | 'info'
  count?: number
  amount?: number
}

export interface CloseOutReview {
  cycle: MonthlyCycle
  settlement: Settlement
  issues: CloseOutIssue[]
  /** False when at least one warning could still change this month's numbers. */
  ready: boolean
  /** Number of payments the settle-up plan needs before this month is clear. */
  transfers: number
}

export function closeOutReview(
  ws: Workspace,
  cycle: MonthlyCycle,
  settlement: Settlement,
): CloseOutReview {
  const issues: CloseOutIssue[] = []
  const pending = ws.bazar.filter(
    (expense) => expense.cycle_id === cycle.id && expense.status === 'pending',
  )

  if (pending.length > 0) {
    issues.push({
      kind: 'pendingBazar',
      tone: 'warn',
      count: pending.length,
      amount: settlement.pendingBazar,
    })
  }

  if (settlement.totalMeals <= 0) issues.push({ kind: 'noMeals', tone: 'warn' })
  if (settlement.totalUtilities <= 0) issues.push({ kind: 'noUtilities', tone: 'info' })
  if (settlement.totalDeposits <= 0) issues.push({ kind: 'noDeposits', tone: 'warn' })

  const debtors = settlement.members.filter((member) => member.balance < -0.5)
  if (debtors.length > 0) {
    issues.push({ kind: 'dues', tone: 'info', count: debtors.length, amount: settlement.due })
  }

  const creditors = settlement.members.filter((member) => member.balance > 0.5)
  if (creditors.length > 0) {
    issues.push({ kind: 'credit', tone: 'info', count: creditors.length, amount: settlement.refundable })
  }

  return {
    cycle,
    settlement,
    issues,
    ready: !issues.some((issue) => issue.tone === 'warn'),
    transfers: settleUpPlan(settlement).length,
  }
}
