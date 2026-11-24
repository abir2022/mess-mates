import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { outbox } from './outbox'

/**
 * Vendor-free error reporting.
 *
 * Crashes go to the `client_errors` table in the same Supabase project the app
 * already uses (007_governance.sql), so there is no third-party account, DSN or
 * cookie to manage. Reporting is best-effort: a failure to report must never
 * become a second error, so every call swallows its own problems.
 *
 * What is stored: message, stack, route, user agent and app version. No form
 * values, no tokens, no local storage dumps. Five reports per session, and the
 * same message is only sent once, so a render loop cannot flood the table.
 */

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

const MAX_PER_SESSION = 5
const seen = new Set<string>()
let sent = 0
let client: SupabaseClient | null = null

function getClient(): SupabaseClient | null {
  if (!url || !key) return null
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  }
  return client
}

function trim(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value
}

export interface ErrorReport {
  message: string
  stack?: string
  route?: string
  /** React's component stack, folded into `stack`. */
  componentStack?: string
}

export function reportClientError(input: ErrorReport): void {
  try {
    const message = trim(String(input.message || 'Unknown error'), 500)
    const fingerprint = `${message}@${typeof window === 'undefined' ? '' : window.location.hash}`
    if (seen.has(fingerprint) || sent >= MAX_PER_SESSION) return
    seen.add(fingerprint)

    const supabase = getClient()
    if (!supabase) return

    sent += 1
    const workspace = outbox.cachedWorkspace()
    const stack = [input.stack ?? '', input.componentStack ?? ''].filter(Boolean).join('\n\n')

    void (async () => {
      let userId: string | null = null
      try {
        const { data } = await supabase.auth.getUser()
        userId = data.user?.id ?? null
      } catch {
        // A signed-out crash still gets logged.
      }

      try {
        await supabase.from('client_errors').insert({
          user_id: userId,
          mess_id: workspace?.mess.id ?? null,
          message,
          stack: trim(stack, 4000),
          route: trim(typeof window === 'undefined' ? '' : window.location.hash.slice(0, 200), 300),
          user_agent: trim(typeof navigator === 'undefined' ? '' : navigator.userAgent, 300),
          app_version: trim(import.meta.env.VITE_APP_VERSION ?? '1.0.0', 40),
        })
      } catch {
        // Reporting is a courtesy; never let it break the app.
      }
    })()
  } catch {
    // Nothing here may throw.
  }
}

/** Catches the two failures a React error boundary never sees. */
export function installErrorReporting(): () => void {
  if (typeof window === 'undefined') return () => undefined

  const onError = (event: ErrorEvent) => {
    reportClientError({
      message: event.message || 'Unhandled error',
      stack: event.error instanceof Error ? event.error.stack : undefined,
    })
  }

  const onRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason
    reportClientError({
      message: reason instanceof Error ? reason.message : String(reason ?? 'Unhandled rejection'),
      stack: reason instanceof Error ? reason.stack : undefined,
    })
  }

  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
  }
}
