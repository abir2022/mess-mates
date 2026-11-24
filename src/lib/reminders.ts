import type { Settlement } from './calc'
import type { Workspace } from './types'
import { addDays, monthTitle, money, relativeDay } from './format'
import { t } from './i18n'

/**
 * In-app reminders.
 *
 * A pure derivation of "what needs attention" from the workspace snapshot, so
 * the same rules can be unit tested and reused by the dashboard, the device
 * notification and the WhatsApp bulk reminder.
 */

export type ReminderKind = 'dues' | 'duty' | 'meals' | 'poll' | 'approvals'
export type ReminderTone = 'danger' | 'warn' | 'brand' | 'success'

export interface Reminder {
  id: string
  kind: ReminderKind
  title: string
  body: string
  tone: ReminderTone
  href: string
}

export interface ReminderContext {
  ws: Workspace
  settlement: Settlement
  userId: string
  today: string
  canManage?: boolean
}

/** Labels a day relative to the reminder's own `today`, not the wall clock. */
function relativeTo(iso: string, today: string): string {
  if (iso === today) return 'Today'
  if (iso === addDays(today, 1)) return 'Tomorrow'
  return relativeDay(iso)
}

export function buildReminders({ ws, settlement, userId, today, canManage = false }: ReminderContext): Reminder[] {
  const symbol = ws.mess.currency_symbol
  const cycle = ws.cycles.find((entry) => entry.id === settlement.cycleId)
  const isOpen = cycle?.status === 'open'
  const reminders: Reminder[] = []

  const me = settlement.members.find((member) => member.userId === userId)
  if (me && me.balance < -0.5) {
    reminders.push({
      id: 'dues',
      kind: 'dues',
      title: t('rem.duesTitle', { amount: money(Math.abs(me.balance), symbol) }),
      body: isOpen
        ? t('rem.duesBodyOpen', { month: monthTitle(cycle?.month_label ?? '') })
        : t('rem.duesBodyClosed'),
      tone: 'danger',
      href: '/meals',
    })
  }

  const duties = ws.duty
    .filter((entry) => entry.status === 'upcoming' && entry.assigned_user_id === userId)
    .filter((entry) => entry.scheduled_date === today || entry.scheduled_date === addDays(today, 1))
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))

  if (duties[0]) {
    const duty = duties[0]
    const items = duty.shopping_list.length
      ? t('rem.dutyItems', { count: duty.shopping_list.length })
      : t('rem.dutyNoList')
    const when = relativeTo(duty.scheduled_date, today).toLowerCase()
    reminders.push({
      id: `duty-${duty.id}`,
      kind: 'duty',
      title: t('rem.dutyTitle', { when }),
      body: duty.market_route_notes ? `${items} · ${duty.market_route_notes}` : items,
      tone: 'warn',
      href: '/hub',
    })
  }

  const loggedToday = ws.meals.some(
    (meal) => meal.user_id === userId && meal.date === today && meal.cycle_id === settlement.cycleId,
  )
  if (isOpen && !loggedToday) {
    reminders.push({
      id: 'meals-today',
      kind: 'meals',
      title: t('rem.mealsTitle'),
      body: t('rem.mealsBody', { hour: ws.mess.meal_lock_hour }),
      tone: 'brand',
      href: '/meals',
    })
  }

  const myVotes = new Set(ws.votes.filter((vote) => vote.user_id === userId).map((vote) => vote.poll_id))
  const closingPoll = ws.polls
    .filter((poll) => !myVotes.has(poll.id))
    .filter((poll) => {
      const closes = poll.closes_at.slice(0, 10)
      return closes === today || closes === addDays(today, 1)
    })
    .sort((a, b) => a.closes_at.localeCompare(b.closes_at))[0]

  if (closingPoll) {
    reminders.push({
      id: `poll-${closingPoll.id}`,
      kind: 'poll',
      title: t('rem.pollTitle', { question: closingPoll.question }),
      body: t('rem.pollBody', {
        count: closingPoll.options.length,
        when: relativeTo(closingPoll.closes_at.slice(0, 10), today).toLowerCase(),
      }),
      tone: 'brand',
      href: '/arena',
    })
  }

  if (canManage) {
    const pending = ws.bazar.filter(
      (expense) => expense.cycle_id === settlement.cycleId && expense.status === 'pending',
    )
    if (pending.length) {
      reminders.push({
        id: 'approvals',
        kind: 'approvals',
        title: t(pending.length === 1 ? 'rem.approvalsTitleOne' : 'rem.approvalsTitle', {
          count: pending.length,
        }),
        body: t('rem.approvalsBody'),
        tone: 'warn',
        href: '/meals',
      })
    }
  }

  return reminders
}

export interface DueMember {
  userId: string
  name: string
  amount: number
}

/** Members who still owe money this cycle, largest due first. */
export function outstandingDues(settlement: Settlement): DueMember[] {
  return settlement.members
    .filter((member) => member.balance < -0.5)
    .map((member) => ({ userId: member.userId, name: member.name, amount: Math.abs(member.balance) }))
    .sort((a, b) => b.amount - a.amount)
}

/** One WhatsApp message listing every defaulter, ready for the manager to send. */
export function duesReminderText(ws: Workspace, settlement: Settlement): string | null {
  const dues = outstandingDues(settlement)
  if (!dues.length) return null
  const cycle = ws.cycles.find((entry) => entry.id === settlement.cycleId)
  const lines = dues.map((due) => `• ${due.name}: ${money(due.amount, ws.mess.currency_symbol)}`)
  return [
    `💰 ${t('rem.waTitle', { mess: ws.mess.name })}`,
    t('rem.waRate', {
      month: monthTitle(cycle?.month_label ?? ''),
      rate: money(settlement.mealRate, ws.mess.currency_symbol),
    }),
    '',
    ...lines,
    '',
    t('rem.waTotal', { amount: money(dues.reduce((sum, due) => sum + due.amount, 0), ws.mess.currency_symbol) }),
    t('rem.waFooter'),
  ].join('\n')
}
