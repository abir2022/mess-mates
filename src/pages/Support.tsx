import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Crown, RefreshCw, ShieldAlert, Users } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Pill, SectionHeading } from '../components/ui'
import { dhakaDate, monthTitle, shortDate } from '../lib/format'
import type { SupportOverview } from '../lib/types'

const DAY = 24 * 60 * 60 * 1000

function untilFromDays(days: number): string {
  return new Date(Date.now() + days * DAY).toISOString()
}

export function Support() {
  const { backend } = useApp()
  const [overview, setOverview] = useState<SupportOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setOverview(await backend.loadSupportOverview())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the support console.')
    } finally {
      setLoading(false)
    }
  }, [backend])

  useEffect(() => {
    void load()
  }, [load])

  const setPro = async (messId: string, until: string | null, plan = '', reference = '') => {
    setBusy(messId)
    setError(null)
    try {
      await backend.setMessPro({ messId, until, plan, reference })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change Pro.')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      </div>
    )
  }

  if (!overview?.allowed) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-10">
        <div className="card p-6 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-ink-300" />
          <h1 className="mt-3 text-lg font-extrabold text-ink-900">Support console</h1>
          <p className="mt-1 text-sm text-ink-500">
            This console is limited to platform admins. Your account is not on the list.
          </p>
          <Link
            to="/hub"
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-brand-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Mess Hub
          </Link>
        </div>
      </div>
    )
  }

  const proCount = overview.messes.filter((mess) => mess.is_pro_mess).length
  const activeErrors = overview.errors.length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            to="/hub"
            className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-ink-400 transition hover:text-brand-600"
          >
            <ArrowLeft className="h-3 w-3" /> Mess Hub
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-900">Support console</h1>
          <p className="mt-1 text-sm text-ink-500">
            Platform-level view. Mess books are not readable from here.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void load()} loading={loading}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Messes', value: overview.messes.length, icon: Users },
          { label: 'Pro messes', value: proCount, icon: Crown },
          { label: 'Open errors', value: activeErrors, icon: ShieldAlert },
          {
            label: 'Members',
            value: overview.messes.reduce((sum, mess) => sum + mess.member_count, 0),
            icon: Users,
          },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <stat.icon className="h-4 w-4 text-ink-300" />
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-ink-900">{stat.value}</p>
            <p className="text-[11px] font-semibold text-ink-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-ink-100 p-4">
          <SectionHeading title="Messes" hint="Grant or expire Pro with a reference for the WhatsApp payment." />
        </div>
        <div className="divide-y divide-ink-100">
          {overview.messes.length === 0 ? (
            <p className="p-5 text-sm text-ink-400">No messes yet.</p>
          ) : null}
          {overview.messes.map((mess) => (
            <div key={mess.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-ink-900">
                  {mess.name}
                  {mess.is_pro_mess ? <Pill tone="warn">Pro</Pill> : <Pill tone="neutral">Free</Pill>}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-ink-400">
                  {mess.invite_code} · {mess.member_count} active ·{' '}
                  {mess.cycle_label ? monthTitle(mess.cycle_label) : 'no month'}{' '}
                  {mess.cycle_status ? `(${mess.cycle_status})` : ''}
                </p>
                {mess.pro_until ? (
                  <p className="mt-1 text-[11px] text-ink-500">
                    Pro until {shortDate(dhakaDate(new Date(mess.pro_until)))}
                    {mess.pro_plan ? ` · ${mess.pro_plan}` : ''}
                    {mess.pro_reference ? ` · ref ${mess.pro_reference}` : ''}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy === mess.id}
                  onClick={() => void setPro(mess.id, untilFromDays(30), 'monthly', 'support-console')}
                >
                  1 month
                </Button>
                <Button
                  size="sm"
                  disabled={busy === mess.id}
                  onClick={() => void setPro(mess.id, untilFromDays(365), 'yearly', 'support-console')}
                >
                  1 year
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy === mess.id || !mess.is_pro_mess}
                  onClick={() => void setPro(mess.id, null, '', '')}
                >
                  Revoke
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-ink-100 p-4">
          <SectionHeading title="Recent crashes" hint="The last 25 client errors, newest first." />
        </div>
        <div className="divide-y divide-ink-100">
          {overview.errors.length === 0 ? (
            <p className="p-5 text-sm text-ink-400">No client errors recorded.</p>
          ) : null}
          {overview.errors.map((row) => (
            <div key={row.id} className="p-4">
              <p className="text-xs font-bold text-ink-800">{row.message}</p>
              <p className="mt-0.5 text-[11px] text-ink-400">
                {row.mess_name ?? 'unknown mess'} · {row.route || '/'} ·{' '}
                {shortDate(dhakaDate(new Date(row.created_at)))}
              </p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-[11px] leading-relaxed text-ink-400">
        Access is controlled by <code>public.platform_admins</code> and enforced in the database, not by this
        page. Add or remove an admin with SQL; never with a mess role.
      </p>
    </div>
  )
}
