import { useEffect, useRef, useState } from 'react'
import { CalendarCheck, Repeat, UtensilsCrossed } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Pill, Stepper } from './ui'
import { isMealLocked, mealTotal } from '../lib/calc'
import { todayISO } from '../lib/format'
import { useI18n } from '../lib/i18n'
import {
  hasPlan,
  loadStanding,
  planFields,
  saveStanding,
  shouldFill,
  SUGGESTED_PLAN,
  type StandingSettings,
} from '../lib/standingPlan'

/**
 * Fills the signed-in member's usual meals for today, once a day, when they
 * open the app. Mounted app-wide so a member never has to remember the Meals
 * page just to be counted.
 */
export function StandingPlanAutoApply() {
  const { ws, user, cycle, backend, refresh } = useApp()
  const applied = useRef<string | null>(null)

  useEffect(() => {
    if (!ws || !user || !cycle || cycle.status !== 'open') return
    const today = todayISO()
    const attempt = `${user.id}:${ws.mess.id}:${today}`
    if (applied.current === attempt) return

    const settings = loadStanding(user.id, ws.mess.id)
    const logged = ws.meals.some(
      (meal) => meal.cycle_id === cycle.id && meal.user_id === user.id && meal.date === today && mealTotal(meal) > 0,
    )
    if (!shouldFill({ settings, today, logged })) return

    const role = ws.members.find((member) => member.user_id === user.id)?.role ?? 'member'
    if (isMealLocked(ws.mess.meal_lock_hour, today, role)) return

    applied.current = attempt
    void (async () => {
      for (const entry of planFields(settings.plan)) {
        await backend.setMeal({ userId: user.id, date: today, field: entry.field, value: entry.value })
      }
      saveStanding(user.id, ws.mess.id, { ...settings, lastApplied: today })
      await refresh()
    })().catch(() => {
      applied.current = null
    })
  }, [ws, user, cycle, backend, refresh])

  return null
}

/** The plan itself: what I normally eat, and whether the app should log it. */
export function StandingPlanCard() {
  const { ws, user, cycle, backend, run, busy, setNotice } = useApp()
  const { t } = useI18n()
  const [settings, setSettings] = useState<StandingSettings | null>(null)

  const userId = user?.id ?? ''
  const messId = ws?.mess.id ?? ''

  useEffect(() => {
    if (!userId || !messId) return
    setSettings(loadStanding(userId, messId))
  }, [userId, messId])

  if (!ws || !user || !cycle || !settings) return null

  const today = todayISO()
  const role = ws.members.find((member) => member.user_id === user.id)?.role ?? 'member'
  const locked = isMealLocked(ws.mess.meal_lock_hour, today, role) || cycle.status === 'closed'
  const plan = settings.plan

  const update = (next: StandingSettings) => {
    setSettings(next)
    saveStanding(user.id, ws.mess.id, next)
  }

  const setField = (field: keyof typeof plan, value: number) =>
    update({ ...settings, plan: { ...plan, [field]: value } })

  // Turning it on with nothing set would promise to fill nothing, so start
  // from the meal almost every mess eats.
  const toggle = () => {
    const enabled = !settings.enabled
    const nextPlan = enabled && !hasPlan(plan) ? { ...SUGGESTED_PLAN } : plan
    update({ ...settings, enabled, plan: nextPlan })
  }

  const fillToday = async () => {
    if (locked) return
    const fields = planFields(plan)
    if (!fields.length) return
    const ok = await run(async () => {
      for (const entry of fields) {
        await backend.setMeal({ userId: user.id, date: today, field: entry.field, value: entry.value })
      }
    })
    if (ok) {
      saveStanding(user.id, ws.mess.id, { ...settings, lastApplied: today })
      setSettings((current) => (current ? { ...current, lastApplied: today } : current))
      setNotice(t('meals.standingFilled'))
    }
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Repeat className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-ink-900">{t('meals.standingTitle')}</p>
            <p className="text-[11px] text-ink-500">{t('meals.standingHint')}</p>
          </div>
        </div>
        <Pill tone={settings.enabled && hasPlan(plan) ? 'success' : 'neutral'}>
          {settings.enabled && hasPlan(plan) ? t('meals.standingAutoOn') : t('meals.standingAutoOff')}
        </Pill>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
        {(
          [
            { field: 'breakfast', label: 'meals.breakfast', max: 3, step: 0.5 },
            { field: 'lunch', label: 'meals.lunch', max: 4, step: 1 },
            { field: 'dinner', label: 'meals.dinner', max: 4, step: 1 },
          ] as const
        ).map((entry) => (
          <div
            key={entry.field}
            className="flex items-center justify-between gap-2 rounded-lg bg-ink-50 px-2.5 py-1.5"
          >
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-500">
              {t(entry.label)}
            </span>
            <Stepper
              value={plan[entry.field]}
              step={entry.step}
              max={entry.max}
              disabled={busy}
              onChange={(value) => setField(entry.field, value)}
            />
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={settings.enabled ? 'secondary' : 'gold'}
          onClick={toggle}
        >
          <UtensilsCrossed className="h-3.5 w-3.5" />
          {settings.enabled ? t('meals.standingTurnOff') : t('meals.standingTurnOn')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={locked || busy || !hasPlan(plan)}
          onClick={() => void fillToday()}
          title={locked ? t('meals.standingLocked') : undefined}
        >
          <CalendarCheck className="h-3.5 w-3.5" /> {t('meals.standingFill')}
        </Button>
        {locked ? <span className="text-[10px] font-semibold text-amber-700">{t('meals.standingLocked')}</span> : null}
      </div>
    </div>
  )
}
