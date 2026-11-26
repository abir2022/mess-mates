import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Check, Clock, Wallet } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../lib/i18n'
import { formatMeals, money, monthTitle, todayISO } from '../lib/format'
import { ledgerTotals, outstandingOf, suggestedSettlement } from '../lib/ledger'
import type { LedgerRow } from '../lib/types'
import { Button, EmptyState, Modal, Pill } from './ui'

/**
 * The member's own books across every mess they have ever been in.
 *
 * It reads `my_ledger()`, which returns only the caller's line per month, so
 * this screen works identically inside a mess and on the "join a mess" screen
 * after leaving one. A closed month is never edited: settling a late due adds
 * a settlement row beside it and the outstanding number falls.
 */
export function LedgerPanel({ compact = false }: { compact?: boolean }) {
  const { backend, ws, run } = useApp()
  const { t } = useI18n()
  const [rows, setRows] = useState<LedgerRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [settling, setSettling] = useState<LedgerRow | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [sent, setSent] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      setRows(await backend.loadLedger())
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load your ledger.')
      setRows([])
    }
  }, [backend])

  useEffect(() => {
    void load()
  }, [load, ws?.mess.id])

  const symbol = rows?.[0]?.currency_symbol ?? ws?.mess.currency_symbol ?? '৳'
  // One mess can use a different symbol, so totals only add up within one.
  const sameCurrency = (rows ?? []).filter((row) => row.currency_symbol === symbol)
  const totals = ledgerTotals(sameCurrency)

  const openSettle = (row: LedgerRow) => {
    setSettling(row)
    setAmount(suggestedSettlement(row) ? String(suggestedSettlement(row)) : '')
    setNote('')
  }

  const submit = async () => {
    if (!settling) return
    const value = Number(amount)
    if (!value || value <= 0) return
    setBusy(true)
    const ok = await run(
      () =>
        backend.requestSettlement({
          cycleId: settling.cycle_id,
          amount: value,
          date: todayISO(),
          note: note.trim(),
        }),
      t('ledger.requestSent'),
    )
    setBusy(false)
    if (ok) {
      setSent((current) => [...current, settling.cycle_id])
      setSettling(null)
      setAmount('')
      setNote('')
      await load()
    }
  }

  return (
    <div className="space-y-3">
      {!compact ? (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-extrabold text-ink-900">{t('ledger.title')}</p>
            <p className="max-w-xl text-[11px] leading-relaxed text-ink-500">{t('ledger.hint')}</p>
          </div>
          <div className="flex gap-2">
            {totals.owe > 0 ? (
              <Pill tone="brand">{t('ledger.owe', { amount: money(totals.owe, symbol) })}</Pill>
            ) : null}
            {totals.credit > 0 ? (
              <Pill tone="neutral">{t('ledger.credit', { amount: money(totals.credit, symbol) })}</Pill>
            ) : null}
          </div>
        </div>
      ) : null}

      {loadError ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-600">{loadError}</p>
      ) : null}

      {rows === null ? (
        <p className="rounded-xl border border-ink-100 bg-white px-3 py-3 text-[11px] text-ink-400">
          {t('app.loading')}
        </p>
      ) : rows.length === 0 ? (
        <div className="card p-4">
          <EmptyState icon={<BookOpen className="h-4 w-4" />} title={t('ledger.empty')} />
        </div>
      ) : (
        <div className="card divide-y divide-ink-100">
          {rows.map((row) => {
            const open = outstandingOf(row)
            const waiting = sent.includes(row.cycle_id)
            return (
              <div key={`${row.mess_id}-${row.cycle_id}`} className="p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold text-ink-900">
                      {row.mess_name} · {monthTitle(row.month_label)}
                    </p>
                    <p className="text-[11px] text-ink-500">
                      {t('settle.colMeals')} {formatMeals(row.meals)} · {t('ledger.payable')}{' '}
                      {money(row.payable, row.currency_symbol)} · {t('ledger.paid')}{' '}
                      {money(row.deposits, row.currency_symbol)}
                      {row.settled_in + row.settled_out > 0
                        ? ` · ${t('ledger.settled')} ${money(
                            row.settled_in + row.settled_out,
                            row.currency_symbol,
                          )}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-ink-400">
                        {t('ledger.outstanding')}
                      </p>
                      <p
                        className={`text-sm font-extrabold tabular-nums ${
                          open > 0.005 ? 'text-rose-600' : open < -0.005 ? 'text-emerald-700' : 'text-ink-500'
                        }`}
                      >
                        {money(Math.abs(open), row.currency_symbol)}
                      </p>
                    </div>
                    {open > 0.005 && row.cycle_status === 'closed' ? (
                      waiting ? (
                        <Pill tone="neutral">
                          <Clock className="mr-1 inline h-3 w-3" /> {t('ledger.waiting')}
                        </Pill>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => openSettle(row)}>
                          <Wallet className="h-3.5 w-3.5" /> {t('ledger.settle')}
                        </Button>
                      )
                    ) : open < -0.005 ? (
                      <Pill tone="neutral">{t('ledger.credit', { amount: money(-open, row.currency_symbol) })}</Pill>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!compact ? (
        <p className="rounded-xl bg-ink-50/70 px-3 py-2.5 text-[10px] leading-relaxed text-ink-500">
          {t('ledger.stayNote')}
        </p>
      ) : null}

      <Modal
        open={Boolean(settling)}
        onClose={() => setSettling(null)}
        title={settling ? t('ledger.settleTitle', { mess: settling.mess_name }) : t('ledger.settle')}
        subtitle={settling ? monthTitle(settling.month_label) : undefined}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setSettling(null)}>
              {t('common.close')}
            </Button>
            <Button className="flex-1" loading={busy} disabled={!Number(amount)} onClick={submit}>
              <Check className="h-4 w-4" /> {t('ledger.send')}
            </Button>
          </div>
        }
      >
        <p className="text-[11px] leading-relaxed text-ink-500">{t('ledger.settleHint')}</p>
        <div className="mt-3 space-y-2">
          <div>
            <label className="label">{t('ledger.amount', { symbol: settling?.currency_symbol ?? symbol })}</label>
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
            <label className="label">{t('ledger.note')}</label>
            <input
              className="field"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t('meals.optional')}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
