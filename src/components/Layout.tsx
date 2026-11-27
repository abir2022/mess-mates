import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  AlarmClockCheck,
  CloudOff,
  Compass,
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
import { Avatar, CopyButton } from './ui'
import { bannerClass } from '../lib/backend'
import { localDigits, monthTitle } from '../lib/format'
import { useI18n, type MessageKey } from '../lib/i18n'
import { usePwaUpdate } from '../lib/pwa'
import { LanguageToggle } from './LanguageToggle'
import { ThemeToggle } from './ThemeToggle'
import { StandingPlanAutoApply } from './StandingPlan'
import { Tutorial } from './Tutorial'
import { CAST_IMG, tourForPath, type TourId } from '../lib/tour'

const navItems: { to: string; label: MessageKey; icon: typeof LayoutDashboard; end: boolean }[] = [
  { to: '/', label: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/meals', label: 'nav.meals', icon: UtensilsCrossed, end: false },
  { to: '/arena', label: 'nav.arena', icon: Swords, end: false },
  { to: '/hub', label: 'nav.hub', icon: Users, end: false },
  { to: '/settlement', label: 'dash.settlement', icon: Wallet, end: false },
]

/**
 * The guide is part of the shell, not a page: Mim's face sits in the rail and in
 * the phone header, opens the tour for the screen you are on, and remembers the
 * first-run walkthrough per mess on the device.
 */
function useGuide(messId: string) {
  const location = useLocation()
  const [tour, setTour] = useState<TourId | null>(null)
  const screen = tourForPath(location.pathname)

  useEffect(() => {
    if (!messId || location.pathname !== '/') return
    if (window.localStorage.getItem(`mm.tour.${messId}.dashboard`)) return
    const timer = window.setTimeout(() => setTour('dashboard'), 900)
    return () => window.clearTimeout(timer)
  }, [messId, location.pathname])

  const close = () => {
    if (tour && messId) window.localStorage.setItem(`mm.tour.${messId}.${tour}`, 'done')
    setTour(null)
  }

  return { tour, screen, open: () => setTour(screen), close }
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { ws, user, cycle, signOut, notice, error, clearError, busy, online, pending, syncNow } =
    useApp()
  const { t } = useI18n()
  const { updateReady, reload, dismiss } = usePwaUpdate()
  const guide = useGuide(ws?.mess.id ?? '')
  if (!ws || !user) return null

  const role = ws.members.find((member) => member.user_id === user.id)?.role ?? 'member'
  const roleLabel = t(`role.${role}` as MessageKey)
  const activeMembers = ws.members.filter((member) => member.status === 'active').length

  return (
    <div className="app-shell flex min-h-dvh flex-col md:flex-row">
      <StandingPlanAutoApply />
      <aside className="app-rail no-print no-scrollbar sticky top-0 hidden h-dvh w-72 shrink-0 flex-col overflow-y-auto border-r border-white/10 px-4 py-5 text-white md:flex">
        <div className="flex items-center gap-3 px-2">
          <img src="/logo.png" alt="Mess Mates" className="h-11 w-11 rounded-xl object-cover ring-1 ring-white/20" />
          <div>
            <p className="text-base font-extrabold tracking-tight text-white">Mess Mates</p>
            <p className="text-xs font-semibold text-brand-200/70">{t('app.tagline')}</p>
          </div>
        </div>

        <div className={`mt-5 overflow-hidden rounded-2xl bg-gradient-to-br ${bannerClass(ws.mess.guild_banner)} p-3.5 text-white shadow-[0_18px_36px_-26px_rgba(0,0,0,0.9)]`}>
          <div className="flex items-center justify-between">
            <span className="text-2xl leading-none">{ws.mess.guild_emblem}</span>
            <span className="rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/85">
              {ws.mess.is_pro_mess ? t('layout.proGuild') : t('layout.guild')}
            </span>
          </div>
          <p className="mt-2 line-clamp-1 text-sm font-extrabold">{ws.mess.name}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-white/80">
            <Trophy className="h-3 w-3" /> {t('layout.points', { points: localDigits(ws.mess.guild_points.toLocaleString()) })}
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
              className={({ isActive }) => `rail-link ${isActive ? 'rail-link-active' : ''}`}
            >
              <span className="rail-icon">
                <item.icon className="h-[18px] w-[18px] shrink-0" />
              </span>
              <span className="truncate">{t(item.label)}</span>
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={guide.open}
          className="rail-link mt-2 w-full ring-1 ring-brand-400/25"
        >
          <span className="rail-icon overflow-hidden p-0">
            <img src={CAST_IMG.mim} alt="" className="h-full w-full object-cover" />
          </span>
          <span className="min-w-0 flex-1 truncate text-left">{t('tour.help')}</span>
          <Compass className="h-3.5 w-3.5 shrink-0 text-brand-300" />
        </button>

        <div className="mt-auto space-y-3 pt-5">
          <div className="flex justify-end gap-2 [&_button]:border-white/15 [&_button]:bg-white/10 [&_button]:text-white/80">
            <ThemeToggle />
            <LanguageToggle />
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-white/60">
              <span className="inline-flex items-center gap-1">
                <AlarmClockCheck className="h-3.5 w-3.5" /> {cycle ? monthTitle(cycle.month_label) : t('layout.noCycle')}
              </span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-200">
                {cycle?.status ?? '—'}
              </span>
            </div>
            <p className="mt-1 text-xs text-white/40">
              {t('layout.members', { count: activeMembers, role: roleLabel })}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
            <Avatar name={user.full_name} url={user.avatar_url} frame={user.avatar_frame} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">{user.full_name}</p>
              <p className="flex items-center gap-1 text-[11px] font-semibold text-brand-300">
                <Sparkles className="h-3 w-3" /> {user.xp_points} XP
              </p>
            </div>
            <button
              onClick={signOut}
              disabled={busy}
              title={t('common.signOut')}
              aria-label={t('common.signOut')}
              className="rounded-lg p-2 text-white/45 transition hover:bg-white/10 hover:text-rose-300"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {!ws.mess.is_pro_mess ? (
            <div className="rounded-xl border border-amber-300/30 bg-amber-400/10 p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-amber-200">
                <Crown className="h-3.5 w-3.5" /> {t('layout.goPro')}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/55">{t('layout.goProBody')}</p>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="flex min-h-dvh w-full min-w-0 flex-col">
        <header className="app-rail no-print sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 text-white md:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src="/logo.png" alt="Mess Mates" className="h-9 w-9 rounded-lg object-cover ring-1 ring-white/20" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-extrabold text-white">{ws.mess.name}</p>
              <p className="truncate text-[11px] font-semibold text-white/55">
                {ws.mess.guild_emblem} {localDigits(ws.mess.guild_points.toLocaleString())} pts
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 [&_button]:border-white/15 [&_button]:bg-white/10 [&_button]:text-white/80">
            <ThemeToggle />
            <LanguageToggle compactOnMobile />
            <button
              type="button"
              onClick={guide.open}
              title={t('tour.help')}
              aria-label={t('tour.help')}
              className="guide-orb relative h-9 w-9 shrink-0 rounded-full active:scale-95"
            >
              <img src={CAST_IMG.mim} alt="" className="guide-face h-full w-full object-cover" />
              <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-white ring-2 ring-[#071923]">
                <Compass className="h-2.5 w-2.5" />
              </span>
            </button>
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

        <nav className="app-dock app-nav no-print fixed inset-x-0 bottom-0 z-30 border-t border-white/10 md:hidden">
          <div className="mx-auto flex max-w-md items-stretch justify-around px-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-[11px] font-bold transition ${
                    isActive ? 'text-brand-300' : 'text-white/50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-8 w-full max-w-[52px] items-center justify-center rounded-xl transition ${
                        isActive
                          ? 'bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-[0_8px_16px_-8px_rgba(31,208,182,0.9)]'
                          : ''
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

      <Tutorial id={guide.tour ?? guide.screen} open={Boolean(guide.tour)} onClose={guide.close} />
    </div>
  )
}
