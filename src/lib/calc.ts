import type { Workspace } from './types'

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
  const utilities = workspace.utilities.filter((utility) => utility.cycle_id === cycleId)
  const deposits = workspace.deposits.filter((deposit) => deposit.cycle_id === cycleId)
  const carried = options.carryForward === false ? new Map<string, number>() : carriedBalances(workspace, cycleId)

  const totalBazar = round2(
    bazar.filter((expense) => expense.status === 'approved').reduce((sum, expense) => sum + Number(expense.amount), 0),
  )
  const pendingBazar = round2(
    bazar.filter((expense) => expense.status === 'pending').reduce((sum, expense) => sum + Number(expense.amount), 0),
  )
  const totalMeals = round2(
    meals.reduce(
      (sum, meal) => sum + Number(meal.breakfast) + Number(meal.lunch) + Number(meal.dinner) + Number(meal.guest_meals),
      0,
    ),
  )
  const totalUtilities = round2(utilities.reduce((sum, utility) => sum + Number(utility.total_amount), 0))
  const totalDeposits = round2(deposits.reduce((sum, deposit) => sum + Number(deposit.amount), 0))

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
      deposits.filter((deposit) => deposit.user_id === member.user_id).reduce((sum, deposit) => sum + Number(deposit.amount), 0),
    )
    const bazarPaid = round2(
      bazar
        .filter((expense) => expense.buyer_id === member.user_id && expense.status === 'approved')
        .reduce((sum, expense) => sum + Number(expense.amount), 0),
    )
    const carriedBalance = round2(carried.get(member.user_id) ?? 0)
    const balance = round2(memberDeposits + carriedBalance - payable)
    return {
      userId: member.user_id,
      name: member.profile.full_name || 'Member',
      avatarUrl: member.profile.avatar_url,
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

export function isMealLocked(lockHour: number, dateISO: string, role: string): boolean {
  if (role === 'admin' || role === 'manager') return false
  const today = new Date()
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`
  if (dateISO < todayIso) return true
  if (dateISO > todayIso) return false
  return today.getHours() >= lockHour
}
