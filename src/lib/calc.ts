import type { Workspace } from './types'
import { memberAvatar, memberName } from './ledger'
import { dhakaDate, dhakaHour } from './format'

export interface MemberSettlement {
  userId: string
  name: string
  avatarUrl: string | null
  frame: string
  role: string
  meals: number
  breakfast: number
  lunch: number
  dinner: number
  guestMeals: number
  mealCost: number
  utilityShare: number
  payable: number
  deposits: number
  bazarPaid: number
  /** Approved payments this member sent to the mess for this month. */
  settledIn: number
  /** Approved payments the mess sent back to this member for this month. */
  settledOut: number
  /** Net balance carried in from earlier months: negative means an unpaid due. */
  carriedBalance: number
  balance: number
}

export interface Settlement {
  cycleId: string
  totalMeals: number
  totalBazar: number
  pendingBazar: number
  mealRate: number
  totalUtilities: number
  utilityShare: number
  totalDeposits: number
  /** Approved members→mess payments counted in this month's balances. */
  totalSettledIn: number
  /** Approved mess→members payments counted in this month's balances. */
  totalSettledOut: number
  totalPayable: number
  memberCount: number
  members: MemberSettlement[]
  refundable: number
  due: number
  /** Sum of all carried balances (positive credit + negative dues). */
  carriedTotal: number
  /** Unpaid dues rolled in from earlier months. */
  carriedDue: number
  /** Advance credit rolled in from earlier months. */
  carriedAdvance: number
}

export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export interface SettlementOptions {
  /** Include balances carried from earlier months. Off by default only while computing those months. */
  carryForward?: boolean
}

/**
 * Net balance each member brings in from every cycle that closed before this one.
 * A member with no activity in earlier cycles simply carries 0.
 */
export function carriedBalances(workspace: Workspace, cycleId: string): Map<string, number> {
  const totals = new Map<string, number>()
  const current = workspace.cycles.find((cycle) => cycle.id === cycleId)
  if (!current) return totals

  const earlier = workspace.cycles.filter((cycle) => cycle.month_label < current.month_label)
  for (const cycle of earlier) {
    const figures = computeSettlement(workspace, cycle.id, { carryForward: false })
    for (const member of figures.members) {
      totals.set(member.userId, round2((totals.get(member.userId) ?? 0) + member.balance))
    }
  }
  return totals
}

