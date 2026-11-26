import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getBackend, type Backend } from '../lib/backend'
import { computeSettlement, type Settlement } from '../lib/calc'
import { t } from '../lib/i18n'
import { outbox } from '../lib/outbox'
import type { CycleTotals, DailyMeal, LiveChange, MessMessage, MonthlyCycle, Profile, Workspace } from '../lib/types'

interface AppContextValue {
  backend: Backend
  user: Profile | null
  ws: Workspace | null
  settlement: Settlement | null
  /** Server-side totals for the cycle; falls back to the client calculation. */
  totals: CycleTotals | null
  cycle: MonthlyCycle | null
  cycleId: string | null
  ready: boolean
  busy: boolean
  online: boolean
  pending: number
  error: string | null
  notice: string | null
  setCycleId: (id: string) => void
  setNotice: (message: string | null) => void
  clearError: () => void
  refresh: () => Promise<void>
  run: (action: () => Promise<unknown>, successMessage?: string) => Promise<boolean>
  syncNow: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string) => Promise<boolean>
  signInDemo: () => Promise<void>
  signOut: () => Promise<void>
  createMess: (name: string, currency: string) => Promise<boolean>
  joinMess: (code: string) => Promise<'joined' | 'requested' | null>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const backend = useMemo<Backend>(() => getBackend(), [])
  const [user, setUser] = useState<Profile | null>(null)
  const [ws, setWs] = useState<Workspace | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const [pending, setPending] = useState(() => outbox.count())
  const [cycleId, setCycleId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [totals, setTotals] = useState<CycleTotals | null>(null)

  const refresh = useCallback(async () => {
    const profile = await backend.currentUser()
    setUser(profile)
    if (!profile) {
      setWs(null)
      setCycleId(null)
      return
    }
    const next = await backend.loadWorkspace()
    // A workspace cached by an older build predates settlements and join requests.
    setWs(
      next
        ? { ...next, settlements: next.settlements ?? [], joinRequests: next.joinRequests ?? [] }
        : null,
    )
    if (next) {
      setCycleId((current) => {
        if (current && next.cycles.some((cycle) => cycle.id === current)) return current
        const open = next.cycles.find((cycle) => cycle.status === 'open')
        return open?.id ?? next.cycles[0]?.id ?? null
      })
    }
  }, [backend])

  useEffect(() => {
    refresh()
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load your mess'))
      .finally(() => setReady(true))
  }, [refresh])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 3600)
    return () => clearTimeout(timer)
  }, [notice])

  // Server totals for the headline cards. The client settlement is still the
  // source for per-member maths; this only keeps the dashboard honest when a
  // large mess would otherwise re-add every row in the browser.
  useEffect(() => {
    if (!cycleId) {
      setTotals(null)
      return
    }
    let cancelled = false
    backend
      .loadCycleTotals(cycleId)
      .then((next) => {
        if (cancelled) return
        setTotals(next)
      })
      .catch(() => {
        if (!cancelled) setTotals(null)
      })
    return () => {
      cancelled = true
    }
    // Chat merges replace only `messages`, so the totals query does not run for
    // every new message; a meal, bazar, utility or deposit change does.
  }, [backend, cycleId, ws?.meals, ws?.bazar, ws?.utilities, ws?.deposits])

  // Live updates: chat and meal rows are merged into the workspace as they
  // arrive, so the noisiest events no longer refetch every table. Everything
  // else (money, governance, games) still takes the debounced reload, and a
  // hidden tab holds the reload until it is visible again.
  const userId = user?.id ?? null
  useEffect(() => {
    if (!userId) return
    let timer: ReturnType<typeof setTimeout> | null = null
    let dirty = false

    const reload = () => {
      if (document.hidden) {
        dirty = true
        return
      }
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        refresh().catch(() => undefined)
      }, 600)
    }

    const merge = <T extends { id: string }>(rows: T[], change: LiveChange): T[] => {
      const row = change.row as T | null
      const id = row?.id ?? (change.oldRow?.id as string | undefined)
      if (!id) return rows
      if (change.eventType === 'DELETE') return rows.filter((entry) => entry.id !== id)
      if (!row) return rows
      return rows.some((entry) => entry.id === id)
        ? rows.map((entry) => (entry.id === id ? { ...entry, ...row } : entry))
        : [...rows, row]
    }

    const unsubscribe = backend.subscribe((change) => {
      if (change.table === 'mess_messages') {
        setWs((current) =>
          current ? { ...current, messages: merge<MessMessage>(current.messages, change) } : current,
        )
        return
      }
      if (change.table === 'daily_meals') {
        setWs((current) =>
          current ? { ...current, meals: merge<DailyMeal>(current.meals, change) } : current,
        )
        return
      }
      reload()
    })

    const onVisible = () => {
      if (document.hidden || !dirty) return
      dirty = false
      refresh().catch(() => undefined)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      unsubscribe()
    }
  }, [backend, refresh, userId])

  const syncNow = useCallback(async () => {
    if (outbox.count() === 0) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('You are offline. Queued changes will sync when the connection is back.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await outbox.flush()
      await refresh()
      if (result.remaining > 0) {
        setError(outbox.lastError() ?? 'Some changes could not sync yet. Please try again.')
      } else if (result.synced > 0) {
        setNotice(`${result.synced} queued change${result.synced === 1 ? '' : 's'} synced.`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sync your changes.')
    } finally {
      setBusy(false)
      setPending(outbox.count())
    }
  }, [refresh])

  useEffect(() => outbox.subscribe(() => setPending(outbox.count())), [])

  useEffect(() => {
    const goOnline = () => {
      setOnline(true)
      setPending(outbox.count())
      if (outbox.count() > 0) void syncNow()
    }
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [syncNow])

  const run = useCallback(
    async (action: () => Promise<unknown>, successMessage?: string) => {
      setBusy(true)
      setError(null)
      try {
        await action()
        await refresh()
        if (successMessage) setNotice(successMessage)
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
        return false
      } finally {
        setBusy(false)
      }
    },
    [refresh],
  )

  const signInWithGoogle = useCallback(async () => {
    setError(null)
    try {
      await backend.signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
    }
  }, [backend])

  const signInWithEmail = useCallback(
    async (email: string) => {
      setBusy(true)
      setError(null)
      try {
        await backend.signInWithEmail(email)
        setNotice('Magic link sent — check your inbox to finish signing in.')
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not send the magic link')
        return false
      } finally {
        setBusy(false)
      }
    },
    [backend],
  )

  const signInDemo = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      await backend.signInDemo()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo mode is unavailable')
    } finally {
      setBusy(false)
    }
  }, [backend, refresh])

  const signOut = useCallback(async () => {
    setBusy(true)
    try {
      await backend.signOut()
      setUser(null)
      setWs(null)
      setCycleId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign out')
    } finally {
      setBusy(false)
    }
  }, [backend])

  const createMess = useCallback(
    async (name: string, currency: string) => {
      const ok = await run(() => backend.createMess(name, currency), 'Mess created — invite your mates!')
      return ok
    },
    [backend, run],
  )

  const joinMess = useCallback(
    async (code: string) => {
      setBusy(true)
      setError(null)
      try {
        const result = await backend.joinMess(code)
        await refresh()
        setNotice(result === 'requested' ? t('auth.joinRequested') : 'Welcome to the mess!')
        return result
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not join this mess.')
        return null
      } finally {
        setBusy(false)
      }
    },
    [backend, refresh],
  )

  const cycle = useMemo(
    () => ws?.cycles.find((entry) => entry.id === cycleId) ?? ws?.cycles[0] ?? null,
    [ws, cycleId],
  )

  const settlement = useMemo(
    () => (ws && cycle ? computeSettlement(ws, cycle.id) : null),
    [ws, cycle],
  )

  const value: AppContextValue = {
    backend,
    user,
    ws,
    settlement,
    totals,
    cycle,
    cycleId,
    ready,
    busy,
    online,
    pending,
    error,
    notice,
    setCycleId,
    setNotice,
    clearError: () => setError(null),
    refresh,
    run,
    syncNow,
    signInWithGoogle,
    signInWithEmail,
    signInDemo,
    signOut,
    createMess,
    joinMess,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}
