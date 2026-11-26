import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { reportClientError } from '../lib/telemetry'

interface Props {
  children: ReactNode
  /** Inline recovery keeps the sidebar and bottom bar usable. */
  compact?: boolean
  /** Changing this (the route) clears a previous crash. */
  resetKey?: string
}

interface State {
  error: Error | null
}

/** Catches render errors so a crash shows a recoverable screen instead of a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Mess Mates crashed:', error, info.componentStack)
    // Lands in the mess's own client_errors table, readable by its admin.
    reportClientError({ message: error.message, stack: error.stack, componentStack: info.componentStack ?? undefined })
  }

  componentDidUpdate(previous: Props) {
    // Navigating away from a broken screen should not leave it stuck on the
    // error card; the next route gets a clean render.
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    if (this.props.compact) {
      return (
        <div className="card p-5 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h1 className="mt-3 text-base font-extrabold text-ink-900">This screen hit a problem</h1>
          <p className="mt-1 text-xs leading-relaxed text-ink-500">
            Nothing was lost, and the rest of the app still works. Try this screen again or move to
            another tab.
          </p>
          <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-left font-mono text-[10px] text-ink-500">
            {error.message || 'Unknown error'}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => this.setState({ error: null })}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-bold text-ink-700 hover:border-brand-300"
            >
              Reload app
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 p-6">
        <div className="card w-full max-w-md p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-extrabold text-ink-900">Something broke on this screen</h1>
          <p className="mt-1 text-xs leading-relaxed text-ink-500">
            Your data is safe — nothing was lost. Reload to pick up where you left off, and if it keeps happening send
            this message to your mess admin.
          </p>
          <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-left text-[10px] font-mono text-ink-500">
            {error.message || 'Unknown error'}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reload app
            </button>
            <button
              onClick={() => this.setState({ error: null })}
              className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-bold text-ink-700 hover:border-brand-300"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }
}
