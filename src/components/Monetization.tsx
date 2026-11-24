import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { BadgeCheck, Crown, MessageCircle, Megaphone, Play, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { billingConfig, whatsappLink } from '../lib/billing'
import { useI18n } from '../lib/i18n'
import { Button, Modal, Pill } from './ui'

interface MonetizationValue {
  isPro: boolean
  showAd: (actionLabel: string) => Promise<boolean>
  openUpgrade: () => void
  openReward: (actionLabel: string, onReward: () => void) => void
}

const MonetizationContext = createContext<MonetizationValue | null>(null)

export function MonetizationProvider({ children }: { children: ReactNode }) {
  const { ws } = useApp()
  const { t } = useI18n()
  const isPro = Boolean(ws?.mess.is_pro_mess || ws?.profile.is_pro)
  const [rewardLabel, setRewardLabel] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(5)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const resolver = useRef<((value: boolean) => void) | null>(null)
  const rewardAction = useRef<(() => void) | null>(null)

  const settle = (value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    if (value) rewardAction.current?.()
    rewardAction.current = null
    setRewardLabel(null)
  }

  const showAd = (actionLabel: string) =>
    new Promise<boolean>((resolve) => {
      resolver.current?.(false)
      resolver.current = resolve
      rewardAction.current = null
      setSeconds(5)
      setRewardLabel(actionLabel)
    })

  const openReward = (actionLabel: string, onReward: () => void) => {
    resolver.current?.(false)
    resolver.current = () => {}
    rewardAction.current = onReward
    setSeconds(5)
    setRewardLabel(actionLabel)
  }

  useEffect(() => {
    if (!rewardLabel) return
    if (seconds <= 0) return
    const timer = setTimeout(() => setSeconds((current) => current - 1), 1000)
    return () => clearTimeout(timer)
  }, [rewardLabel, seconds])

  const value: MonetizationValue = {
    isPro,
    showAd,
    openUpgrade: () => setUpgradeOpen(true),
    openReward,
  }

  return (
    <MonetizationContext.Provider value={value}>
      {children}

      <Modal
        open={rewardLabel !== null}
        onClose={() => settle(false)}
        title="Rewarded Ad Preview"
        subtitle={rewardLabel ?? undefined}
      >
        <div className="space-y-4">
          <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-ink-800 to-brand-800 text-center text-white">
            <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,#39c2ac,transparent_45%),radial-gradient(circle_at_80%_70%,#fb5d12,transparent_45%)]" />
            <div className="relative px-6">
              <Megaphone className="mx-auto mb-2 h-7 w-7 text-brand-200" />
              <p className="text-sm font-bold">Your reward is being prepared</p>
              <p className="mt-1 text-[11px] text-brand-100/80">
                Web/PWA preview of a Google AdMob rewarded video slot — no forced interstitial.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-ink-50 px-4 py-3">
            <div className="text-xs text-ink-500">
              {seconds > 0 ? 'You can claim your reward in' : 'Reward unlocked. Enjoy!'}
            </div>
            <div className="text-2xl font-extrabold tabular-nums text-brand-700">{Math.max(seconds, 0)}s</div>
          </div>

          <Button
            className="w-full"
            variant={seconds > 0 ? 'secondary' : 'gold'}
            disabled={seconds > 0}
            onClick={() => settle(true)}
          >
            <Play className="h-4 w-4" />
            {seconds > 0 ? 'Watching…' : 'Claim reward'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        title={t('pro.title')}
        subtitle={t('pro.subtitle')}
      >
        <div className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-ink-900 via-brand-800 to-brand-600 p-5 text-white">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-300" />
              <span className="text-sm font-extrabold">{t('pro.plan')}</span>
              <Pill tone="gold">{billingConfig.price}</Pill>
            </div>
            <p className="mt-2 text-xs text-brand-50/80">{t('pro.lead')}</p>
          </div>

          <ul className="space-y-2.5 text-sm text-ink-700">
            {[
              t('pro.feature1'),
              t('pro.feature2'),
              t('pro.feature3'),
              t('pro.feature4'),
              t('pro.feature5'),
            ].map((benefit) => (
              <li key={benefit} className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                {benefit}
              </li>
            ))}
          </ul>

          {/* Pro is not sold in the app: there is no payment gateway yet, and the
              entitlement is server-only (see supabase/migrations/006). The button
              starts the WhatsApp conversation that activates the mess. Hidden
              gateway settings live in src/lib/billing.ts and render nothing
              until `gateways.enabled` is switched on. */}
          <div className="rounded-xl border border-ink-100 bg-ink-50/70 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
              {t('pro.contactLabel')}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm font-extrabold text-ink-900">
              <MessageCircle className="h-4 w-4 text-emerald-600" />
              {billingConfig.contact.display}
            </p>
            <p className="mt-0.5 text-[10px] text-ink-400">{t('pro.contactNumberHint')}</p>
          </div>

          <Button
            variant="gold"
            className="w-full"
            onClick={() => {
              const message = t('pro.waMessage', {
                mess: ws?.mess.name ?? '',
                code: ws?.mess.invite_code ?? '',
                price: billingConfig.price,
                phone: billingConfig.contact.display,
              })
              window.open(whatsappLink(message), '_blank', 'noopener')
              setUpgradeOpen(false)
            }}
          >
            <Sparkles className="h-4 w-4" />
            {t('pro.contact')}
          </Button>
          <p className="text-center text-[11px] leading-relaxed text-ink-400">{t('pro.contactHint')}</p>
        </div>
      </Modal>
    </MonetizationContext.Provider>
  )
}

export function useMonetization(): MonetizationValue {
  const context = useContext(MonetizationContext)
  if (!context) throw new Error('useMonetization must be used inside MonetizationProvider')
  return context
}

export function BannerAdSlot({ className = '' }: { className?: string }) {
  const { isPro, openUpgrade } = useMonetization()
  if (isPro) {
    return (
      <div className={`flex items-center justify-center gap-1.5 rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-2 text-[11px] font-semibold text-brand-700 ${className}`}>
        <BadgeCheck className="h-3.5 w-3.5" /> Pro mess — ads are off for all members
      </div>
    )
  }
  return (
    <button
      onClick={openUpgrade}
      className={`group flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-ink-200 bg-white/70 px-3 py-2.5 text-left transition hover:border-brand-300 hover:bg-brand-50/40 ${className}`}
    >
      <span className="flex items-center gap-2 text-[11px] font-semibold text-ink-400">
        <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">Ad</span>
        Banner slot · AdSense / AdMob ready
      </span>
      <span className="flex items-center gap-1 text-[11px] font-bold text-brand-600 opacity-0 transition group-hover:opacity-100">
        Remove <X className="h-3 w-3" />
      </span>
    </button>
  )
}
