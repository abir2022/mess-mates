import { useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  Lock,
  Plus,
  Trash2,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Avatar, Button, EmptyState, Pill, SectionHeading, Stepper, Tabs } from '../components/ui'
import { isMealLocked, mealTotal } from '../lib/calc'
import { addDays, money, shortDate, todayISO, weekdayShort } from '../lib/format'
import type { MealField } from '../lib/types'

type TabId = 'meals' | 'bazar' | 'utilities' | 'deposits'

const mealFields: { field: MealField; label: string; step: number; max: number }[] = [
  { field: 'breakfast', label: 'Breakfast', step: 0.5, max: 3 },
  { field: 'lunch', label: 'Lunch', step: 1, max: 4 },
  { field: 'dinner', label: 'Dinner', step: 1, max: 4 },
  { field: 'guest_meals', label: 'Guests', step: 1, max: 10 },
]

export function MealsBazar() {
  const { ws, user, settlement, cycle, backend, run, busy } = useApp()
  const [tab, setTab] = useState<TabId>('meals')
  const [date, setDate] = useState(todayISO())

  if (!ws || !user || !settlement || !cycle) return null

  const symbol = ws.mess.currency_symbol
  const activeMembers = ws.members.filter((member) => member.status === 'active')
  const myRole = ws.members.find((member) => member.user_id === user.id)?.role ?? 'member'
  const cycleMeals = ws.meals.filter((meal) => meal.cycle_id === cycle.id)
  const locked = isMealLocked(ws.mess.meal_lock_hour, date, myRole) || cycle.status === 'closed'

  const dayMeals = cycleMeals.filter((meal) => meal.date === date)
  const dayTotal = dayMeals.reduce((sum, meal) => sum + mealTotal(meal), 0)

  const mealValue = (userId: string, field: MealField) =>
    Number(dayMeals.find((meal) => meal.user_id === userId)?.[field] ?? 0)

  const updateMeal = (userId: string, field: MealField, value: number) => {
    if (locked) return
    run(() => backend.setMeal({ userId, date, field, value }))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Meals & Bazar</h1>
          <p className="mt-1 text-sm text-ink-500">
            Log daily meals, submit bazar expenses and track deposits for {cycle.month_label}.
          </p>
        </div>
        <Pill tone={cycle.status === 'open' ? 'success' : 'neutral'}>{cycle.status === 'open' ? 'Cycle open' : 'Cycle closed'}</Pill>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'meals', label: 'Meal grid', icon: <UtensilsCrossed className="h-3.5 w-3.5" /> },
          { id: 'bazar', label: 'Bazar', icon: <Wallet className="h-3.5 w-3.5" /> },
          { id: 'utilities', label: 'Fixed utilities', icon: <CircleCheck className="h-3.5 w-3.5" /> },
          { id: 'deposits', label: 'Deposits', icon: <Plus className="h-3.5 w-3.5" /> },
        ]}
      />

      {tab === 'meals' ? (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setDate((current) => addDays(current, -1))}
                className="rounded-lg border border-ink-200 p-2 text-ink-500 hover:bg-ink-50"
                aria-label="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-1.5">
                <CalendarDays className="h-4 w-4 text-ink-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-[132px] border-none bg-transparent text-xs font-bold text-ink-800 outline-none"
                />
              </div>
              <button
                onClick={() => setDate((current) => addDays(current, 1))}
                className="rounded-lg border border-ink-200 p-2 text-ink-500 hover:bg-ink-50"
                aria-label="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <Button size="sm" variant="ghost" onClick={() => setDate(todayISO())}>
                Today
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={locked ? 'danger' : 'success'}>
                {locked ? <Lock className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                {cycle.status === 'closed' ? 'Cycle closed' : locked ? 'Locked for members' : 'Editable'}
              </Pill>
              <span className="text-xs font-semibold text-ink-500">
                {weekdayShort(date)} ·{' '}
                <span className="font-extrabold text-ink-800">{dayTotal.toFixed(1)} meals</span>
              </span>
            </div>
          </div>

          {locked ? (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[11px] font-medium text-amber-800">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Meal lock cutoff is {ws.mess.meal_lock_hour}:00. Members can't edit past days after the cutoff — ask an
              admin or manager to make changes.
            </p>
          ) : null}

          <div className="card divide-y divide-ink-100">
            {activeMembers.map((member) => {
              const rowMeals = dayMeals.filter((meal) => meal.user_id === member.user_id)
              const rowTotal = rowMeals.reduce((sum, meal) => sum + mealTotal(meal), 0)
              const isMe = member.user_id === user.id
              return (
                <div key={member.user_id} className={`p-4 ${isMe ? 'bg-brand-50/30' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={member.profile.full_name} url={member.profile.avatar_url} frame={member.profile.avatar_frame} size="sm" />
                      <div>
                        <p className="text-xs font-bold text-ink-900">
                          {member.profile.full_name} {isMe ? <span className="text-brand-600">(you)</span> : null}
                        </p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{member.role}</p>
                      </div>
                    </div>
                    <Pill tone="brand">{rowTotal.toFixed(1)} meals</Pill>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {mealFields.map((entry) => (
                      <div key={entry.field} className="flex items-center justify-between gap-1 rounded-lg bg-ink-50 px-2 py-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-500">{entry.label}</span>
                        <Stepper
                          value={mealValue(member.user_id, entry.field)}
                          step={entry.step}
                          max={entry.max}
                          disabled={locked || busy}
                          onChange={(next) => updateMeal(member.user_id, entry.field, next)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="card flex items-center justify-between p-4">
            <p className="text-xs font-semibold text-ink-500">
              Day value at current rate ({money(settlement.mealRate, symbol)})
            </p>
            <p className="text-sm font-extrabold tabular-nums text-ink-900">{money(dayTotal * settlement.mealRate, symbol)}</p>
          </div>
        </div>
      ) : null}

      {tab === 'bazar' ? <BazarTab /> : null}
      {tab === 'utilities' ? <UtilitiesTab /> : null}
      {tab === 'deposits' ? <DepositsTab /> : null}

    </div>
  )
}

function BazarTab() {
  const { ws, user, cycle, backend, run, busy } = useApp()
  const [amount, setAmount] = useState('')
  const [items, setItems] = useState('')
  const [date, setDate] = useState(todayISO())

  if (!ws || !user || !cycle) return null
  const symbol = ws.mess.currency_symbol
  const myRole = ws.members.find((member) => member.user_id === user.id)?.role ?? 'member'
  const canManage = myRole === 'admin' || myRole === 'manager'
  const nameOf = (id: string) => ws.members.find((member) => member.user_id === id)?.profile.full_name ?? 'Member'
  const entries = ws.bazar
    .filter((entry) => entry.cycle_id === cycle.id)
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date))
  const approved = entries.filter((entry) => entry.status === 'approved').reduce((sum, entry) => sum + Number(entry.amount), 0)
  const pending = entries.filter((entry) => entry.status === 'pending').reduce((sum, entry) => sum + Number(entry.amount), 0)

  const submit = async () => {
    const value = Number(amount)
    if (!value || value <= 0 || !items.trim()) return
    const ok = await run(() => backend.addBazar({ amount: value, items: items.trim(), date }), 'Bazar expense submitted')
    if (ok) {
      setAmount('')
      setItems('')
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <div className="card h-fit p-4">
        <SectionHeading title="Submit bazar expense" hint={canManage ? 'Auto-approved for managers' : 'Pending manager approval'} />
        <div className="space-y-3">
          <div>
            <label className="label">Amount ({symbol})</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className="field"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div>
            <label className="label">Items summary</label>
            <textarea
              className="field min-h-[72px] resize-none"
              placeholder="Rice 10kg, oil 2L, vegetables…"
              value={items}
              onChange={(event) => setItems(event.target.value)}
            />
          </div>
          <div>
            <label className="label">Expense date</label>
            <input type="date" className="field" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <Button className="w-full" disabled={!amount || !items.trim() || busy} loading={busy} onClick={submit}>
            <Plus className="h-4 w-4" /> Add expense
          </Button>
          <p className="text-[10px] leading-relaxed text-ink-400">
            Only approved bazar counts toward the meal rate. Managers can approve from the list.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">Approved bazar</p>
            <p className="mt-1 text-lg font-extrabold tabular-nums text-ink-900">{money(approved, symbol)}</p>
          </div>
          <div className="card p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">Awaiting approval</p>
            <p className="mt-1 text-lg font-extrabold tabular-nums text-amber-600">{money(pending, symbol)}</p>
          </div>
        </div>

        <div className="card divide-y divide-ink-100">
          {entries.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={<Wallet className="h-4 w-4" />} title="No bazar yet" body="Add your first expense to start the meal rate." />
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-ink-900">{entry.items_summary || 'Bazar expense'}</p>
                  <p className="mt-0.5 text-[11px] text-ink-500">
                    {nameOf(entry.buyer_id)} · {shortDate(entry.expense_date)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <p className="text-sm font-extrabold tabular-nums text-ink-900">{money(Number(entry.amount), symbol)}</p>
                  <div className="flex items-center gap-1.5">
                    <Pill tone={entry.status === 'approved' ? 'success' : 'warn'}>{entry.status}</Pill>
                    {entry.status === 'pending' && canManage ? (
                      <button
                        onClick={() => run(() => backend.setBazarStatus(entry.id, 'approved'), 'Expense approved')}
                        className="rounded-md bg-emerald-50 p-1 text-emerald-600 hover:bg-emerald-100"
                        title="Approve"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    {canManage || entry.buyer_id === user.id ? (
                      <button
                        onClick={() => run(() => backend.deleteBazar(entry.id), 'Expense removed')}
                        className="rounded-md p-1 text-ink-400 hover:bg-rose-50 hover:text-rose-500"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function UtilitiesTab() {
  const { ws, user, settlement, cycle, backend, run, busy } = useApp()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')

  if (!ws || !user || !cycle || !settlement) return null
  const symbol = ws.mess.currency_symbol
  const myRole = ws.members.find((member) => member.user_id === user.id)?.role ?? 'member'
  const canManage = myRole === 'admin' || myRole === 'manager'
  const entries = ws.utilities.filter((entry) => entry.cycle_id === cycle.id)
  const total = entries.reduce((sum, entry) => sum + Number(entry.total_amount), 0)

  const add = async () => {
    const value = Number(amount)
    if (!title.trim() || !value || value <= 0) return
    const ok = await run(() => backend.addUtility({ title: title.trim(), amount: value, split: 'equal' }), 'Utility added')
    if (ok) {
      setTitle('')
      setAmount('')
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <div className="card h-fit p-4">
        <SectionHeading title="Add fixed utility" hint={`Split equally between ${settlement.memberCount} members`} />
        {canManage ? (
          <div className="space-y-3">
            <div>
              <label className="label">Title</label>
              <input className="field" placeholder="Cook / Maid, Gas, Wi-Fi…" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div>
              <label className="label">Total amount ({symbol})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="field"
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <Button className="w-full" disabled={!title.trim() || !amount || busy} loading={busy} onClick={add}>
              <Plus className="h-4 w-4" /> Add utility
            </Button>
          </div>
        ) : (
          <p className="rounded-xl bg-ink-50 px-3 py-3 text-xs text-ink-500">
            Only admins and managers can change fixed utilities. Ask them to add cook, gas or internet bills.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="card flex items-center justify-between p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">Total utilities</p>
            <p className="text-lg font-extrabold tabular-nums text-ink-900">{money(total, symbol)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">Per member</p>
            <p className="text-lg font-extrabold tabular-nums text-brand-700">{money(settlement.utilityShare, symbol)}</p>
          </div>
        </div>

        <div className="card divide-y divide-ink-100">
          {entries.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={<CircleCheck className="h-4 w-4" />} title="No fixed utilities yet" />
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 p-3.5">
                <div>
                  <p className="text-xs font-bold text-ink-900">{entry.title}</p>
                  <p className="text-[11px] text-ink-500">Split {entry.split_type} · {settlement.memberCount} members</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-extrabold tabular-nums text-ink-900">{money(Number(entry.total_amount), symbol)}</p>
                  {canManage ? (
                    <button
                      onClick={() => run(() => backend.deleteUtility(entry.id), 'Utility removed')}
                      className="rounded-md p-1 text-ink-400 hover:bg-rose-50 hover:text-rose-500"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function DepositsTab() {
  const { ws, user, cycle, backend, run, busy } = useApp()
  const [userId, setUserId] = useState(user?.id ?? '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')

  if (!ws || !user || !cycle) return null
  const symbol = ws.mess.currency_symbol
  const myRole = ws.members.find((member) => member.user_id === user.id)?.role ?? 'member'
  const canManage = myRole === 'admin' || myRole === 'manager'
  const members = ws.members.filter((member) => member.status === 'active')
  const nameOf = (id: string) => members.find((member) => member.user_id === id)?.profile.full_name ?? 'Member'
  const entries = ws.deposits
    .filter((entry) => entry.cycle_id === cycle.id)
    .sort((a, b) => b.paid_date.localeCompare(a.paid_date))
  const total = entries.reduce((sum, entry) => sum + Number(entry.amount), 0)

  const add = async () => {
    const value = Number(amount)
    if (!value || value <= 0 || !userId) return
    const ok = await run(
      () => backend.addDeposit({ userId, amount: value, date, note: note.trim() }),
      'Deposit recorded',
    )
    if (ok) {
      setAmount('')
      setNote('')
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <div className="card h-fit p-4">
        <SectionHeading title="Record deposit" hint={`${money(total, symbol)} collected this cycle`} />
        <div className="space-y-3">
          <div>
            <label className="label">Member</label>
            <select className="field" value={userId} onChange={(event) => setUserId(event.target.value)} disabled={!canManage}>
              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.profile.full_name} {member.user_id === user.id ? '(you)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="field"
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="field" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Note</label>
            <input className="field" placeholder="Cash / bKash / bank" value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
          <Button className="w-full" disabled={!amount || !userId || busy} loading={busy} onClick={add}>
            <Plus className="h-4 w-4" /> Add deposit
          </Button>
        </div>
      </div>

      <div className="card divide-y divide-ink-100">
        {entries.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={<Wallet className="h-4 w-4" />} title="No deposits yet" body="Record cash or bKash deposits here." />
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-3 p-3.5">
              <div>
                <p className="text-xs font-bold text-ink-900">{nameOf(entry.user_id)}</p>
                <p className="text-[11px] text-ink-500">
                  {shortDate(entry.paid_date)} {entry.note ? `· ${entry.note}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-extrabold tabular-nums text-emerald-700">{money(Number(entry.amount), symbol)}</p>
                {canManage || entry.user_id === user.id ? (
                  <button
                    onClick={() => run(() => backend.deleteDeposit(entry.id), 'Deposit removed')}
                    className="rounded-md p-1 text-ink-400 hover:bg-rose-50 hover:text-rose-500"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