export function computeSettlement(workspace: Workspace, cycleId: string, options: SettlementOptions = {}): Settlement {
  const activeMembers = workspace.members.filter((member) => member.status === 'active')
  const meals = workspace.meals.filter((meal) => meal.cycle_id === cycleId)
  const bazar = workspace.bazar.filter((expense) => expense.cycle_id === cycleId)
  const utilities = workspace.utilities.filter(
    (utility) => utility.cycle_id === cycleId && !utility.voided_at,
  )
  const deposits = workspace.deposits.filter((deposit) => deposit.cycle_id === cycleId)
  // A closed month keeps its figures, so late money arrives as an approved
  // settlement beside it. Those payments are real money and must move the
  // balance, otherwise a settled due would still be shown (and carried) as due.
  const settlements = (workspace.settlements ?? []).filter(
    (row) => row.cycle_id === cycleId && row.status === 'approved',
  )
  const carried = options.carryForward === false ? new Map<string, number>() : carriedBalances(workspace, cycleId)

  const totalBazar = round2(
    bazar
      .filter((expense) => expense.status === 'approved' && !expense.voided_at)
      .reduce((sum, expense) => sum + Number(expense.amount), 0),
  )
  const pendingBazar = round2(
    bazar
      .filter((expense) => expense.status === 'pending' && !expense.voided_at)
      .reduce((sum, expense) => sum + Number(expense.amount), 0),
  )
  const totalMeals = round2(
    meals.reduce(
      (sum, meal) => sum + Number(meal.breakfast) + Number(meal.lunch) + Number(meal.dinner) + Number(meal.guest_meals),
      0,
    ),
  )
  const totalUtilities = round2(utilities.reduce((sum, utility) => sum + Number(utility.total_amount), 0))
  const totalDeposits = round2(
    deposits.filter((deposit) => !deposit.voided_at).reduce((sum, deposit) => sum + Number(deposit.amount), 0),
  )

  const settledFor = (userId: string, direction: 'member_to_mess' | 'mess_to_member') =>
    round2(
      settlements
        .filter((row) => row.user_id === userId && row.direction === direction)
        .reduce((sum, row) => sum + Number(row.amount), 0),
    )
  const totalSettledIn = round2(
    settlements
      .filter((row) => row.direction === 'member_to_mess')
      .reduce((sum, row) => sum + Number(row.amount), 0),
  )
  const totalSettledOut = round2(
    settlements
      .filter((row) => row.direction === 'mess_to_member')
      .reduce((sum, row) => sum + Number(row.amount), 0),
  )

  const memberCount = Math.max(activeMembers.length, 1)
  const mealRate = totalMeals > 0 ? round2(totalBazar / totalMeals) : 0
  const utilityShare = round2(totalUtilities / memberCount)

  const members: MemberSettlement[] = activeMembers.map((member) => {
    const memberMeals = meals.filter((meal) => meal.user_id === member.user_id)
    const breakfast = round2(memberMeals.reduce((sum, meal) => sum + Number(meal.breakfast), 0))
    const lunch = round2(memberMeals.reduce((sum, meal) => sum + Number(meal.lunch), 0))
    const dinner = round2(memberMeals.reduce((sum, meal) => sum + Number(meal.dinner), 0))
    const guestMeals = round2(memberMeals.reduce((sum, meal) => sum + Number(meal.guest_meals), 0))
    const totalMealsForMember = round2(breakfast + lunch + dinner + guestMeals)
    const mealCost = round2(totalMealsForMember * mealRate)
    const payable = round2(mealCost + utilityShare)
    const memberDeposits = round2(
      deposits
        .filter((deposit) => deposit.user_id === member.user_id && !deposit.voided_at)
        .reduce((sum, deposit) => sum + Number(deposit.amount), 0),
    )
    const bazarPaid = round2(
      bazar
        .filter((expense) => expense.buyer_id === member.user_id && expense.status === 'approved' && !expense.voided_at)
        .reduce((sum, expense) => sum + Number(expense.amount), 0),
    )
    const settledIn = settledFor(member.user_id, 'member_to_mess')
    const settledOut = settledFor(member.user_id, 'mess_to_member')
    const carriedBalance = round2(carried.get(member.user_id) ?? 0)
    const balance = round2(memberDeposits + settledIn - settledOut + carriedBalance - payable)
    return {
      userId: member.user_id,
      name: memberName(member),
      avatarUrl: memberAvatar(member),
      frame: member.profile.avatar_frame,
      role: member.role,
      meals: totalMealsForMember,
      breakfast,
      lunch,
      dinner,
      guestMeals,
      mealCost,
      utilityShare,
      payable,
      deposits: memberDeposits,
      bazarPaid,
      settledIn,
      settledOut,
      carriedBalance,
      balance,
    }
  })

  const refundable = round2(members.filter((member) => member.balance > 0).reduce((sum, member) => sum + member.balance, 0))
  const due = round2(
    members.filter((member) => member.balance < 0).reduce((sum, member) => sum + Math.abs(member.balance), 0),
  )

  return {
    cycleId,
    totalMeals,
    totalBazar,
    pendingBazar,
    mealRate,
    totalUtilities,
    utilityShare,
    totalDeposits,
    totalSettledIn,
    totalSettledOut,
    totalPayable: round2(members.reduce((sum, member) => sum + member.payable, 0)),
    memberCount,
    members: [...members].sort((a, b) => a.name.localeCompare(b.name)),
    refundable,
    due,
    carriedTotal: round2(members.reduce((sum, member) => sum + member.carriedBalance, 0)),
    carriedDue: round2(
      members.filter((member) => member.carriedBalance < 0).reduce((sum, member) => sum + Math.abs(member.carriedBalance), 0),
    ),
    carriedAdvance: round2(
      members.filter((member) => member.carriedBalance > 0).reduce((sum, member) => sum + member.carriedBalance, 0),
    ),
  }
}

