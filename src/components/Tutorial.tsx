import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { CAST_IMG, TOURS, type TourId } from '../lib/tour'
import { SCENE_COPY } from '../pages/landing/sceneCopy'

const CARD_W = 360

/**
 * A spotlight tour rather than a modal carousel: the real screen stays visible,
 * the current target is cut out of the dimmer, and one of the two hostel
 * characters explains it in a speech card. Anchors are `data-tour="…"`.
 */
export function Tutorial({ id, open, onClose }: { id: TourId; open: boolean; onClose: () => void }) {
  const { t, lang } = useI18n()
  const steps = TOURS[id][lang]
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [desktop, setDesktop] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)

  const total = steps.length
  const step = steps[Math.min(index, total - 1)]

  useEffect(() => {
    if (open) setIndex(0)
  }, [open, id])

  // A window resize (or rotation) is the one event that can leave the card on
  // stale desktop coordinates; the mobile sheet is also pinned in CSS as a
  // second safety net.
  useEffect(() => {
    const sync = () => setDesktop(window.innerWidth >= 768)
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  const measure = useCallback(() => {
    const anchor = steps[index]?.anchor
    const node = anchor ? document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`) : null
    setRect(node ? node.getBoundingClientRect() : null)
  }, [index, steps])

  // Each step scrolls its target into view, then measures once the smooth
  // scroll has settled; scrolling and resizing keep the cut-out aligned.
  useEffect(() => {
    if (!open) return
    const anchor = steps[index]?.anchor
    const node = anchor ? document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`) : null
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    node?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
    measure()
    const timers = [window.setTimeout(measure, 120), window.setTimeout(measure, 420)]
    return () => timers.forEach(window.clearTimeout)
  }, [open, index, measure, steps])

  useEffect(() => {
    if (!open) return
    const sync = () => measure()
    window.addEventListener('resize', sync)
    window.addEventListener('scroll', sync, true)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('scroll', sync, true)
    }
  }, [open, measure])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      else if (event.key === 'ArrowRight') setIndex((current) => (current + 1 < total ? current + 1 : current))
      else if (event.key === 'ArrowLeft') setIndex((current) => Math.max(0, current - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, total])

  useEffect(() => {
    if (open) cardRef.current?.focus()
  }, [open, index])

  useLayoutEffect(() => {
    if (!desktop) {
      setPos(null)
      return
    }
    const width = Math.min(CARD_W, window.innerWidth - 32)
    const height = cardRef.current?.offsetHeight ?? 240
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (!rect) {
      setPos({ top: Math.max(16, (vh - height) / 2), left: (vw - width) / 2, width })
      return
    }
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - width / 2), vw - width - 16)
    const top =
      rect.bottom + 16 + height < vh - 16
        ? rect.bottom + 16
        : Math.max(16, Math.min(rect.top - height - 16, vh - height - 16))
    setPos({ top, left, width })
  }, [desktop, rect, index])

  if (!open || !step) return null

  const cast = SCENE_COPY[lang].characters[step.who]
  const last = index === total - 1
  const ringStyle: CSSProperties | undefined = rect
    ? {
        top: rect.top - 6,
        left: rect.left - 6,
        width: rect.width + 12,
        height: rect.height + 12,
        borderRadius: 20,
      }
    : undefined

  return (
    <>
      {rect ? <div className="tour-ring" style={ringStyle} aria-hidden="true" /> : null}
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t('tour.title')}
        className="tour-card"
        style={desktop && pos ? { top: pos.top, left: pos.left, width: pos.width } : undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="hud-kicker">
            {t('tour.title')} · {t('tour.step', { current: index + 1, total })}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('tour.skip')}
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 flex items-start gap-2.5">
          <img
            src={CAST_IMG[step.who]}
            alt={cast.name}
            className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-brand-300/60"
          />
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand-700">
              {cast.name} · {cast.role}
            </p>
            <p className="mt-0.5 text-sm font-extrabold leading-snug text-ink-900">{step.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-600">{step.body}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-ink-100 pt-3">
          <div className="flex items-center gap-1" aria-hidden="true">
            {steps.map((_, dot) => (
              <span
                key={dot}
                className={`h-1.5 rounded-full transition-all ${
                  dot === index ? 'w-5 bg-brand-600' : dot < index ? 'w-1.5 bg-brand-300' : 'w-1.5 bg-ink-200'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {index > 0 ? (
              <button
                type="button"
                onClick={() => setIndex(index - 1)}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-[11px] font-bold text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> {t('tour.back')}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-9 items-center rounded-lg px-2.5 text-[11px] font-bold text-ink-400 transition hover:text-ink-700"
              >
                {t('tour.skip')}
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? onClose() : setIndex(index + 1))}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-brand-600 px-3 text-[11px] font-bold text-white transition hover:bg-brand-700"
            >
              {last ? t('tour.done') : t('tour.next')}
              {last ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

