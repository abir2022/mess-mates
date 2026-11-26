import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  BellRing,
  CalendarDays,
  Crown,
  Megaphone,
  MessageCircle,
  ShoppingBasket,
  Trophy,
  Users,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { GettingStarted } from '../components/GettingStarted'
import { ReminderCenter } from '../components/ReminderCenter'
import { Avatar, Button, Pill, SectionHeading } from '../components/ui'
import { addDays, formatMeals, localDigits, money, monthTitle, relativeDay, todayISO } from '../lib/format'
import { round2 } from '../lib/calc'
import { memberAvatar, memberName } from '../lib/ledger'
import { useI18n, type MessageKey } from '../lib/i18n'
import type { BazarDuty } from '../lib/types'

export function Dashboard() {
  const { ws, user, settlement, totals, cycle, cycleId, setCycleId, busy } = useApp()
  const { t } = useI18n()

  if (!ws || !user || !settlement || !cycle) return null

  const symbol = ws.mess.currency_symbol
  const me = settlement.members.find((member) => member.userId === user.id)
  const myRole = ws.members.find((member) => member.user_id === user.id)?.role ?? 'member'
  const canManage = myRole === 'admin' || myRole === 'manager'
  const firstName = user.full_name.split(' ')[0]
  const today = todayISO()

  // Every month this member can see belongs to them: an accounting app that
  // hides last quarter's ledger is asking to be distrusted.
  const sortedCycles = [...ws.cycles].sort((a, b) => b.month_label.localeCompare(a.month_label))

  const dutyToday = ws.duty
    .filter((entry) => entry.status === 'upcoming' && entry.assigned_user_id === user.id)
    .filter((entry) => entry.scheduled_date === today || entry.scheduled_date === addDays(today, 1))
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))

  const announcements = [...ws.messages]
    .filter((message) => message.is_announcement)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 2)

  const nameOf = (id: string) => memberName(ws.members.find((member) => member.user_id === id))
  const avatarOf = (id: string) => memberAvatar(ws.members.find((member) => member.user_id === id))

  const nudge = (duty: BazarDuty) => {
    const text = [
      `🛒 Bazar duty reminder — ${ws.mess.name}`,
      `${relativeDay(duty.scheduled_date)} (${duty.scheduled_date})`,
      `Assigned to: ${nameOf(duty.assigned_user_id)}`,
      duty.shopping_list.length ? `Items: ${duty.shopping_list.join(', ')}` : '',
      duty.market_route_notes ? `Route: ${duty.market_route_notes}` : '',
      '',
      'Sent from Mess Mates',
    ]
      .filter(Boolean)
      .join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  const remindMember = async (userId: string, amount: number) => {
    const text = `Hey ${nameOf(userId)}, your ${ws.mess.name} dues are ${money(amount, symbol)} for ${monthTitle(
      cycle.month_label,
    )}. Please deposit when you can. 🙏`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  // Server totals when 010 is present; the client settlement is the fallback.
  const statMeals = totals?.total_meals ?? settlement.totalMeals
  const statBazar = totals?.total_bazar ?? settlement.totalBazar
  const statPending = totals?.pending_bazar ?? settlement.pendingBazar
  const statDeposits = totals?.total_deposits ?? settlement.totalDeposits
  const statRate = totals?.meal_rate ?? settlement.mealRate
  const statMembers = totals?.active_members ?? settlement.memberCount
  const statUtilities = totals?.total_utilities ?? settlement.totalUtilities
  const statUtilityShare = statMembers > 0 ? round2(statUtilities / statMembers) : settlement.utilityShare
  const progressPct = statBazar > 0 ? (statDeposits / statBazar) * 100 : 0

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-400">
            {cycle.status === 'open' ? t('dash.liveCycle') : t('dash.archivedCycle')}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-900">
            {t('dash.greeting', { name: firstName })} <span className="animate-float inline-block">👋</span>
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {ws.mess.name} · {monthTitle(cycle.month_label)} · {ws.mess.invite_code}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <select
              value={cycleId ?? ''}
              onChange={(event) => setCycleId(event.target.value)}
              className="field w-full appearance-none py-2 pr-8 text-xs font-bold sm:w-auto"
            >
              {sortedCycles.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {monthTitle(entry.month_label)}
                </option>
              ))}
            </select>
          </div>
          <Link
            to="/settlement"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-brand-700"
          >
            {t('dash.settlement')} <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <GettingStarted />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card relative overflow-hidden bg-guild-hero p-4 text-white sm:p-5 lg:col-span-2">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-300/20 blur-2xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-100/80">
                <UtensilsCrossed className="h-3.5 w-3.5" /> {t('dash.mealRate')}
              </p>
              <p className="mt-2 text-[34px] font-extrabold tabular-nums leading-none tracking-tight sm:text-4xl">
                {money(statRate, symbol)}
              </p>
              <p className="mt-1 text-[11px] text-brand-50/70">{t('dash.perMeal')}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
                {cycle.status === 'open' ? t('dash.live') : t('dash.closed')}
              </span>
              {ws.mess.is_pro_mess ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                  <Crown className="h-3 w-3" /> {t('dash.pro')}
                </span>
              ) : null}
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/10 px-2 py-2.5 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-100/70">{t('dash.meals')}</p>
              <p className="text-xs font-extrabold tabular-nums sm:text-sm">{formatMeals(statMeals)}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-2 py-2.5 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-100/70">{t('dash.bazar')}</p>
              <p className="text-xs font-extrabold tabular-nums sm:text-sm">{money(statBazar, symbol)}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-2 py-2.5 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-100/70">{t('dash.pending')}</p>
              <p className="text-xs font-extrabold tabular-nums sm:text-sm">{money(statPending, symbol)}</p>
            </div>
          </div>

          <div className="relative mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-brand-50/80">
              <span>{t('dash.depositsCollected', { amount: money(statDeposits, symbol) })}</span>
              <span>{t('dash.vsBazar', { amount: money(settlement.totalBazar, symbol) })}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className={`h-full rounded-full ${progressPct >= 100 ? 'bg-emerald-300' : 'bg-amber-300'}`}
                style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-brand-100/60">
              {progressPct >= 100
                ? t('dash.fullyFunded')
                : t('dash.percentFunded', { percent: Math.round(progressPct) })}
            </p>
          </div>
        </div>

        <div className={`card flex flex-col justify-between p-5 ${me && me.balance < 0 ? 'ring-1 ring-rose-100' : ''}`}>
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-400">{t('dash.myNetBalance')}</p>
              <Wallet className="h-4 w-4 text-ink-300" />
            </div>
            <p className={`mt-2 text-3xl font-extrabold tabular-nums ${me && me.balance < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
              {money(me?.balance ?? 0, symbol)}
            </p>
            <div className="mt-1">
              {me && me.balance > 0.5 ? (
                <Pill tone="success">{t('dash.refundable')}</Pill>
              ) : me && me.balance < -0.5 ? (
                <Pill tone="danger">{t('dash.dueDeposit')}</Pill>
              ) : (
                <Pill tone="neutral">{t('dash.allSettled')}</Pill>
              )}
            </div>

            <dl className="mt-4 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('dash.myDeposits')}</dt>
                <dd className="font-bold tabular-nums text-ink-800">{money(me?.deposits ?? 0, symbol)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">
                  {t('dash.mealCost', { meals: me ? formatMeals(me.meals) : localDigits(0) })}
                </dt>
                <dd className="font-bold tabular-nums text-ink-800">{money(me?.mealCost ?? 0, symbol)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('dash.utilityShare')}</dt>
                <dd className="font-bold tabular-nums text-ink-800">{money(me?.utilityShare ?? 0, symbol)}</dd>
              </div>
              {me && Math.abs(me.carriedBalance) > 0.005 ? (
                <div className="flex justify-between">
                  <dt className="text-ink-500">
                    {me.carriedBalance < 0 ? t('dash.carriedDues') : t('dash.carriedCredit')}
                  </dt>
                  <dd className={`font-bold tabular-nums ${me.carriedBalance < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {money(me.carriedBalance, symbol)}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-dashed border-ink-100 pt-1.5">
                <dt className="font-semibold text-ink-600">{t('dash.totalPayable')}</dt>
                <dd className="font-extrabold tabular-nums text-ink-900">{money(me?.payable ?? 0, symbol)}</dd>
              </div>
            </dl>
          </div>
          <Link
            to="/meals"
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-ink-900 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-ink-800"
          >
            <UtensilsCrossed className="h-3.5 w-3.5" /> {t('dash.logMeals')}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: Users, label: 'dash.activeMembers', value: localDigits(statMembers), tone: 'text-brand-600 bg-brand-50' },
          { icon: UtensilsCrossed, label: 'dash.totalMeals', value: formatMeals(settlement.totalMeals), tone: 'text-flame-600 bg-flame-50' },
          { icon: Wallet, label: 'dash.utilityShareLabel', value: money(statUtilityShare, symbol), tone: 'text-indigo-600 bg-indigo-50' },
          { icon: ShoppingBasket, label: 'dash.bazarPaidByMe', value: money(me?.bazarPaid ?? 0, symbol), tone: 'text-emerald-600 bg-emerald-50' },
        ].map((stat) => (
          <div key={stat.label} className="card flex items-center gap-3 p-3.5">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${stat.tone}`}>
              <stat.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-ink-400">
                {t(stat.label as MessageKey)}
              </p>
              <p className="truncate text-sm font-extrabold tabular-nums text-ink-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <ReminderCenter />

      {dutyToday.length || announcements.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {dutyToday.length ? (
            <div className="card border-amber-200 bg-amber-50/60 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <ShoppingBasket className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-amber-900">
                      {t('dash.onDuty', { when: relativeDay(dutyToday[0].scheduled_date).toLowerCase() })}
                    </p>
                    <p className="text-[11px] font-semibold text-amber-700">
                      {t('dash.items', { count: dutyToday[0].shopping_list.length })} ·{' '}
                      {dutyToday[0].market_route_notes || t('dash.noRoute')}
                    </p>
                  </div>
                </div>
                <Pill tone="warn">{t('dash.duty')}</Pill>
              </div>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {dutyToday[0].shopping_list.map((item) => (
                  <li key={item} className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold text-amber-800">
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="gold" onClick={() => nudge(dutyToday[0])}>
                  <MessageCircle className="h-3.5 w-3.5" /> {t('dash.nudge')}
                </Button>
                <Link
                  to="/hub"
                  className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-50"
                >
                  {t('dash.viewRoster')}
                </Link>
              </div>
            </div>
          ) : null}

          {announcements.length ? (
            <div className="card p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Megaphone className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-ink-900">{t('dash.noticeboard')}</p>
                  <p className="text-[11px] text-ink-400">{t('dash.pinned')}</p>
                </div>
              </div>
              <ul className="mt-3 space-y-2">
                {announcements.map((message) => (
                  <li key={message.id} className="rounded-xl border border-ink-100 bg-ink-50/60 p-3">
                    <p className="text-xs font-medium leading-relaxed text-ink-700">{message.content}</p>
                    <p className="mt-1 text-[10px] font-semibold text-ink-400">
                      {nameOf(message.user_id)} · {relativeDay(message.created_at.slice(0, 10))}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <SectionHeading
          title={t('dash.memberBreakdown')}
          hint={t('dash.rateHint', {
            month: monthTitle(cycle.month_label),
            rate: money(statRate, symbol),
          })}
          action={
            <Link to="/settlement" className="-my-2 inline-flex min-h-11 items-center gap-1 px-1 text-xs font-bold text-brand-700 hover:text-brand-800">
              <CalendarDays className="h-3.5 w-3.5" /> {t('dash.monthEnd')}
            </Link>
          }
        />
        <div className="card overflow-hidden">
          <div className="divide-y divide-ink-100 xl:hidden print:hidden">
            {settlement.members.map((member) => (
              <div
                key={member.userId}
                className={`p-3.5 ${member.userId === user.id ? 'bg-brand-50/40' : ''}`}
              >
                <div className="flex items-start gap-2.5">
                  <Avatar name={member.name} url={avatarOf(member.userId)} frame={member.frame} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-ink-900">
                      {member.name}{' '}
                      {member.userId === user.id ? <span className="text-brand-600">{t('dash.you')}</span> : null}
                    </p>
                    <p className="text-[11px] font-semibold text-ink-400">{t(`role.${member.role}` as MessageKey)}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-1 text-xs font-extrabold tabular-nums ${
                      member.balance < 0
                        ? 'bg-rose-50 text-rose-600'
                        : member.balance > 0
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-ink-100 text-ink-500'
                    }`}
                  >
                    {money(member.balance, symbol)}
                  </span>
                </div>
                <dl className="mt-2.5 grid grid-cols-3 gap-2 rounded-lg bg-ink-50/70 px-2.5 py-2 text-[11px]">
                  <div className="min-w-0">
                    <dt className="text-ink-400">{t('dash.meals')}</dt>
                    <dd className="truncate font-bold tabular-nums text-ink-800">{formatMeals(member.meals)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-ink-400">{t('dash.deposits')}</dt>
                    <dd className="truncate font-bold tabular-nums text-ink-800">{money(member.deposits, symbol)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-ink-400">{t('dash.payable')}</dt>
                    <dd className="truncate font-bold tabular-nums text-ink-800">{money(member.payable, symbol)}</dd>
                  </div>
                </dl>
                {canManage && member.balance < -0.5 ? (
                  <button
                    onClick={() => remindMember(member.userId, Math.abs(member.balance))}
                    disabled={busy}
                    className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-ink-200 py-2 text-[11px] font-bold text-ink-600 transition hover:border-brand-300 hover:text-brand-700"
                  >
                    <BellRing className="h-3.5 w-3.5" /> {t('dash.send')}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto xl:block print:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/60">
                  <th className="px-4 py-3 text-left table-head">{t('dash.member')}</th>
                  <th className="px-3 py-3 text-right table-head">{t('dash.meals')}</th>
                  <th className="px-3 py-3 text-right table-head">{t('dash.bazarPaid')}</th>
                  <th className="px-3 py-3 text-right table-head">{t('dash.deposits')}</th>
                  <th className="px-3 py-3 text-right table-head">{t('dash.payable')}</th>
                  <th className="px-3 py-3 text-right table-head">{t('dash.balance')}</th>
                  {canManage ? <th className="px-3 py-3 text-right table-head">{t('dash.remind')}</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {settlement.members.map((member) => (
                  <tr key={member.userId} className={member.userId === user.id ? 'bg-brand-50/40' : ''}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={member.name} url={avatarOf(member.userId)} frame={member.frame} size="sm" />
                        <div>
                          <p className="text-xs font-bold text-ink-900">
                            {member.name} {member.userId === user.id ? <span className="text-brand-600">{t('dash.you')}</span> : null}
                          </p>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                            {t(`role.${member.role}` as MessageKey)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-700">{formatMeals(member.meals)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-700">{money(member.bazarPaid, symbol)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-700">{money(member.deposits, symbol)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-700">{money(member.payable, symbol)}</td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-[11px] font-extrabold tabular-nums ${
                          member.balance < 0
                            ? 'bg-rose-50 text-rose-600'
                            : member.balance > 0
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-ink-100 text-ink-500'
                        }`}
                      >
                        {money(member.balance, symbol)}
                      </span>
                    </td>
                    {canManage ? (
                      <td className="px-3 py-3 text-right">
                        {member.balance < -0.5 ? (
                          <button
                            onClick={() => remindMember(member.userId, Math.abs(member.balance))}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-2 py-1 text-[10px] font-bold text-ink-600 transition hover:border-brand-300 hover:text-brand-700"
                          >
                            <BellRing className="h-3 w-3" /> {t('dash.send')}
                          </button>
                        ) : (
                          <span className="text-[10px] font-semibold text-ink-300">—</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-ink-100 bg-ink-50/60 text-xs font-extrabold text-ink-800">
                  <td className="px-4 py-3">{t('dash.total')}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatMeals(statMeals)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{money(statBazar, symbol)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{money(statDeposits, symbol)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{money(settlement.totalPayable, symbol)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{money(settlement.refundable - settlement.due, symbol)}</td>
                  {canManage ? <td /> : null}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-100 bg-white px-4 py-3">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-500">
          <Trophy className="h-3.5 w-3.5 text-amber-500" />{' '}
          {t('dash.guildRank', { points: localDigits(ws.mess.guild_points.toLocaleString()) })}
        </p>
        <Link to="/arena" className="inline-flex min-h-11 items-center px-1 text-[11px] font-bold text-brand-700 hover:text-brand-800">
          {t('dash.openArena')}
        </Link>
      </div>
    </div>
  )
}
