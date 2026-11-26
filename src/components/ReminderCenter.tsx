import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BellRing,
  ChevronRight,
  ClipboardCheck,
  MessageCircle,
  ShoppingBasket,
  UtensilsCrossed,
  Vote,
  Wallet,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Pill } from './ui'
import { buildReminders, duesReminderText, type ReminderKind } from '../lib/reminders'
import { showDeviceNotification } from '../lib/notify'
import { currentPushSubscription, enablePush, pushConfigured } from '../lib/push'
import { money, todayISO } from '../lib/format'
import { useI18n } from '../lib/i18n'

const icons: Record<ReminderKind, typeof Wallet> = {
  dues: Wallet,
  duty: ShoppingBasket,
  meals: UtensilsCrossed,
  poll: Vote,
  approvals: ClipboardCheck,
}

const tones: Record<ReminderKind, string> = {
  dues: 'bg-rose-50 text-rose-600',
  duty: 'bg-amber-50 text-amber-700',
  meals: 'bg-brand-50 text-brand-700',
  poll: 'bg-indigo-50 text-indigo-600',
  approvals: 'bg-amber-50 text-amber-700',
}

const NOTIFIED_KEY = 'mm_reminders_notified_v1'

async function notifyOnce(title: string, body: string) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const today = todayISO()
    if (localStorage.getItem(NOTIFIED_KEY) === today) return
    const shown = await showDeviceNotification(title, body)
    if (shown) localStorage.setItem(NOTIFIED_KEY, today)
  } catch {
    // Notifications are a bonus; never break the dashboard over them.
  }
}

export function ReminderCenter() {
  const { ws, settlement, user, backend } = useApp()
  const { t } = useI18n()
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )
  const [pushOn, setPushOn] = useState(false)
  const [pushError, setPushError] = useState(false)

  useEffect(() => {
    if (!pushConfigured() || permission !== 'granted') return
    void currentPushSubscription().then((subscription) => setPushOn(Boolean(subscription)))
  }, [permission])

  const canManage = useMemo(() => {
    const role = ws?.members.find((member) => member.user_id === user?.id)?.role ?? 'member'
    return role === 'admin' || role === 'manager'
  }, [ws, user])

  const reminders = useMemo(() => {
    if (!ws || !settlement || !user) return []
    return buildReminders({
      ws,
      settlement,
      userId: user.id,
      today: todayISO(),
      canManage,
    })
  }, [ws, settlement, user, canManage])

  const duesText = useMemo(
    () => (ws && settlement ? duesReminderText(ws, settlement) : null),
    [ws, settlement],
  )

  useEffect(() => {
    if (!reminders.length) return
    const urgent = reminders.filter((reminder) => reminder.tone === 'danger').length
    void notifyOnce(
      urgent ? `${urgent} · ${t('rem.title')}` : `Mess Mates · ${t('rem.title')}`,
      reminders.map((reminder) => reminder.title).join(' · '),
    )
  }, [reminders, t])

  if (!ws || !settlement || !user || !reminders.length) return null

  const symbol = ws.mess.currency_symbol
  const outstanding = settlement.due

  const requestNotifications = async () => {
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result === 'granted') {
        if (pushConfigured()) {
          const pushed = await enablePush(backend)
          setPushOn(pushed === 'granted')
          setPushError(pushed === 'failed')
        }
        await showDeviceNotification(
          t('rem.enabled'),
          t('rem.enabledBody'),
          'mess-mates-enabled',
        )
      }
    } catch {
      setPermission(Notification.permission)
    }
  }

  const requestPush = async () => {
    setPushError(false)
    const result = await enablePush(backend)
    setPushOn(result === 'granted')
    setPushError(result === 'failed')
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-ink-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <BellRing className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-ink-900">{t('rem.title')}</p>
            <p className="text-[11px] text-ink-400">
              {outstanding > 0.5
                ? t('rem.outstanding', { amount: money(outstanding, symbol) })
                : t('rem.nothingUrgent')}
            </p>
          </div>
        </div>
        <Pill tone={reminders.some((reminder) => reminder.tone === 'danger') ? 'danger' : 'brand'}>
          {reminders.length}
        </Pill>
      </div>

      <ul className="divide-y divide-ink-100">
        {reminders.map((reminder) => {
          const Icon = icons[reminder.kind]
          return (
            <li key={reminder.id}>
              <Link
                to={reminder.href}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-ink-50/60"
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tones[reminder.kind]}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-ink-900">{reminder.title}</span>
                  <span className="block text-[11px] leading-snug text-ink-500">{reminder.body}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-300" />
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 px-4 py-3">
        {canManage && duesText ? (
          <Button
            size="sm"
            variant="gold"
            onClick={() =>
              window.open(`https://wa.me/?text=${encodeURIComponent(duesText)}`, '_blank', 'noopener')
            }
          >
            <MessageCircle className="h-3.5 w-3.5" /> {t('rem.remindAll')}
          </Button>
        ) : null}
        {permission === 'default' ? (
          <Button size="sm" variant="secondary" onClick={() => void requestNotifications()}>
            <BellRing className="h-3.5 w-3.5" /> {t('rem.enableAlerts')}
          </Button>
        ) : permission === 'granted' ? (
          pushOn ? (
            <span className="text-[10px] font-semibold text-emerald-700">{t('rem.pushOn')}</span>
          ) : pushConfigured() ? (
            <span className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => void requestPush()}>
                <BellRing className="h-3.5 w-3.5" /> {t('rem.enablePush')}
              </Button>
              {pushError ? (
                <span className="text-[10px] font-semibold text-rose-500">{t('rem.pushFailed')}</span>
              ) : null}
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-ink-400">{t('rem.alertsOn')}</span>
          )
        ) : (
          <span className="text-[10px] font-semibold text-ink-400">
            {permission === 'denied' ? t('rem.alertsBlocked') : t('rem.alertsUnsupported')}
          </span>
        )}
      </div>
    </div>
  )
}
