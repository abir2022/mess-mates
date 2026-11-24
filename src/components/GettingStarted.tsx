import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronRight, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { todayISO } from '../lib/format'
import { gettingStartedState } from '../lib/gettingStarted'
import { useI18n } from '../lib/i18n'

/**
 * First-run checklist. A brand-new mess is an empty grid, and the difference
 * between a mess that gets used and one that is abandoned is whether the first
 * four things happened. It disappears once they have (or when dismissed) and the
 * dismissal is remembered per mess on the device.
 */
export function GettingStarted() {
  const { ws, cycle } = useApp()
  const { t } = useI18n()
  const messId = ws?.mess.id ?? ''
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (!messId) return
    setHidden(window.localStorage.getItem(`mm.gettingStarted.${messId}`) === 'done')
  }, [messId])

  if (!ws || !cycle || hidden) return null

  const labels = {
    invite: { label: t('start.invite'), to: '/hub' },
    utilities: { label: t('start.utilities'), to: '/meals' },
    meals: { label: t('start.meals'), to: '/meals' },
    bazar: { label: t('start.bazar'), to: '/meals' },
  } as const

  const steps = gettingStartedState(ws, cycle, todayISO()).map((state) => ({
    key: state.step,
    done: state.done,
    ...labels[state.step],
  }))

  const done = steps.filter((step) => step.done).length
  if (done === steps.length) return null

  const dismiss = () => {
    window.localStorage.setItem(`mm.gettingStarted.${messId}`, 'done')
    setHidden(true)
  }

  return (
    <div className="card border-brand-100 bg-brand-50/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-ink-900">{t('start.title')}</p>
            <p className="text-[11px] text-ink-500">{t('start.hint', { done, total: steps.length })}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex min-h-9 shrink-0 items-center rounded-lg px-2 text-[11px] font-bold text-ink-400 transition hover:text-ink-700"
        >
          {t('start.dismiss')}
        </button>
      </div>

      <ul className="mt-3 space-y-1.5">
        {steps.map((step) => (
          <li key={step.key}>
            <Link
              to={step.to}
              className="flex min-h-11 items-center gap-2.5 rounded-xl bg-white px-3 py-2 transition hover:bg-brand-50"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  step.done ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 text-transparent'
                }`}
              >
                <Check className="h-3 w-3" />
              </span>
              <span
                className={`min-w-0 flex-1 truncate text-[13px] font-semibold ${
                  step.done ? 'text-ink-400 line-through' : 'text-ink-800'
                }`}
              >
                {step.label}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-300" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
