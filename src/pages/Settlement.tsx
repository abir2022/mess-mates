import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Crown, Download, Printer, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useMonetization } from '../components/Monetization'
import { Pill } from '../components/ui'
import { money, monthTitle } from '../lib/format'

export function Settlement() {
  const { ws, settlement, cycle, user } = useApp()
  const { showAd, isPro } = useMonetization()
  const [branded, setBranded] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!ws || !settlement || !cycle || !user) return null

  const symbol = ws.mess.currency_symbol
  const nameOf = (id: string) => ws.members.find((member) => member.user_id === id)?.profile.full_name ?? 'Member'

  const brandedPdf = async () => {
    setBusy(true)
    const ok = isPro ? true : await showAd('Generate the high-res branded month-end PDF')
    setBusy(false)
    if (!ok) return
    setBranded(true)
    setTimeout(() => window.print(), 250)
  }

  return (
    <div className="mx-auto max-w-4xl print-full">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link to="/" className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-ink-500 hover:bg-ink-100">
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-bold text-ink-700 transition hover:border-brand-300"
          >
            <Printer className="h-3.5 w-3.5" /> Print / Save PDF
          </button>
          <button
            onClick={brandedPdf}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-flame-500 px-3 py-2 text-xs font-bold text-ink-900 shadow-sm transition hover:brightness-105 disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" /> Branded PDF
            {!isPro ? <span className="rounded bg-ink-900/10 px-1 text-[9px]">AD</span> : null}
          </button>
        </div>
      </div>

      <div className="card overflow-hidden bg-white p-6 print-full">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-100 pb-5">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Mess Mates" className="h-12 w-12 rounded-xl object-cover" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">Month-end settlement</p>
              <h1 className="text-xl font-extrabold leading-tight text-ink-900">{ws.mess.name}</h1>
              <p className="text-xs text-ink-500">
                {monthTitle(cycle.month_label)} · {cycle.status} · {ws.members.filter((m) => m.status === 'active').length} members
              </p>
            </div>
          </div>
          <div className="text-right">
            <Pill tone={cycle.status === 'open' ? 'brand' : 'neutral'}>{cycle.status === 'open' ? 'Live draft' : 'Finalised'}</Pill>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-400">Meal rate</p>
            <p className="text-2xl font-extrabold tabular-nums text-brand-700">{money(settlement.mealRate, symbol)}</p>
          </div>
        </header>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            { label: 'Total meals', value: settlement.totalMeals.toFixed(1) },
            { label: 'Approved bazar', value: money(settlement.totalBazar, symbol) },
            { label: 'Fixed utilities', value: money(settlement.totalUtilities, symbol) },
            { label: 'Deposits', value: money(settlement.totalDeposits, symbol) },
            { label: 'Utility / member', value: money(settlement.utilityShare, symbol) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-ink-100 bg-ink-50/50 px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wide text-ink-400">{stat.label}</p>
              <p className="mt-0.5 text-sm font-extrabold tabular-nums text-ink-900">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[700px] text-xs">
            <thead>
              <tr className="border-b border-ink-200 text-left">
                <th className="py-2 pr-2 text-[10px] font-bold uppercase tracking-wide text-ink-400">Member</th>
                <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-400">B</th>
                <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-400">L</th>
                <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-400">D</th>
                <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-400">Guest</th>
                <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-400">Meals</th>
                <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-400">Meal cost</th>
                <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-400">Utility</th>
                <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-400">Payable</th>
                <th className="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-400">Deposits</th>
                <th className="pl-2 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-ink-400">Balance</th>
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
                  <td className="px-2 py-2 text-right font-semibold tabular-nums text-ink-800">{member.meals.toFixed(1)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-ink-600">{money(member.mealCost, symbol)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-ink-600">{money(member.utilityShare, symbol)}</td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums text-ink-800">{money(member.payable, symbol)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-ink-600">{money(member.deposits, symbol)}</td>
                  <td className={`py-2 pl-2 text-right font-extrabold tabular-nums ${member.balance < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {money(member.balance, symbol)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink-200 font-extrabold text-ink-900">
                <td className="py-2.5 pr-2">Total</td>
                <td colSpan={4} />
                <td className="px-2 py-2.5 text-right tabular-nums">{settlement.totalMeals.toFixed(1)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">
                  {money(settlement.totalPayable - settlement.totalUtilities, symbol)}
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums">{money(settlement.totalUtilities, symbol)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{money(settlement.totalPayable, symbol)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{money(settlement.totalDeposits, symbol)}</td>
                <td className="py-2.5 pl-2 text-right tabular-nums">{money(settlement.refundable - settlement.due, symbol)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-rose-500">Total dues</p>
            <p className="text-lg font-extrabold tabular-nums text-rose-700">{money(settlement.due, symbol)}</p>
            <p className="mt-1 text-[10px] text-rose-500">Collect from members with a negative balance.</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Total refundable</p>
            <p className="text-lg font-extrabold tabular-nums text-emerald-700">{money(settlement.refundable, symbol)}</p>
            <p className="mt-1 text-[10px] text-emerald-600">Return to members with a positive balance.</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-ink-50/70 px-4 py-3 text-[10px] leading-relaxed text-ink-500">
          <p className="font-bold uppercase tracking-wide text-ink-600">How this is calculated</p>
          <p className="mt-1">
            Meal rate = approved bazar ÷ total mess meals. Payable = member meals × meal rate + fixed utility share.
            Balance = deposits − payable. Pending bazar is excluded until a manager approves it.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-8 text-[10px] text-ink-400">
          <div>
            <div className="h-8 border-b border-ink-300" />
            <p className="mt-1.5 font-semibold">Prepared by (Manager)</p>
          </div>
          <div>
            <div className="h-8 border-b border-ink-300" />
            <p className="mt-1.5 font-semibold">Approved by (Admin)</p>
          </div>
        </div>

        <footer className="mt-6 flex items-center justify-between border-t border-ink-100 pt-3 text-[9px] text-ink-400">
          <span>
            {branded ? 'Generated with Mess Mates Pro · ' : 'Generated with Mess Mates · '}
            {nameOf(user.id)} · {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <span className="flex items-center gap-1">
            {branded ? <Crown className="h-3 w-3 text-amber-500" /> : <Sparkles className="h-3 w-3" />} messmates.app
          </span>
        </footer>
      </div>
    </div>
  )
}
