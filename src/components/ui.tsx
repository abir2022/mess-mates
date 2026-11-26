import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Check, Copy, Loader2, Minus, Plus, Share2, X } from 'lucide-react'
import { frameRing } from '../lib/backend'
import { formatMeals, initials } from '../lib/format'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-[0_8px_20px_-10px_rgba(12,130,121,0.8)] hover:bg-brand-700 focus-visible:ring-brand-400',
  secondary: 'bg-white text-ink-700 border border-ink-200 hover:border-brand-300 hover:bg-brand-50 focus-visible:ring-brand-300',
  ghost: 'bg-transparent text-ink-600 hover:bg-ink-100 focus-visible:ring-ink-300',
  danger: 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 focus-visible:ring-rose-300',
  gold: 'bg-gradient-to-r from-amber-400 to-flame-500 text-ink-900 shadow-[0_10px_24px_-12px_rgba(251,93,18,0.8)] hover:brightness-105 focus-visible:ring-amber-300',
}

const sizes: Record<Size, string> = {
  sm: 'text-xs px-3 py-2 gap-1.5 rounded-lg min-h-11 sm:min-h-9',
  md: 'text-sm px-4 py-2.5 gap-2 rounded-xl min-h-11',
  lg: 'text-sm px-5 py-3 gap-2 rounded-xl min-h-12',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      className={`inline-flex select-none items-center justify-center font-semibold transition active:scale-[0.985] focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={rest.disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  )
}

export function IconButton({
  label,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-800 active:bg-ink-200 disabled:opacity-40 max-md:h-11 max-md:w-11 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeRef = useRef(onClose)
  // Keep the latest close handler without writing a ref during render.
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  // Escape, body scroll lock and a focus trap. Opening moves focus into the
  // sheet; Tab cycles inside it; closing sends focus back to whatever opened
  // it, so keyboard users never fall behind an overlay.
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'

    const node = dialogRef.current
    const first = node?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? node)?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (item) => item.offsetParent !== null,
      )
      if (items.length === 0) return
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`animate-sheet-up max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-white shadow-lift outline-none sm:animate-fade-up sm:rounded-3xl ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
        }`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-ink-100 bg-white/95 px-5 pb-3 pt-2 backdrop-blur sm:py-4">
          <div className="min-w-0">
            <span className="mx-auto mb-2 block h-1.5 w-10 rounded-full bg-ink-200 sm:hidden" />
            <h2 className="text-base font-extrabold text-ink-900">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p> : null}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mr-1 -mt-1">
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? (
          <div className="sheet-safe sticky bottom-0 border-t border-ink-100 bg-white px-5 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  )
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string; icon?: ReactNode }[]
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto rounded-xl bg-ink-100/70 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex min-h-11 min-w-11 flex-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition active:scale-[0.98] max-sm:[&_svg]:hidden sm:min-h-9 sm:flex-1 sm:px-3.5 ${
            value === tab.id ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function Avatar({
  name,
  url,
  frame = 'ring',
  size = 'md',
  className = '',
}: {
  name: string
  url?: string | null
  frame?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}) {
  const dims = {
    xs: 'h-7 w-7 text-[10px]',
    sm: 'h-9 w-9 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-14 w-14 text-base',
  }[size]
  const palette = ['bg-brand-600', 'bg-flame-500', 'bg-indigo-500', 'bg-emerald-600', 'bg-rose-500', 'bg-amber-500']
  const hash = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const color = palette[hash % palette.length]

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`shrink-0 rounded-full object-cover ring-2 ring-offset-2 ${frameRing(frame)} ${dims} ${className}`}
      />
    )
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-offset-2 ${color} ${frameRing(frame)} ${dims} ${className}`}
    >
      {initials(name)}
    </span>
  )
}

export function ProgressBar({
  value,
  total,
  tone = 'brand',
}: {
  value: number
  total: number
  tone?: 'brand' | 'flame' | 'emerald'
}) {
  const pct = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0
  const bar = {
    brand: 'bg-brand-500',
    flame: 'bg-flame-500',
    emerald: 'bg-emerald-500',
  }[tone]
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
      <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 8,
  disabled = false,
}: {
  value: number
  onChange: (next: number) => void
  step?: number
  min?: number
  max?: number
  disabled?: boolean
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next * 2) / 2))
  return (
    <div className={`inline-flex items-center gap-1 rounded-lg border border-ink-200 bg-white p-0.5 ${disabled ? 'opacity-50' : ''}`}>
      <button
        type="button"
        aria-label="Decrease"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - step))}
        className="flex h-9 w-9 items-center justify-center rounded-md text-ink-500 transition hover:bg-ink-100 active:bg-ink-200 disabled:opacity-30 max-md:h-11 max-md:w-11"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-8 text-center text-sm font-bold tabular-nums text-ink-800">
        {formatMeals(value)}
      </span>
      <button
        type="button"
        aria-label="Increase"
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + step))}
        className="flex h-9 w-9 items-center justify-center rounded-md text-ink-500 transition hover:bg-ink-100 active:bg-ink-200 disabled:opacity-30 max-md:h-11 max-md:w-11"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        } catch {
          setCopied(false)
        }
      }}
      className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-bold text-brand-700 transition hover:bg-brand-50 sm:min-h-0"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : label}
    </button>
  )
}

/**
 * Invites on a phone should go through the OS share sheet (WhatsApp, Messenger,
 * SMS) instead of copy-paste; desktop browsers fall back to the clipboard.
 */
export function ShareButton({
  title,
  text,
  label,
  className = '',
}: {
  title: string
  text: string
  label: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          try {
            await navigator.share({ title, text })
          } catch {
            // The user closed the sheet; there is nothing to report.
          }
          return
        }
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        } catch {
          setCopied(false)
        }
      }}
      className={`inline-flex min-h-11 items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-bold text-brand-700 transition hover:bg-brand-50 sm:min-h-9 ${className}`}
    >
      {copied ? <Check className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
      {copied ? 'Copied' : label}
    </button>
  )
}

export function EmptyState({ icon, title, body }: { icon: ReactNode; title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 px-4 py-10 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-ink-400">{icon}</div>
      <p className="text-sm font-semibold text-ink-700">{title}</p>
      {body ? <p className="mt-1 max-w-xs text-xs text-ink-500">{body}</p> : null}
    </div>
  )
}

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'brand' | 'success' | 'warn' | 'danger' | 'gold'
}) {
  const tones = {
    neutral: 'bg-ink-100 text-ink-600',
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-emerald-50 text-emerald-700',
    warn: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-600',
    gold: 'bg-gradient-to-r from-amber-100 to-flame-100 text-flame-700',
  }
  return <span className={`chip ${tones[tone]}`}>{children}</span>
}

export function SectionHeading({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold leading-snug text-ink-900">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-ink-500">{hint}</p> : null}
      </div>
      {action}
    </div>
  )
}
