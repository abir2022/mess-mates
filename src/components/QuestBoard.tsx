import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  CircleCheck,
  ShoppingBasket,
  Sparkles,
  Users,
  UtensilsCrossed,
  Vote,
  Wallet,
  X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { localDigits, todayISO } from '../lib/format'
import { useI18n, type MessageKey } from '../lib/i18n'
import { questProgress, questStatus, type QuestKey } from '../lib/quests'
import { CAST_IMG } from '../lib/tour'
import { SCENE_COPY } from '../pages/landing/sceneCopy'

const ICONS: Record<QuestKey, typeof UtensilsCrossed> = {
  meals: UtensilsCrossed,
  bazar: ShoppingBasket,
  deposit: Wallet,
  vote: Vote,
  utilities: CircleCheck,
  invite: Users,
}

/**
 * The signed-in app's answer to "what do I actually do now?". Six real actions
 * derived from the workspace state, each worth XP. Once every one is cleared the
 * dashboard hides this panel and leaves a single chip to bring it back, so the
 * top of the screen belongs to the month again.
 */
export function QuestBoard({ onHide }: { onHide?: () => void }) {
  const { ws, user, settlement, cycle } = useApp()
  const { t, lang } = useI18n()
  if (!ws || !user || !cycle) return null

  const me = settlement?.members.find((member) => member.userId === user.id)
  const quests = questStatus(ws, cycle, todayISO(), {
    deposits: me?.deposits ?? 0,
    voted: ws.votes.some((vote) => vote.user_id === user.id),
  })
  const { total, cleared, banked, totalXp, percent, allClear } = questProgress(quests)
  const tipKey: MessageKey =
    cleared === 0 ? 'quest.tipStart' : cleared >= total - 1 ? 'quest.tipEnd' : 'quest.tipMid'
  const cast = SCENE_COPY[lang].characters

  return (
    <section className="hud-panel p-4 sm:p-5" data-tour="quests" aria-labelledby="quest-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={CAST_IMG.mim}
            alt={cast.mim.name}
            className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-brand-300/60"
          />
          <div className="min-w-0">
            <p className="hud-kicker">{t('quest.kicker')}</p>
            <h2 id="quest-title" className="mt-0.5 text-base font-extrabold tracking-tight text-ink-900">
              {t('quest.title')}
            </h2>
            <p className="text-[11px] font-semibold text-ink-500">
              {t('quest.hint', { done: cleared, total, xp: banked })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip bg-amber-50 text-amber-800">
            <Sparkles className="h-3 w-3" />
            {localDigits(banked)} / {localDigits(totalXp)} XP
          </span>
          <span className="chip bg-brand-50 text-brand-700">{localDigits(percent)}%</span>
          {onHide ? (
            <button
              type="button"
              onClick={onHide}
              title={t('quest.hide')}
              aria-label={t('quest.hide')}
              className="-my-1 flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative mt-3 h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className={`h-full rounded-full transition-all ${allClear ? 'bg-emerald-500' : 'bg-gradient-to-r from-brand-500 to-brand-400'}`}
          style={{ width: `${Math.max(percent, 2)}%` }}
        />
        <div className="hud-segments pointer-events-none absolute inset-0 opacity-30" />
      </div>

      {allClear ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-gradient-to-r from-brand-700 to-brand-600 p-3 text-white">
          <Sparkles className="h-5 w-5 shrink-0 text-amber-300" />
          <div className="min-w-0">
            <p className="text-sm font-extrabold">{t('quest.allClear')}</p>
            <p className="text-[11px] leading-relaxed text-brand-50/80">{t('quest.allClearBody')}</p>
          </div>
        </div>
      ) : (
        <>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {quests.map((quest) => {
              const Icon = ICONS[quest.key]
              return (
                <li key={quest.key}>
                  <Link
                    to={quest.to}
                    className={`group flex min-h-11 items-center gap-2.5 rounded-xl border px-3 py-2 transition ${
                      quest.done
                        ? 'border-brand-100 bg-brand-50/40'
                        : 'border-ink-100 bg-white hover:border-brand-200 hover:bg-brand-500/5'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        quest.done ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-500'
                      }`}
                    >
                      {quest.done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span
                      className={`min-w-0 flex-1 text-[13px] font-bold leading-snug ${
                        quest.done ? 'text-ink-400 line-through' : 'text-ink-900'
                      }`}
                    >
                      {t(quest.label)}
                    </span>
                    <span
                      className={`chip shrink-0 ${quest.done ? 'bg-brand-100 text-brand-700' : 'bg-amber-50 text-amber-800'}`}
                    >
                      {quest.done ? t('quest.cleared') : t('quest.xp', { xp: quest.xp })}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-300 transition group-hover:text-brand-600" />
                  </Link>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 border-t border-dashed border-ink-100 pt-2.5 text-[11px] font-semibold leading-relaxed text-ink-500">
            {t(tipKey)}
          </p>
        </>
      )}
    </section>
  )
}