export function mealTotal(meal: { breakfast: number; lunch: number; dinner: number; guest_meals: number }): number {
  return round2(Number(meal.breakfast) + Number(meal.lunch) + Number(meal.dinner) + Number(meal.guest_meals))
}

export function currentPersonal(settlement: Settlement, userId: string): MemberSettlement | undefined {
  return settlement.members.find((member) => member.userId === userId)
}

export interface Transfer {
  fromUserId: string
  from: string
  toUserId: string
  to: string
  amount: number
}

/**
 * Turns settlement balances into the few payments that clear the month: every
 * member in credit is paid by members in debt, biggest amounts first.
 *
 * Greedy matching, not the theoretical minimum number of transfers (that problem
 * is NP-hard), but it never exceeds `debtors + creditors - 1` payments and it
 * always pays out exactly as much as the mess owes. Members whose balance is
 * within half a paisa are skipped so rounding never creates a phantom transfer.
 */
export function settleUpPlan(settlement: Settlement): Transfer[] {
  const debtors = settlement.members
    .filter((member) => member.balance < -0.005)
    .map((member) => ({ member, left: round2(-member.balance) }))
    .sort((a, b) => b.left - a.left || a.member.name.localeCompare(b.member.name))
  const creditors = settlement.members
    .filter((member) => member.balance > 0.005)
    .map((member) => ({ member, left: round2(member.balance) }))
    .sort((a, b) => b.left - a.left || a.member.name.localeCompare(b.member.name))

  const transfers: Transfer[] = []
  let debtor = 0
  let creditor = 0

  while (debtor < debtors.length && creditor < creditors.length) {
    const amount = round2(Math.min(debtors[debtor].left, creditors[creditor].left))
    if (amount > 0.005) {
      transfers.push({
        fromUserId: debtors[debtor].member.userId,
        from: debtors[debtor].member.name,
        toUserId: creditors[creditor].member.userId,
        to: creditors[creditor].member.name,
        amount,
      })
    }
    debtors[debtor].left = round2(debtors[debtor].left - amount)
    creditors[creditor].left = round2(creditors[creditor].left - amount)
    if (debtors[debtor].left <= 0.005) debtor += 1
    if (creditors[creditor].left <= 0.005) creditor += 1
  }

  return transfers
}

export type SettleUpKind = 'transfers' | 'owed_to_mess' | 'mess_owes_members' | 'settled'

export interface SettleUpState {
  kind: SettleUpKind
  /** The money the state is about: what moves between members, or what is owed one way. */
  amount: number
}

/**
 * What the month actually needs, in plain words.
 *
 * "No transfers" is not the same as "everyone is settled": a mess that simply
 * collected less than it spent has neither debtors nor creditors to match, and
 * every member still owes the fund. Saying "everyone is settled up" there is a
 * lie the manager would catch on the first WhatsApp message.
 */
export function settleUpState(settlement: Settlement): SettleUpState {
  const hasDebtors = settlement.members.some((member) => member.balance < -0.005)
  const hasCreditors = settlement.members.some((member) => member.balance > 0.005)

  if (hasDebtors && hasCreditors) {
    return {
      kind: 'transfers',
      amount: round2(settleUpPlan(settlement).reduce((sum, transfer) => sum + transfer.amount, 0)),
    }
  }
  if (settlement.due > 0.005) return { kind: 'owed_to_mess', amount: settlement.due }
  if (settlement.refundable > 0.005) return { kind: 'mess_owes_members', amount: settlement.refundable }
  return { kind: 'settled', amount: 0 }
}

export function isMealLocked(lockHour: number, dateISO: string, role: string): boolean {
  if (role === 'admin' || role === 'manager') return false
  // The mess lives in Dhaka even when the member's phone does not.
  const todayIso = dhakaDate()
  if (dateISO < todayIso) return true
  if (dateISO > todayIso) return false
  return dhakaHour() >= lockHour
}
