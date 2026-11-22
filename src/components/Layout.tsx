import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import {
  AlarmClockCheck,
  Crown,
  LayoutDashboard,
  LogOut,
  Sparkles,
  Trophy,
  Users,
  UtensilsCrossed,
  Swords,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Avatar, CopyButton, Pill } from './ui'
import { bannerClass } from '../lib/backend'
import { monthTitle } from '../lib/format'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/meals', label: 'Meals & Bazar', icon: UtensilsCrossed, end: false },
  { to: '/arena', label: 'Arena & Polls', icon: Swords, end: false },
  { to: '/hub', label: 'Mess Hub', icon: Users, end: false },
]

export function AppLayout({ children }: { children: ReactNode }) {
  const { ws, user, cycle, backend, signOut, notice, error, clearError, busy } = useApp()
  if (!ws || !user) return null

  const role = ws.members.find((member) => member.user_id === user.id)?.role ?? 'member'

  return (
    <div className="min-h-screen bg-ink-50 md:flex">
      <aside className="no-print sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-ink-100 bg-white px-4 py-5 md:flex">
        <div className="flex items-center gap-3 px-2">
          <img src="/logo.png" alt="Mess Mates" className="h-11 w-11 rounded-xl object-cover" />
          <div>
            <p className="text-base font-extrabold tracking-tight text-ink-900">Mess Mates</p>
            <p className="text-[11px] font-semibold text-ink-400">Mess accounting · Guild arena</p>
          </div>
        </div>

        <div className={`mt-5 overflow-hidden rounded-2xl bg-gradient-to-br ${bannerClass(ws.mess.guild_banner)} p-3.5 text-white`}>
          <div className="flex items-center justify-between">
            <span className="text-2xl leading-none">{ws.mess.guild_emblem}</span>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              {ws.mess.is_pro_mess ? 'Pro guild' : 'Guild'}
            </span>
          </div>
          <p className="mt-2 line-clamp-1 text-sm font-extrabold">{ws.mess.name}</p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-white/80">
            <Trophy className="h-3 w-3" /> {ws.mess.guild_points.toLocaleString()} pts
            <span className="text-white/30">·</span>
            <span>Code {ws.mess.invite_code}</span>
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
              <item.icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-3">
            <div className="flex items-center justify-between text-[11px] font-semibold text-ink-500">
              <span className="inline-flex items-center gap-1">
                <AlarmClockCheck className="h-3.5 w-3.5" /> {cycle ? monthTitle(cycle.month_label) : 'No cycle'}
              </span>
              <Pill tone={cycle?.status === 'open' ? 'brand' : 'neutral'}>{cycle?.status ?? '—'}</Pill>
            </div>
            <p className="mt-1 text-[11px] text-ink-400">
              {ws.members.filter((member) => member.status === 'active').length} members · {role} access
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-ink-100 p-2.5">
            <Avatar name={user.full_name} url={user.avatar_url} frame={user.avatar_frame} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-ink-800">{user.full_name}</p>
              <p className="flex items-center gap-1 text-[10px] font-semibold text-brand-600">
                <Sparkles className="h-3 w-3" /> {user.xp_points} XP
              </p>
            </div>
            <button
              onClick={signOut}
              disabled={busy}
              title="Sign out"
              className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-rose-500"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {!ws.mess.is_pro_mess ? (
            <div className="rounded-xl bg-gradient-to-br from-ink-900 to-brand-800 p-3 text-white">
              <p className="flex items-center gap-1.5 text-xs font-bold">
                <Crown className="h-3.5 w-3.5 text-amber-300" /> Go Pro
              </p>
              <p className="mt-1 text-[11px] text-white/70">Ad-free for every mate + premium guild frames.</p>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="flex min-h-screen w-full flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-ink-100 bg-white/90 px-4 py-2.5 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Mess Mates" className="h-8 w-8 rounded-lg object-cover" />
            <div className="leading-tight">
              <p className="text-xs font-extrabold text-ink-900">{ws.mess.name}</p>
              <p className="text-[10px] font-semibold text-ink-400">
                {ws.mess.guild_emblem} {ws.mess.guild_points.toLocaleString()} pts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone="brand">{ws.mess.invite_code}</Pill>
            <Avatar name={user.full_name} url={user.avatar_url} frame={user.avatar_frame} size="xs" />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-8">{children}</main>

        <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-bold transition ${
                    isActive ? 'text-brand-700' : 'text-ink-400'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`flex h-8 w-12 items-center justify-center rounded-lg transition ${isActive ? 'bg-brand-50' : ''}`}>
                      <item.icon className="h-[18px] w-[18px]" />
                    </span>
                    {item.label.split(' ')[0]}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>

      <div className="no-print pointer-events-none fixed inset-x-0 bottom-24 z-40 flex flex-col items-center gap-2 px-4 md:bottom-6">
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
      <style>{`.nav-link svg{width:18px;height:18px}`}</style>
    </div>
  )
}
