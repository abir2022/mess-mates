import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import {
  AlarmClockCheck,
  CloudOff,
  Crown,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Sparkles,
  Trophy,
  Users,
  UtensilsCrossed,
  Wallet,
  Swords,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Avatar, CopyButton, Pill } from './ui'
import { bannerClass } from '../lib/backend'
import { monthTitle } from '../lib/format'
import { useI18n, type MessageKey } from '../lib/i18n'
import { usePwaUpdate } from '../lib/pwa'
import { LanguageToggle } from './LanguageToggle'

const navItems: { to: string; label: MessageKey; icon: typeof LayoutDashboard; end: boolean }[] = [
  { to: '/', label: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/meals', label: 'nav.meals', icon: UtensilsCrossed, end: false },
  { to: '/arena', label: 'nav.arena', icon: Swords, end: false },
  { to: '/hub', label: 'nav.hub', icon: Users, end: false },
  { to: '/settlement', label: 'dash.settlement', icon: Wallet, end: false },
]

export function AppLayout({ children }: { children: ReactNode }) {
  const { ws, user, cycle, signOut, notice, error, clearError, busy, online, pending, syncNow } =
    useApp()
  const { t } = useI18n()
  const { updateReady, reload, dismiss } = usePwaUpdate()
  if (!ws || !user) return null

  const role = ws.members.find((member) => member.user_id === user.id)?.role ?? 'member'
  const roleLabel = t(`role.${role}` as MessageKey)
  const activeMembers = ws.members.filter((member) => member.status === 'active').length

  return (
    <div className="flex min-h-dvh flex-col bg-ink-50 md:flex-row">
      <aside className="no-print no-scrollbar sticky top-0 hidden h-dvh w-72 shrink-0 flex-col overflow-y-auto border-r border-ink-100 bg-white px-4 py-5 md:flex">
        <div className="flex items-center gap-3 px-2">
          <img src="/logo.png" alt="Mess Mates" className="h-11 w-11 rounded-xl object-cover" />
          <div>
            <p className="text-base font-extrabold tracking-tight text-ink-900">Mess Mates</p>
            <p className="text-xs font-semibold text-ink-400">{t('app.tagline')}</p>
          </div>
        </div>

        <div className={`mt-5 overflow-hidden rounded-2xl bg-gradient-to-br ${bannerClass(ws.mess.guild_banner)} p-3.5 text-white`}>
          <div className="flex items-center justify-between">
            <span className="text-2xl leading-none">{ws.mess.guild_emblem}</span>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              {ws.mess.is_pro_mess ? t('layout.proGuild') : t('layout.guild')}
            </span>
          </div>
          <p className="mt-2 line-clamp-1 text-sm font-extrabold">{ws.mess.name}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-white/80">
            <Trophy className="h-3 w-3" /> {t('layout.points', { points: ws.mess.guild_points.toLocaleString() })}
            <span className="text-white/30">·</span>
            <span>{t('layout.code', { code: ws.mess.invite_code })}</span>
            <CopyButton value={ws.mess.invite_code} label="" />
          </div>
        </div>

        <nav className="mt-5 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">{t(item.label)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3 pt-5">
          <div className="flex justify-end">
            <LanguageToggle />
          </div>
          <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-ink-500">
              <span className="inline-flex items-center gap-1">
                <AlarmClockCheck className="h-3.5 w-3.5" /> {cycle ? monthTitle(cycle.month_label) : t('layout.noCycle')}
              </span>
              <Pill tone={cycle?.status === 'open' ? 'brand' : 'neutral'}>{cycle?.status ?? '—'}</Pill>
            </div>
            <p className="mt-1 text-xs text-ink-400">
              {t('layout.members', { count: activeMembers, role: roleLabel })}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-ink-100 p-2.5">
            <Avatar name={user.full_name} url={user.avatar_url} frame={user.avatar_frame} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-ink-800">{user.full_name}</p>
              <p className="flex items-center gap-1 text-[11px] font-semibold text-brand-600">
                <Sparkles className="h-3 w-3" /> {user.xp_points} XP
              </p>
            </div>
            <button
              onClick={signOut}
              disabled={busy}
              title={t('common.signOut')}
              aria-label={t('common.signOut')}
              className="rounded-lg p-2 text-ink-400 transition hover:bg-ink-100 hover:text-rose-500"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {!ws.mess.is_pro_mess ? (
            <div className="rounded-xl bg-gradient-to-br from-ink-900 to-brand-800 p-3 text-white">
              <p className="flex items-center gap-1.5 text-xs font-bold">
                <Crown className="h-3.5 w-3.5 text-amber-300" /> {t('layout.goPro')}
              </p>
              <p className="mt-1 text-[11px] text-white/70">{t('layout.goProBody')}</p>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="flex min-h-dvh w-full min-w-0 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-ink-100 bg-white/95 px-4 py-2.5 backdrop-blur md:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src="/logo.png" alt="Mess Mates" className="h-9 w-9 rounded-lg object-cover" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-extrabold text-ink-900">{ws.mess.name}</p>
              <p className="truncate text-[11px] font-semibold text-ink-400">
                {ws.mess.guild_emblem} {ws.mess.guild_points.toLocaleString()} pts

              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <LanguageToggle />
            <Avatar name={user.full_name} url={user.avatar_url} frame={user.avatar_frame} size="sm" />
          </div>
        </header>

        <main className="app-main mx-auto w-full min-w-0 max-w-6xl flex-1 px-3.5 pt-4 sm:px-5 md:px-8 md:pt-8 lg:px-10">
          {updateReady ? (
            <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white">
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> {t('pwa.ready')}
              </span>
              <span className="flex items-center gap-1">
                <button
                  onClick={reload}
                  className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-brand-700 transition hover:bg-brand-50"
                >
                  {t('pwa.reload')}
                </button>
                <button
                  onClick={dismiss}
                  className="rounded-lg px-2 py-1.5 text-[11px] font-bold text-white/80 transition hover:text-white"
                >
                  {t('pwa.later')}
                </button>
              </span>
            </div>
          ) : null}
          {!online || pending > 0 ? (
            <div
              className={`mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
                online ? 'bg-amber-50 text-amber-800' : 'bg-ink-900 text-white'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                {online ? <RefreshCw className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
                {online
                  ? t(pending === 1 ? 'layout.waitingOne' : 'layout.waitingSync', { count: pending })
                  : pending
                    ? t('layout.offlineQueued', { count: pending })
                    : t('layout.offline')}
              </span>
              {online && pending > 0 ? (
                <button
                  onClick={() => void syncNow()}
                  disabled={busy}
                  className="rounded-lg bg-amber-600 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-amber-700 disabled:opacity-50"
                >
                  {t('common.syncNow')}
                </button>
              ) : null}
            </div>
          ) : null}
          {children}
        </main>

        <nav className="app-nav no-print fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-md items-stretch justify-around px-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-[11px] font-bold transition ${
                    isActive ? 'text-brand-700' : 'text-ink-400'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-8 w-full max-w-[52px] items-center justify-center rounded-lg transition ${
                        isActive ? 'bg-brand-50' : ''
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span className="w-full truncate text-center leading-tight">{t(item.label)}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>

      <div className="no-print pointer-events-none fixed inset-x-0 bottom-[calc(var(--nav-h)+var(--safe-b)+0.75rem)] z-40 flex flex-col items-center gap-2 px-4 md:bottom-6">
        {error ? (
          <button
            onClick={clearError}
            className="pointer-events-auto max-w-md rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lift"
          >
            {error} · tap to dismiss
          </button>
        ) : null}
        {notice ? (
          <div className="pointer-events-auto max-w-md rounded-xl bg-ink-900 px-4 py-2.5 text-xs font-semibold text-white shadow-lift">
            {notice}
          </div>
        ) : null}
      </div>
    </div>
  )
}
