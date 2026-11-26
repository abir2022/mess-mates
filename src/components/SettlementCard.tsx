import { useState } from 'react'
import { Check, HandCoins, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../lib/i18n'
import { money, monthTitle, shortDate, todayISO } from '../lib/format'
import { memberName } from '../lib/ledger'
import type { SettlementDirection } from '../lib/types'
import { Button, EmptyState } from './ui'

/**
 * Late money, recorded beside a closed month instead of inside it.
 *
 * A member sends a settlement request with proof; the manager approves it, or
 * the manager records cash they already hold. Either way the closed month's
 * figures never move and the outstanding balance on the ledger does.
 */
export function SettlementCard() {
  const { ws, user, backend, run, busy } = useApp()
  const { t } = useI18n()
  const [cycleId, setCycleId] = useState('')
  const [userId, setUserId] = useState(user?.id ?? '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [direction, setDirection] = useState<SettlementDirection>('member_to_mess')

  if (!ws || !user) return null

  const symbol = ws.mess.currency_symbol
  const myRole = ws.members.find((member) => member.user_id === user.id)?.role ?? 'member'
  const canManage = myRole === 'admin' || myRole === 'manager'
  const nameOf = (id: string) => memberName(ws.members.find((member) => member.user_id === id))
  const cycles = [...ws.cycles].sort((a, b) => b.month_label.localeCompare(a.month_label))
  const chosen = cycleId || cycles[0]?.id || ''
  const rows = ws.settlements.filter((row) => row.mess_id === ws.mess.id)
  const pending = rows.filter((row) => row.status === 'pending')
  const visible = canManage ? pending : pending.filter((row) => row.user_id === user.id)
  // A late payment usually comes from somebody who already left, so the picker
  // has to list former members too.
  const people = ws.members

  const submit = async () => {
    const value = Number(amount)
    if (!value || value <= 0 || !chosen) return
    const ok = canManage
      ? await run(
          () =>
            backend.recordSettlement({
              cycleId: chosen,
              userId,
              amount: value,
              direction,
              date,
              note: note.trim(),
            }),
          t('ledger.recorded'),
        )
      : await run(
          () =>
            backend.requestSettlement({
              cycleId: chosen,
              amount: value,
              date,
              note: note.trim(),
            }),
          t('ledger.requestSent'),
        )
    if (ok) {
      setAmount('')
      setNote('')
    }
  }

  if (!cycles.length) return null

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-ink-100 px-4 py-3">
        <p className="text-sm font-extrabold text-ink-900">{t('ledger.settlements')}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">{t('ledger.settlementsHint')}</p>
      </div>

      {visible.length ? (
        <div className="divide-y divide-ink-100 border-b border-ink-100">
          {visible.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-xs font-bold text-ink-900">
                  {nameOf(row.user_id)} · {money(Number(row.amount), symbol)}
                </p>
                <p className="text-[11px] text-ink-500">
                  {row.cycle_id
                    ? monthTitle(cycles.find((cycle) => cycle.id === row.cycle_id)?.month_label ?? '')
                    : '—'}{' '}
                  · {shortDate(row.paid_date)} · {t('ledger.pending')}
                  {row.note ? ` · ${row.note}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {canManage ? (
                  <>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => run(() => backend.decideSettlement(row.id, true), t('ledger.approved'))}
                    >
                      <Check className="h-3.5 w-3.5" /> {t('ledger.approve')}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => run(() => backend.decideSettlement(row.id, false), t('ledger.rejected'))}
                    >
                      <X className="h-3.5 w-3.5" /> {t('ledger.reject')}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => run(() => backend.cancelSettlement(row.id), t('ledger.cancelled'))}
                  >
                    {t('ledger.cancel')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-b border-ink-100 px-4 py-3">
          <EmptyState icon={<HandCoins className="h-4 w-4" />} title={t('ledger.noPending')} />
        </div>
      )}

      {rows.filter((row) => row.status !== 'pending').length ? (
        <div className="border-b border-ink-100 px-4 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">{t('ledger.recent')}</p>
          <ul className="mt-1 space-y-1">
            {rows
              .filter((row) => row.status !== 'pending')
              .slice(0, 4)
              .map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="min-w-0 truncate text-ink-600">
                    {nameOf(row.user_id)} · {money(Number(row.amount), symbol)} · {shortDate(row.paid_date)}
                  </span>
                  <span
                    className={`shrink-0 font-bold ${
                      row.status === 'approved' ? 'text-emerald-700' : 'text-ink-400'
                    }`}
                  >
                    {row.status === 'approved'
                      ? t('ledger.approvedStatus')
                      : row.status === 'rejected'
                        ? t('ledger.reject')
                        : t('ledger.cancel')}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2 p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label className="label">{t('ledger.month')}</label>
            <select className="field" value={chosen} onChange={(event) => setCycleId(event.target.value)}>
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {monthTitle(cycle.month_label)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('dash.member')}</label>
            <select
              className="field"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              disabled={!canManage}
            >
              {people.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {nameOf(member.user_id)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">{t('ledger.amount', { symbol })}</label>
            <input
              className="field"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div>
            <label className="label">{t('meals.date')}</label>
            <input className="field" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
        </div>

        {canManage ? (
          <div>
            <label className="label">{t('ledger.direction')}</label>
            <select
              className="field"
              value={direction}
              onChange={(event) => setDirection(event.target.value as SettlementDirection)}
            >
              <option value="member_to_mess">{t('ledger.received')}</option>
              <option value="mess_to_member">{t('ledger.refunded')}</option>
            </select>
          </div>
        ) : null}

        <div>
          <label className="label">{t('ledger.note')}</label>
          <input
            className="field"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('meals.optional')}
          />
        </div>

        <Button className="w-full" disabled={!Number(amount) || busy} loading={busy} onClick={submit}>
          <HandCoins className="h-4 w-4" /> {canManage ? t('ledger.record') : t('ledger.send')}
        </Button>
      </div>
    </div>
  )
}
