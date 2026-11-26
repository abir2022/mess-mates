import { createContext, useContext, useState, type ReactNode } from 'react'
import { Crown, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { billingConfig, whatsappLink } from '../lib/billing'
import { dhakaDate, shortDate } from '../lib/format'
import { useI18n } from '../lib/i18n'
import { Button, Modal, Pill } from './ui'

/**
 * Pro is the only paid thing in the app, and it is sold over WhatsApp.
 *
 * There used to be an "AdSense / AdMob ready" banner slot and a five-second
 * rewarded-ad gate in front of the branded PDF. Both were placeholders: no ad
 * network was ever wired up, so they only stood between a manager and their own
 * ledger. They are gone; nothing in the app pretends to serve ads now.
 */
interface MonetizationValue {
  isPro: boolean
  openUpgrade: () => void
}

const MonetizationContext = createContext<MonetizationValue | null>(null)

export function MonetizationProvider({ children }: { children: ReactNode }) {
  const { ws } = useApp()
  const { t } = useI18n()
  const isPro = Boolean(ws?.mess.is_pro_mess || ws?.profile.is_pro)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const value: MonetizationValue = {
    isPro,
    openUpgrade: () => setUpgradeOpen(true),
  }

  return (
    <MonetizationContext.Provider value={value}>
      {children}

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
            {isPro && ws?.mess.pro_until ? (
              <p className="mt-2 inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white">
                {t('pro.activeUntil', { date: shortDate(dhakaDate(new Date(ws.mess.pro_until))) })}
              </p>
            ) : null}
          </div>

          <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-[11px] font-semibold leading-relaxed text-brand-800">
            {t('pro.freeCore')}
          </p>

          <ul className="space-y-2.5 text-sm text-ink-700">
            {[t('pro.feature1'), t('pro.feature2'), t('pro.feature3')].map((benefit) => (
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
