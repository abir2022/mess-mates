import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight, LoaderCircle, MousePointer2, X } from 'lucide-react'
import { useI18n } from '../../lib/i18n'
import { SCENE_COPY, type SceneStage } from './sceneCopy'
import type { CharacterId, HostelSceneHandle } from './corridorScene'

type SceneStatus = 'loading' | 'ready' | 'fallback'

const STAGE_POINTS = [0.06, 0.31, 0.56, 0.92]

function canUseWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function stageFor(progress: number): SceneStage {
  if (progress < 0.22) return 0
  if (progress < 0.48) return 1
  if (progress < 0.7) return 2
  return 3
}

export function HostelScene() {
  const { lang } = useI18n()
  const copy = SCENE_COPY[lang]

  const trackRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<HostelSceneHandle | null>(null)
  const progressRef = useRef(0)
  const stageRef = useRef<SceneStage>(0)
  const selectedRef = useRef<CharacterId | null>(null)
  const visibleRef = useRef(true)

  const [status, setStatus] = useState<SceneStatus>('loading')
  const [reduced, setReduced] = useState(false)
  const [stage, setStage] = useState<SceneStage>(0)
  const [selected, setSelected] = useState<CharacterId | null>(null)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(query.matches)
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    selectedRef.current = selected
    sceneRef.current?.setSelected(selected)
  }, [selected])

  useEffect(() => {
    if (!reduced) return
    setStatus('fallback')
  }, [reduced])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const update = () => {
      const rect = track.getBoundingClientRect()
      const travel = Math.max(1, rect.height - window.innerHeight)
      const progress = Math.min(1, Math.max(0, -rect.top / travel))
      progressRef.current = progress
      sceneRef.current?.setProgress(progress)

      const bar = track.querySelector<HTMLElement>('[data-corridor-progress]')
      if (bar) bar.style.transform = `scaleX(${progress})`

      const next = stageFor(progress)
      if (next !== stageRef.current) {
        stageRef.current = next
        setStage(next)
      }
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting
        sceneRef.current?.setActive(entry.isIntersecting)
      },
      { rootMargin: '140px' },
    )
    observer.observe(track)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (reduced) return
    const canvas = canvasRef.current
    if (!canvas) return
    if (!canUseWebGL()) {
      setStatus('fallback')
      return
    }

    let cancelled = false
    let handle: HostelSceneHandle | undefined
    setStatus('loading')

    void import('./corridorScene')
      .then(({ createHostelScene }) => {
        if (cancelled) return
        handle = createHostelScene(canvas, { onSelect: (id) => setSelected(id) })
        sceneRef.current = handle
        handle.setProgress(progressRef.current)
        handle.setSelected(selectedRef.current)
        handle.setActive(visibleRef.current)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('fallback')
      })

    return () => {
      cancelled = true
      handle?.dispose()
      sceneRef.current = null
    }
  }, [reduced])

  const select = (id: CharacterId) => {
    setSelected((current) => (current === id ? null : id))
  }

  const jumpToStage = (index: number) => {
    const track = trackRef.current
    if (!track) return
    const top = track.getBoundingClientRect().top + window.scrollY
    const travel = Math.max(1, track.offsetHeight - window.innerHeight)
    window.scrollTo({
      top: top + travel * STAGE_POINTS[index],
      behavior: reduced ? 'auto' : 'smooth',
    })
  }

  const activeStage = copy.stages[stage]
  const selectedCopy = selected ? copy.characters[selected] : null
  const fallback = reduced || status === 'fallback'

  return (
    <section
      ref={trackRef}
      id="corridor"
      aria-labelledby="corridor-title"
      className="hostel3d-track relative border-b-[3px] border-[var(--lp-line)] bg-[#071923] text-[#f6f0e2]"
    >
      <div className="hostel3d-sticky sticky top-[66px] h-[calc(100dvh-66px)] overflow-hidden">
        <img
          src="/landing/hero.jpg"
          alt=""
          width={1392}
          height={752}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            status === 'ready' ? 'opacity-0' : 'opacity-60'
          }`}
          loading="lazy"
          decoding="async"
          aria-hidden="true"
        />

        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${
            status === 'ready' ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
          hidden={fallback}
        />

        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(7,25,35,0.96) 0%, rgba(7,25,35,0.4) 38%, rgba(7,25,35,0.08) 70%), linear-gradient(0deg, rgba(7,25,35,0.98) 0%, rgba(7,25,35,0.55) 34%, rgba(7,25,35,0.05) 65%, rgba(7,25,35,0.8) 100%)',
          }}
          aria-hidden="true"
        />
        <div className="comic-halftone pointer-events-none absolute inset-0 opacity-[0.08]" aria-hidden="true" />

        <div className="pointer-events-none relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-between gap-3 px-3 py-4 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#70dbc6] sm:text-[10px]">
              <span className="h-2 w-2 rounded-full bg-[#fb5d12]" />
              {copy.eyebrow}
            </p>
            <span className="inline-flex items-center gap-1.5 border-[2px] border-[#f6f0e2]/35 bg-[#071923]/70 px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-[#f6f0e2]">
              {status === 'loading' ? (
                <>
                  <LoaderCircle className="h-3 w-3 animate-spin text-[#f2b544]" /> {copy.loading}
                </>
              ) : (
                <>
                  <MousePointer2 className="h-3 w-3 text-[#f2b544]" /> {copy.badge}
                </>
              )}
            </span>
          </div>

          <div className="flex flex-1 items-end">
            <div className="pointer-events-auto w-full max-w-md border-[3px] border-[#f6f0e2]/80 bg-[#071923]/88 p-3 shadow-[6px_6px_0_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#f2b544]">
                  {activeStage.kicker}
                </p>
                <span className="shrink-0 border-[2px] border-[#f6f0e2]/30 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-[#a4bbc9]">
                  {activeStage.label}
                </span>
              </div>
              <h2
                id="corridor-title"
                aria-live="polite"
                className="mt-1.5 text-2xl font-black leading-[0.98] tracking-[-0.04em] sm:text-3xl"
              >
                {activeStage.title}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[#d7e3e8]/80 sm:text-sm">{activeStage.body}</p>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {(['rafi', 'mim'] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={selected === id}
                    onClick={() => select(id)}
                    className={`min-h-9 border-[2px] px-2 py-1 text-[9px] font-black uppercase tracking-wide transition ${
                      selected === id
                        ? 'border-[#f2b544] bg-[#f2b544] text-[#0f2b3d]'
                        : 'border-[#f6f0e2]/35 bg-[#071923]/70 text-[#f6f0e2] hover:border-[#f2b544] hover:text-[#f2b544]'
                    }`}
                  >
                    {copy.meet} {copy.characters[id].name}
                  </button>
                ))}
                {stage === 3 || fallback ? (
                  <Link
                    to="/signin"
                    className="inline-flex min-h-9 items-center gap-1 border-[2px] border-[#0f2b3d] bg-[#f2b544] px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-[#0f2b3d] shadow-[3px_3px_0_#0f2b3d] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#0f2b3d]"
                  >
                    {copy.cta} <ArrowRight className="h-3 w-3" />
                  </Link>
                ) : null}
              </div>

              <p className="mt-2 text-[8px] font-semibold leading-relaxed text-[#a4bbc9]">
                {fallback ? copy.fallback : copy.hint}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden shrink-0 text-[8px] font-black uppercase tracking-[0.16em] text-[#a4bbc9] sm:inline">
              {copy.controls}
            </span>
            <div className="relative h-1.5 min-w-0 flex-1 overflow-hidden border border-[#f6f0e2]/30 bg-[#0f2b3d]">
              <span
                data-corridor-progress
                className="absolute inset-0 origin-left bg-[#f2b544]"
                style={{ transform: 'scaleX(0)' }}
              />
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {copy.stages.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => jumpToStage(index)}
                  aria-label={item.label}
                  aria-current={stage === index ? 'step' : undefined}
                  className={`h-2.5 border border-[#f6f0e2]/50 transition-[width,background-color] ${
                    stage === index ? 'w-6 bg-[#f2b544]' : 'w-2.5 bg-[#071923] hover:bg-[#f6f0e2]/60'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => document.getElementById('story')?.scrollIntoView({ block: 'start' })}
              className="hidden shrink-0 items-center gap-1 text-[8px] font-black uppercase tracking-wide text-[#a4bbc9] transition hover:text-[#f6f0e2] sm:inline-flex"
            >
              {copy.skip} <ArrowDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        {selectedCopy ? (
          <div
            role="status"
            className="absolute right-3 top-16 z-20 w-[min(19rem,calc(100vw-1.5rem))] border-[3px] border-[#f2b544] bg-[#071923]/95 p-3 text-[#f6f0e2] shadow-[6px_6px_0_rgba(0,0,0,0.4)] sm:right-6 sm:top-20"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#f2b544]">
                  {selectedCopy.role}
                </p>
                <p className="mt-0.5 text-sm font-black">{selectedCopy.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label={copy.clear}
                className="flex h-8 w-8 items-center justify-center border-[2px] border-[#f6f0e2]/40 text-[#f6f0e2] transition hover:bg-[#f6f0e2] hover:text-[#0f2b3d]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-[#d7e3e8]">“{selectedCopy.line}”</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
