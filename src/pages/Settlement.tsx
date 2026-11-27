import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Download, Printer, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { CopyButton, Pill } from '../components/ui'
import { settleUpPlan, settleUpState } from '../lib/calc'
import { formatMeals, money, monthTitle } from '../lib/format'
import { downloadSettlementPdf } from '../lib/pdf'
import { memberName } from '../lib/ledger'
import { useI18n } from '../lib/i18n'

export function Settlement() {
  const { ws, settlement, cycle, user } = useApp()
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)

  if (!ws || !settlement || !cycle || !user) return null

  const symbol = ws.mess.currency_symbol
  const nameOf = (id: string) => memberName(ws.members.find((member) => member.user_id === id))
  const transfers = settleUpPlan(settlement)
  const state = settleUpState(settlement)
  const settledTotal = settlement.totalSettledIn + settlement.totalSettledOut
  const planText = [
    `${ws.mess.name} · ${monthTitle(cycle.month_label)}`,
    ...transfers.map((transfer) => `${transfer.from} → ${transfer.to}: ${money(transfer.amount, symbol)}`),
  ].join('\n')

  const downloadPdf = async () => {
    setBusy(true)
    try {
      await downloadSettlementPdf({
        messName: ws.mess.name,
        monthLabel: monthTitle(cycle.month_label),
        status: cycle.status === 'open' ? t('settle.liveDraft') : t('settle.finalised'),
        currencySymbol: symbol,
        settlement,
        generatedBy: nameOf(user.id),
        // The export itself is free for every mess; a Pro mess gets the Pro
        // footer, a free mess gets the standard one.
        branded: Boolean(ws.mess.is_pro_mess),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl print-full">
      <div className="no-print mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between" data-tour="settle-actions">
        <Link to="/" className="inline-flex min-h-11 items-center gap-1 self-start rounded-lg px-2 py-2 text-xs font-bold text-ink-500 hover:bg-ink-100">
          <ArrowLeft className="h-3.5 w-3.5" /> {t('nav.dashboard')}
        </Link>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <button
            onClick={() => window.print()}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-xs font-bold text-ink-700 transition hover:border-brand-300"
          >
            <Printer className="h-3.5 w-3.5" /> {t('settle.print')}
          </button>
          <button
            onClick={downloadPdf}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-flame-500 px-3 py-2.5 text-xs font-bold text-ink-900 shadow-sm transition hover:brightness-105 disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" /> {t('settle.brandedPdf')}
          </button>
        </div>
      </div>

      <div className="card overflow-hidden bg-white p-4 print-full sm:p-6">
        <div className="-mx-4 -mt-4 mb-5 h-1.5 bg-gradient-to-r from-brand-500 via-brand-400 to-flame-500 sm:-mx-6 sm:-mt-6" />
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-100 pb-5">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Mess Mates" className="h-12 w-12 rounded-xl object-cover" />
            <div>
              <p className="hud-kicker">{t('settle.kicker')}</p>
              <h1 className="text-xl font-extrabold leading-tight text-ink-900">{ws.mess.name}</h1>
              <p className="text-xs text-ink-500">
                {t('settle.meta', {
                  month: monthTitle(cycle.month_label),
                  count: ws.members.filter((m) => m.status === 'active').length,
                })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <Pill tone={cycle.status === 'open' ? 'brand' : 'neutral'}>
              {cycle.status === 'open' ? t('settle.liveDraft') : t('settle.finalised')}
            </Pill>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-400">{t('settle.mealRate')}</p>
            <p className="text-2xl font-extrabold tabular-nums text-brand-700">{money(settlement.mealRate, symbol)}</p>
          </div>
        </header>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5" data-tour="settle-stats">
          {[
            { label: t('dash.totalMeals'), value: formatMeals(settlement.totalMeals) },
            { label: t('meals.approvedBazar'), value: money(settlement.totalBazar, symbol) },
            { label: t('settle.fixedUtilities'), value: money(settlement.totalUtilities, symbol) },
            { label: t('dash.deposits'), value: money(settlement.totalDeposits, symbol) },
            { label: t('settle.utilityPerMember'), value: money(settlement.utilityShare, symbol) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-ink-100 bg-ink-50/60 px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wide text-ink-400">{stat.label}</p>
              <p className="mt-1 text-base font-extrabold leading-none tabular-nums text-ink-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Balances say what each member is owed; this says who actually hands money to whom. */}
        <div className="mt-5 rounded-xl border border-ink-100 bg-ink-50/40 p-3 sm:p-4" data-tour="settle-transfers">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-ink-900">{t('settle.transfers')}</p>
              <p className="text-[11px] text-ink-500">
                {state.kind === 'transfers'
                  ? t('settle.transfersHint', { count: transfers.length })
                  : state.kind === 'owed_to_mess'
                    ? t('settle.owedToMess', { amount: money(state.amount, symbol) })
                    : state.kind === 'mess_owes_members'
                      ? t('settle.messOwesMembers', { amount: money(state.amount, symbol) })
                      : t('settle.noTransfers')}
              </p>
              {state.kind === 'owed_to_mess' ? (
                <p className="mt-0.5 text-[11px] text-ink-400">{t('settle.owedToMessHint')}</p>
              ) : null}
              {state.kind === 'mess_owes_members' ? (
                <p className="mt-0.5 text-[11px] text-ink-400">{t('settle.messOwesMembersHint')}</p>
              ) : null}
              {settledTotal > 0.005 ? (
                <p className="mt-1 text-[11px] font-semibold text-brand-700">
                  {t('settle.settledNote', { amount: money(settledTotal, symbol) })}
                </p>
              ) : null}
            </div>
            {transfers.length ? (
              <CopyButton value={planText} label={t('settle.copyPlan')} />
            ) : null}
          </div>

          {transfers.length ? (
            <ul className="mt-2.5 space-y-1.5">
              {transfers.map((transfer) => (
                <li
                  key={`${transfer.fromUserId}-${transfer.toUserId}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-[13px]"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-bold text-ink-900">{transfer.from}</span>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[11px] font-black text-brand-700">
                      →
                    </span>
                    <span className="truncate font-bold text-brand-700">{transfer.to}</span>
                  </span>
                  <span className="shrink-0 font-extrabold tabular-nums text-ink-900">
                    {money(transfer.amount, symbol)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="mt-5 space-y-2 xl:hidden print:hidden">
          {settlement.members.map((member) => (
            <div key={member.userId} className="rounded-xl border border-ink-100 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-ink-900">
                    {member.name}
                    {member.userId === user.id ? (
                      <span className="ml-1 text-[11px] font-semibold text-brand-600">(you)</span>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-ink-400">
                    {member.breakfast} / {member.lunch} / {member.dinner} / {member.guestMeals}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-extrabold tabular-nums ${
                    member.balance < 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {money(member.balance, symbol)}
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-ink-100 pt-2 text-[11px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-400">{t('settle.colMeals')}</dt>
                  <dd className="font-bold tabular-nums text-ink-700">{formatMeals(member.meals)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-400">{t('settle.colMealCost')}</dt>
                  <dd className="font-bold tabular-nums text-ink-700">{money(member.mealCost, symbol)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-400">{t('settle.colUtility')}</dt>
                  <dd className="font-bold tabular-nums text-ink-700">{money(member.utilityShare, symbol)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-400">{t('settle.colDeposits')}</dt>
                  <dd className="font-bold tabular-nums text-ink-700">{money(member.deposits, symbol)}</dd>
                </div>
                {member.settledIn > 0.005 || member.settledOut > 0.005 ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink-400">{t('settle.colSettled')}</dt>
                    <dd className="font-bold tabular-nums text-brand-700">
                      {money(member.settledIn - member.settledOut, symbol)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ))}
        </div>

        <div className="mt-5 hidden overflow-x-auto xl:block print:block">
          <table className="w-full min-w-[760px] text-xs">
            <thead>
              <tr className="border-b border-ink-200 text-left">
                <th className="py-2 pr-2 text-[10px] font-bold uppercase tracking-wide text-ink-400">{t('dash.member')}</th>
                <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-400">{t('settle.colB')}</th>
                <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-400">{t('settle.colL')}</th>
                <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-400">{t('settle.colD')}</th>
                <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-400">{t('settle.colGuest')}</th>
                <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-400">{t('settle.colMeals')}</th>
                <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-400">{t('settle.colMealCost')}</th>
                <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-400">{t('settle.colUtility')}</th>
                <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-400">{t('settle.colPayable')}</th>
                <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-400">{t('settle.colDeposits')}</th>
                <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-400">{t('settle.colCarried')}</th>
                <th className="pl-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-400">{t('settle.colBalance')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {settlement.members.map((member) => (
                <tr key={member.userId}>
                  <td className="py-2 pr-2 font-bold text-ink-900">
                    {member.name}
                    {member.userId === user.id ? <span className="ml-1 text-[10px] font-semibold text-brand-600">(you)</span> : null}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-ink-600">{member.breakfast}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-ink-600">{member.lunch}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-ink-600">{member.dinner}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-ink-600">{member.guestMeals}</td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums text-ink-800">{formatMeals(member.meals)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-ink-600">{money(member.mealCost, symbol)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-ink-600">{money(member.utilityShare, symbol)}</td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums text-ink-800">{money(member.payable, symbol)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-ink-600">{money(member.deposits, symbol)}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${member.carriedBalance < 0 ? 'text-rose-600' : 'text-ink-600'}`}>
                    {money(member.carriedBalance, symbol)}
                  </td>
                  <td className={`py-2 pl-2 text-right font-extrabold tabular-nums ${member.balance < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {money(member.balance, symbol)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink-200 font-extrabold text-ink-900">
                <td className="py-2.5 pr-2">{t('dash.total')}</td>
                <td colSpan={4} />
                <td className="px-2 py-2.5 text-right tabular-nums">{formatMeals(settlement.totalMeals)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">
                  {money(settlement.totalPayable - settlement.totalUtilities, symbol)}
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums">{money(settlement.totalUtilities, symbol)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{money(settlement.totalPayable, symbol)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{money(settlement.totalDeposits, symbol)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{money(settlement.carriedTotal, symbol)}</td>
                <td className="py-2.5 pl-2 text-right tabular-nums">{money(settlement.refundable - settlement.due, symbol)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-rose-500">{t('settle.totalDues')}</p>
            <p className="text-2xl font-extrabold tabular-nums text-rose-700">{money(settlement.due, symbol)}</p>
            <p className="mt-1 text-[10px] text-rose-500">{t('settle.duesBody')}</p>
            {settlement.carriedDue > 0 ? (
              <p className="mt-0.5 text-[10px] font-semibold text-rose-600">
                {t('settle.duesCarried', { amount: money(settlement.carriedDue, symbol) })}
              </p>
            ) : null}
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">{t('settle.totalRefundable')}</p>
            <p className="text-2xl font-extrabold tabular-nums text-emerald-700">{money(settlement.refundable, symbol)}</p>
            <p className="mt-1 text-[10px] text-emerald-600">{t('settle.refundableBody')}</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-ink-50/70 px-4 py-3 text-[10px] leading-relaxed text-ink-500">
          <p className="font-bold uppercase tracking-wide text-ink-600">{t('settle.howTitle')}</p>
          <p className="mt-1">{t('settle.howBody')}</p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-8 text-[10px] text-ink-400">
          <div>
            <div className="h-8 border-b border-ink-300" />
            <p className="mt-1.5 font-semibold">{t('settle.preparedBy')}</p>
          </div>
          <div>
            <div className="h-8 border-b border-ink-300" />
            <p className="mt-1.5 font-semibold">{t('settle.approvedBy')}</p>
          </div>
        </div>

        <footer className="mt-6 flex items-center justify-between border-t border-ink-100 pt-3 text-[9px] text-ink-400">
          <span>
            {t('settle.generated')} · {nameOf(user.id)} ·{' '}
            {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> messmates.app
          </span>
        </footer>
      </div>
    </div>
  )
}
