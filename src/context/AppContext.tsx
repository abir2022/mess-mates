import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getBackend, type Backend } from '../lib/backend'
import { computeSettlement, type Settlement } from '../lib/calc'
import type { MonthlyCycle, Profile, Workspace } from '../lib/types'

interface AppContextValue {
  backend: Backend
  user: Profile | null
  ws: Workspace | null
  settlement: Settlement | null
  cycle: MonthlyCycle | null
  cycleId: string | null
  ready: boolean
  busy: boolean
  error: string | null
  notice: string | null
  setCycleId: (id: string) => void
  setNotice: (message: string | null) => void
  clearError: () => void
  refresh: () => Promise<void>
  run: (action: () => Promise<unknown>, successMessage?: string) => Promise<boolean>
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string) => Promise<boolean>
  signInDemo: () => Promise<void>
  signOut: () => Promise<void>
  createMess: (name: string, currency: string) => Promise<boolean>
  joinMess: (code: string) => Promise<boolean>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const backend = useMemo<Backend>(() => getBackend(), [])
  const [user, setUser] = useState<Profile | null>(null)
  const [ws, setWs] = useState<Workspace | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [cycleId, setCycleId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const profile = await backend.currentUser()
    setUser(profile)
    if (!profile) {
      setWs(null)
      setCycleId(null)
      return
    }
    const next = await backend.loadWorkspace()
    setWs(next)
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
      const ok = await run(() => backend.joinMess(code), 'Welcome to the mess!')
      return ok
    },
    [backend, run],
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
    cycle,
    cycleId,
    ready,
    busy,
    error,
    notice,
    setCycleId,
    setNotice,
    clearError: () => setError(null),
    refresh,
    run,
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
