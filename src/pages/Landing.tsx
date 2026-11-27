import { Fragment, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Check,
  ChefHat,
  ClipboardList,
  Code2,
  Crown,
  Dice5,
  FileDown,
  Gamepad2,
  Languages,
  Megaphone,
  Minus,
  Plus,
  Receipt,
  ShieldCheck,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Stethoscope,
  Trophy,
  Users,
  UtensilsCrossed,
  Wallet,
  WifiOff,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../lib/i18n'
import { localDigits, money } from '../lib/format'
import { LanguageToggle } from '../components/LanguageToggle'
import { ThemeToggle } from '../components/ThemeToggle'
import { COPY, type CharacterIcon, type LandingCopy } from './landing/copy'
import { HostelScene } from './landing/HostelScene'

const BTN =
  'inline-flex min-h-11 items-center justify-center gap-2 border-[3px] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#f2b544]/60 disabled:cursor-not-allowed disabled:opacity-60'

const BTN_GOLD = `${BTN} border-[#0f2b3d] bg-[#f2b544] text-[#0f2b3d] shadow-[5px_5px_0_#0f2b3d] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[4px_4px_0_#0f2b3d]`
const BTN_CREAM = `${BTN} border-[#f6f0e2] bg-transparent text-[#f6f0e2] hover:bg-[#f6f0e2] hover:text-[#0f2b3d]`
const BTN_DARK = `${BTN} border-[var(--lp-line)] bg-[var(--lp-ink)] text-[var(--lp-paper)] shadow-[5px_5px_0_var(--lp-shadow)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[4px_4px_0_var(--lp-shadow)]`

const FEATURE_ICONS = [BarChart3, ShieldCheck, Wallet, Users, WifiOff, Languages]
const HOW_ICONS = [Users, UtensilsCrossed, FileDown]

const CHARACTER_ICONS: Record<CharacterIcon, typeof Gamepad2> = {
  gamepad: Gamepad2,
  basket: ShoppingBasket,
  clipboard: ClipboardList,
  chef: ChefHat,
  trophy: Trophy,
  stethoscope: Stethoscope,
  megaphone: Megaphone,
  code: Code2,
}

type ChapterCopy = Pick<
  LandingCopy['bazar'],
  'id' | 'level' | 'kicker' | 'title' | 'body' | 'quote' | 'image' | 'alt'
>

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ block: 'start' })
}

function ComicCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`border-[3px] border-[var(--lp-line)] bg-[var(--lp-panel)] text-[var(--lp-ink)] shadow-[6px_6px_0_var(--lp-shadow)] ${className}`}
    >
      {children}
    </div>
  )
}

function CardHead({ label, title, hint }: { label: string; title: string; hint: string }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[var(--lp-flame)]">{label}</p>
      <h3 className="mt-1 text-base font-black leading-tight">{title}</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--lp-muted)]">{hint}</p>
    </div>
  )
}

function HeroLedger({ copy }: { copy: LandingCopy }) {
  const ledger = copy.hero.ledger
  return (
    <div className="relative hidden lg:block">
      <div className="absolute -inset-3 rotate-3 border-[3px] border-[#f2b544]/35" aria-hidden="true" />
      <div className="relative rotate-2 border-[3px] border-[#071923] bg-[#fffaf0] p-5 text-[#0f2b3d] shadow-[12px_12px_0_rgba(0,0,0,0.4)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#577a8f]">{ledger.label}</p>
            <p className="mt-1 text-sm font-black">{ledger.mess}</p>
          </div>
          <span className="inline-flex items-center gap-1 border-[2px] border-[#0f2b3d] bg-[#d1f7ec] px-2 py-1 text-[9px] font-black uppercase tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0c8279]" />
            {ledger.live}
          </span>
        </div>

        <div className="mt-4 border-[3px] border-[#0f2b3d] bg-[#0f2b3d] p-4 text-[#f6f0e2]">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#a6ecdb]">{ledger.rate}</p>
          <p className="mt-1 text-4xl font-black tabular-nums leading-none tracking-[-0.04em]">{ledger.rateValue}</p>
          <p className="mt-1 text-[10px] text-[#a4bbc9]">{ledger.perMeal}</p>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            { label: ledger.meals, value: ledger.mealsValue },
            { label: ledger.bazar, value: ledger.bazarValue },
            { label: ledger.settled, value: ledger.settledValue },
          ].map((item) => (
            <div key={item.label} className="border-[2px] border-[#0f2b3d]/20 bg-[#f4f7f9] px-2 py-2">
              <p className="text-[8px] font-black uppercase tracking-wide text-[#577a8f]">{item.label}</p>
              <p className="mt-0.5 text-xs font-black tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 border-[2px] border-[#0f2b3d]/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#577a8f]">{ledger.balance}</p>
            <Wallet className="h-3.5 w-3.5 text-[#7695a8]" />
          </div>
          <p className="mt-1 text-xl font-black tabular-nums text-[#0c8279]">{ledger.balanceValue}</p>
          <p className="text-[9px] text-[#577a8f]">{ledger.balanceNote}</p>
        </div>

        <p className="mt-3 text-[9px] font-semibold text-[#577a8f]">{ledger.formula}</p>
      </div>
    </div>
  )
}

function Header({ copy }: { copy: LandingCopy }) {
  const nav = [
    { id: 'story', label: copy.nav.story },
    { id: 'features', label: copy.nav.features },
    { id: 'how', label: copy.nav.how },
    { id: 'pricing', label: copy.nav.pricing },
  ]
  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-[var(--lp-line)] bg-[var(--lp-paper)]">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="Mess Mates home">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center border-[3px] border-[var(--lp-line)] bg-[#f2b544] p-0.5 shadow-[3px_3px_0_var(--lp-shadow)]">
            <img src="/logo.png" alt="" className="h-full w-full object-cover" />
          </span>
          <span className="min-w-0 leading-none">
            <span className="block truncate text-sm font-black uppercase tracking-[-0.02em] text-[var(--lp-ink)]">
              Mess Mates
            </span>
            <span className="mt-1 block truncate text-[8px] font-black uppercase tracking-[0.16em] text-[var(--lp-muted)]">
              Hostel Level 1
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Landing sections">
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--lp-muted)] transition hover:text-[var(--lp-flame)]"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          <ThemeToggle />
          <LanguageToggle compactOnMobile />
          <Link to="/signin" className="hidden text-[10px] font-black uppercase tracking-wide text-[var(--lp-muted)] md:inline">
            {copy.nav.signIn}
          </Link>
          <Link
            to="/signin"
            className="inline-flex min-h-11 items-center justify-center whitespace-nowrap border-[3px] border-[var(--lp-line)] bg-[#f2b544] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-[#0f2b3d] shadow-[3px_3px_0_var(--lp-shadow)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--lp-shadow)]"
          >
            <span className="sm:hidden">{copy.nav.startShort}</span>
            <span className="hidden sm:inline">{copy.nav.start}</span>
          </Link>
        </div>
      </div>
      <ScrollProgress />
    </header>
  )
}

function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      if (ref.current) ref.current.style.transform = `scaleX(${progress})`
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="absolute bottom-0 left-0 h-[3px] w-full origin-left bg-[var(--lp-flame)]"
      style={{ transform: 'scaleX(0)' }}
    />
  )
}

function Hero({ copy, onDemo, busy }: { copy: LandingCopy; onDemo: () => void; busy: boolean }) {
  const { backend } = useApp()
  return (
    <section className="relative isolate overflow-hidden bg-[#071923] text-[#f6f0e2]">
      <img
        src="/landing/hero.jpg"
        alt={copy.hero.imageAlt}
        width={1392}
        height={752}
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
        decoding="async"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, #071923 0%, rgba(7,25,35,0.94) 38%, rgba(7,25,35,0.55) 68%, rgba(7,25,35,0.14) 100%)',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(0deg, rgba(7,25,35,0.96) 0%, transparent 48%)' }}
        aria-hidden="true"
      />
      <div className="comic-halftone absolute inset-0 opacity-[0.09]" aria-hidden="true" />

      <div className="relative z-10 mx-auto grid min-h-[90dvh] max-w-6xl items-center gap-10 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:pb-16">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#70dbc6]">
            <span className="h-2 w-2 rounded-full bg-[#fb5d12]" />
            {copy.hero.eyebrow}
          </p>

          <h1
            id="hero-title"
            className="mt-4 text-[2.55rem] font-black uppercase leading-[0.94] tracking-[-0.05em] sm:text-6xl lg:text-[4.4rem]"
          >
            <span className="block text-[#f6f0e2]">{copy.hero.titleA}</span>
            <span className="mt-2 block text-[#f2b544]">{copy.hero.titleB}</span>
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-relaxed text-[#d7e3e8]/85 sm:text-base">{copy.hero.intro}</p>

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <Link to="/signin" className={BTN_GOLD}>
              {copy.hero.cta} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/signin" className={BTN_CREAM}>
              {copy.hero.join}
            </Link>
            {backend.mode === 'demo' ? (
              <button type="button" onClick={onDemo} disabled={busy} className={BTN_CREAM}>
                {copy.hero.demo}
              </button>
            ) : null}
          </div>

          <p className="mt-3 text-[10px] font-bold text-[#a4bbc9]">{copy.hero.note}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {copy.hero.badges.map((badge) => (
              <span
                key={badge}
                className="border-[2px] border-[#f6f0e2]/35 bg-[#071923]/55 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#f6f0e2]"
              >
                {badge}
              </span>
            ))}
          </div>

          <div className="mt-6 grid max-w-md grid-cols-3 gap-2 lg:hidden">
            {[
              { label: copy.hero.ledger.rate, value: copy.hero.ledger.rateValue },
              { label: copy.hero.ledger.meals, value: copy.hero.ledger.mealsValue },
              { label: copy.hero.ledger.settled, value: copy.hero.ledger.settledValue },
            ].map((item) => (
              <div key={item.label} className="border-[2px] border-[#f6f0e2]/25 bg-[#071923]/70 px-2 py-2">
                <p className="text-[8px] font-black uppercase tracking-wide text-[#a4bbc9]">{item.label}</p>
                <p className="mt-0.5 text-xs font-black tabular-nums text-[#f6f0e2]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <HeroLedger copy={copy} />
      </div>

      <button
        type="button"
        onClick={() => scrollToSection('corridor')}
        className="absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#a4bbc9] transition hover:text-[#f6f0e2] sm:flex"
      >
        {copy.hero.scroll} <ArrowDown className="h-3.5 w-3.5" />
      </button>
    </section>
  )
}

function StoryIntro({ copy }: { copy: LandingCopy }) {
  return (
    <section
      id="story"
      className="scroll-mt-24 border-b-[3px] border-[var(--lp-line)] bg-[#0b2230] px-4 py-9 text-[#f6f0e2] sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#70dbc6]">{copy.intro.label}</p>
          <h2 className="mt-2 text-2xl font-black leading-tight tracking-[-0.03em] sm:text-3xl">{copy.intro.title}</h2>
          <p className="mt-2 text-xs leading-relaxed text-[#a4bbc9] sm:text-sm">{copy.intro.body}</p>
        </div>
        <div className="flex shrink-0 gap-3">
          {copy.intro.stats.map((stat) => (
            <div key={stat.label} className="min-w-[4.4rem] border-[2px] border-[#f6f0e2]/25 px-3 py-2">
              <p className="text-2xl font-black leading-none text-[#f2b544]">{stat.value}</p>
              <p className="mt-1 text-[8px] font-black uppercase tracking-[0.16em] text-[#a4bbc9]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Chapter({
  chapter,
  index,
  reverse,
  tone = 'paper',
  children,
}: {
  chapter: ChapterCopy
  index: number
  reverse?: boolean
  tone?: 'paper' | 'soft' | 'ink'
  children: React.ReactNode
}) {
  const toneClass =
    tone === 'ink'
      ? 'bg-[#0b2230] text-[#f6f0e2]'
      : tone === 'soft'
        ? 'bg-[var(--lp-soft)] text-[var(--lp-ink)]'
        : 'bg-[var(--lp-paper)] text-[var(--lp-ink)]'
  const dark = tone === 'ink'
  return (
    <section id={chapter.id} className={`scroll-mt-24 border-b-[3px] border-[var(--lp-line)] ${toneClass}`}>
      <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-12 lg:py-20">
        <div className={`comic-halftone pointer-events-none absolute inset-0 opacity-[0.04] ${dark ? 'invert' : ''}`} aria-hidden="true" />
        <figure className={`comic-frame relative overflow-hidden bg-[#071923] ${reverse ? 'lg:order-2' : ''}`}>
          <img
            src={chapter.image}
            alt={chapter.alt}
            width={1392}
            height={752}
            className="aspect-[16/10] w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <figcaption className="absolute left-3 top-3 border-[2px] border-[#0f2b3d] bg-[#f2b544] px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#0f2b3d]">
            {chapter.level}
          </figcaption>
          <span className="absolute bottom-3 right-3 border-[2px] border-[#f6f0e2]/60 bg-[#071923]/80 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#f6f0e2]">
            {localDigits(index + 1)} / {localDigits(6)}
          </span>
        </figure>

        <div className={`relative ${reverse ? 'lg:order-1' : ''}`}>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--lp-flame)]">{chapter.kicker}</p>
          <h2 className="mt-2 text-3xl font-black leading-[0.98] tracking-[-0.04em] sm:text-4xl lg:text-5xl">
            {chapter.title}
          </h2>
          <p className={`mt-3 max-w-xl text-sm leading-relaxed ${dark ? 'text-[#a4bbc9]' : 'text-[var(--lp-muted)]'}`}>
            {chapter.body}
          </p>
          <p className="speech-bubble mt-5 inline-block border-[3px] border-[#0f2b3d] bg-[#f2b544] px-4 py-2 text-sm font-black leading-snug text-[#0f2b3d]">
            {chapter.quote}
          </p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </section>
  )
}

function BazarCard({ copy }: { copy: LandingCopy }) {
  const card = copy.bazar.card
  const [approved, setApproved] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(card.receipts.map((receipt) => [receipt.id, receipt.initial])),
  )
  const approvedTotal = card.receipts.filter((receipt) => approved[receipt.id]).reduce((sum, receipt) => sum + receipt.amount, 0)
  const pendingTotal = card.receipts.filter((receipt) => !approved[receipt.id]).reduce((sum, receipt) => sum + receipt.amount, 0)
  const mealRate = approvedTotal / 30

  return (
    <ComicCard className="p-4">
      <CardHead label={card.label} title={card.title} hint={card.hint} />
      <div className="mt-3 divide-y divide-[var(--lp-line-soft)] border-y border-[var(--lp-line-soft)]">
        {card.receipts.map((receipt) => {
          const isApproved = Boolean(approved[receipt.id])
          return (
            <div key={receipt.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <Receipt className="h-4 w-4 shrink-0 text-[var(--lp-flame)]" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-black">{receipt.name}</p>
                  <p className="text-[10px] tabular-nums text-[var(--lp-muted)]">{money(receipt.amount)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`border-[2px] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide ${
                    isApproved
                      ? 'border-emerald-700/40 bg-emerald-100 text-emerald-700'
                      : 'border-amber-700/40 bg-amber-100 text-amber-800'
                  }`}
                >
                  {isApproved ? card.approved : card.pending}
                </span>
                <button
                  type="button"
                  onClick={() => setApproved((prev) => ({ ...prev, [receipt.id]: !prev[receipt.id] }))}
                  className="min-h-11 border-[2px] border-[var(--lp-line)] bg-[var(--lp-paper)] px-2 py-1 text-[9px] font-black uppercase tracking-wide text-[var(--lp-ink)] transition hover:bg-[#f2b544] sm:min-h-9"
                >
                  {isApproved ? card.undo : card.approve}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div aria-live="polite">
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[var(--lp-muted)]">{card.mealRate}</p>
          <p className="text-2xl font-black tabular-nums leading-none">{money(mealRate)}</p>
          <p className="text-[9px] text-[var(--lp-muted)]">{card.perMeal}</p>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[var(--lp-muted)]">{card.pending}</p>
          <p className="text-sm font-black tabular-nums">{money(pendingTotal)}</p>
        </div>
      </div>
      <p className="mt-2 text-[9px] font-semibold text-[var(--lp-muted)]">{card.rateNote}</p>
    </ComicCard>
  )
}

function MealsCard({ copy }: { copy: LandingCopy }) {
  const card = copy.meals.card
  const [grid, setGrid] = useState<number[][]>(() => card.initial.map((row) => [...row]))
  const [guest, setGuest] = useState(0)
  const total = grid.flat().reduce((sum, value) => sum + value, 0) + guest

  const toggle = (day: number, meal: number) => {
    setGrid((prev) =>
      prev.map((row, rowIndex) => (rowIndex === day ? row.map((value, mealIndex) => (mealIndex === meal ? (value ? 0 : 1) : value)) : row)),
    )
  }

  return (
    <ComicCard className="p-4">
      <CardHead label={card.label} title={card.title} hint={card.hint} />
      <div className="mt-3 grid grid-cols-[1.6rem_repeat(3,1fr)] gap-1">
        <span />
        {card.meals.map((meal) => (
          <span key={meal.long} className="text-center text-[8px] font-black uppercase tracking-wide text-[var(--lp-muted)]">
            {meal.short}
          </span>
        ))}
        {card.days.map((day, dayIndex) => (
          <Fragment key={day}>
            <span className="flex items-center text-[8px] font-black uppercase tracking-wide text-[var(--lp-muted)]">
              {day}
            </span>
            {card.meals.map((meal, mealIndex) => {
              const on = Boolean(grid[dayIndex]?.[mealIndex])
              return (
                <button
                  key={`${day}-${meal.long}`}
                  type="button"
                  aria-label={`${day} ${meal.long}`}
                  aria-pressed={on}
                  onClick={() => toggle(dayIndex, mealIndex)}
                  className={`flex h-10 items-center justify-center border-[2px] border-[var(--lp-line)] text-xs font-black transition sm:h-9 ${
                    on ? 'bg-[#0c8279] text-white' : 'bg-[var(--lp-paper)] text-[var(--lp-muted)] hover:bg-[#f2b544]/40'
                  }`}
                >
                  {on ? <Check className="h-3.5 w-3.5" /> : '·'}
                </button>
              )
            })}
          </Fragment>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t-[2px] border-[var(--lp-line-soft)] pt-3">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[var(--lp-muted)]">{card.total}</p>
          <p className="text-2xl font-black tabular-nums leading-none" aria-live="polite">
            {localDigits(total)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`Remove ${card.guest}`}
            onClick={() => setGuest((value) => Math.max(0, value - 1))}
            disabled={guest === 0}
            className="flex h-8 w-8 items-center justify-center border-[2px] border-[var(--lp-line)] bg-[var(--lp-paper)] disabled:opacity-40"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="min-w-7 text-center text-xs font-black tabular-nums">{localDigits(guest)}</span>
          <button
            type="button"
            aria-label={`Add ${card.guest}`}
            onClick={() => setGuest((value) => Math.min(3, value + 1))}
            className="flex h-8 w-8 items-center justify-center border-[2px] border-[var(--lp-line)] bg-[#f2b544] text-[#0f2b3d]"
          >
            <Plus className="h-3 w-3" />
          </button>
          <span className="ml-1 max-w-[7rem] text-[9px] font-semibold leading-tight text-[var(--lp-muted)]">
            {card.guest}
            <span className="block font-normal">{card.guestHint}</span>
          </span>
        </div>
      </div>
    </ComicCard>
  )
}

function DepositCard({ copy }: { copy: LandingCopy }) {
  const card = copy.deposit.card
  const [selected, setSelected] = useState(0)
  const member = card.members[selected]

  return (
    <ComicCard className="p-4">
      <CardHead label={card.label} title={card.title} hint={card.hint} />
      <div className="mt-3 grid grid-cols-3 gap-1" role="tablist" aria-label={card.label}>
        {card.members.map((row, index) => (
          <button
            key={row.name}
            type="button"
            role="tab"
            aria-selected={selected === index}
            onClick={() => setSelected(index)}
            className={`border-[2px] border-[var(--lp-line)] px-2 py-2 text-left transition ${
              selected === index ? 'bg-[#f2b544] text-[#0f2b3d]' : 'bg-[var(--lp-paper)] text-[var(--lp-ink)] hover:bg-[#f2b544]/30'
            }`}
          >
            <span className="block text-xs font-black">{row.name}</span>
            <span className="block text-[8px] font-semibold opacity-70">{row.role}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { label: card.deposit, value: member.deposit },
          { label: card.bazarPaid, value: member.bazar },
          { label: card.balance, value: member.balance },
        ].map((item) => (
          <div key={item.label} className="border-[2px] border-[var(--lp-line-soft)] bg-[var(--lp-paper)] px-2 py-2">
            <p className="text-[8px] font-black uppercase tracking-wide text-[var(--lp-muted)]">{item.label}</p>
            <p className={`mt-0.5 text-xs font-black tabular-nums ${item.value < 0 ? 'text-rose-600' : ''}`}>
              {money(item.value)}
            </p>
          </div>
        ))}
      </div>

      <div
        className={`mt-3 border-[2px] p-3 ${
          member.recorded ? 'border-emerald-700/40 bg-emerald-100' : 'border-rose-700/40 bg-rose-100'
        }`}
      >
        <p className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide ${member.recorded ? 'text-emerald-700' : 'text-rose-700'}`}>
          {member.recorded ? <Check className="h-3.5 w-3.5" /> : <Receipt className="h-3.5 w-3.5" />}
          {member.status}
        </p>
        <p className="mt-1 text-[10px] font-semibold leading-relaxed text-[var(--lp-ink)]">
          <span className="font-black uppercase tracking-wide">{card.trail}: </span>
          {member.trail}
        </p>
      </div>
      <p className="mt-2 text-[9px] leading-relaxed text-[var(--lp-muted)]">{card.voidNote}</p>
    </ComicCard>
  )
}

function BossFight({ copy }: { copy: LandingCopy }) {
  const card = copy.boss.card
  const ref = useRef<HTMLElement | null>(null)
  const [hp, setHp] = useState(100)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    if (closed) return
    const node = ref.current
    if (!node) return

    // The bar is driven by a rounded percentage, so React only re-renders when
    // the number actually changes. Avoiding rAF keeps this working when the
    // page is in a background tab, where animation frames are paused.
    const update = () => {
      const rect = node.getBoundingClientRect()
      const travel = Math.max(1, rect.height - window.innerHeight)
      const progress = Math.min(1, Math.max(0, -rect.top / travel))
      const next = Math.max(18, Math.round(100 - progress * 82))
      setHp((current) => (current === next ? current : next))
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [closed])

  const finish = () => {
    setClosed(true)
    setHp(0)
  }
  const barColor = hp > 50 ? '#fb5d12' : hp > 22 ? '#f2b544' : '#39c2ac'

  return (
    <section
      id="boss"
      ref={ref}
      className="relative min-h-[160dvh] scroll-mt-[66px] border-b-[3px] border-[var(--lp-line)] bg-[#071923] text-[#f6f0e2] lg:min-h-[165vh]"
    >
      <div className="sticky top-[66px] h-[calc(100dvh-66px)]">
        <div className="relative h-full w-full overflow-hidden">
          <img
            src={copy.boss.image}
            alt={copy.boss.alt}
            width={1392}
            height={752}
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
            decoding="async"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(7,25,35,0.96) 0%, rgba(7,25,35,0.25) 32%, rgba(7,25,35,0.35) 60%, rgba(7,25,35,0.98) 100%)',
            }}
            aria-hidden="true"
          />
          <div className="comic-halftone absolute inset-0 opacity-10" aria-hidden="true" />

          {closed ? (
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
              {Array.from({ length: 18 }).map((_, index) => (
                <span
                  key={index}
                  className="confetti-piece"
                  style={{
                    left: `${6 + ((index * 17) % 88)}%`,
                    backgroundColor: ['#f2b544', '#fb5d12', '#39c2ac', '#f6f0e2'][index % 4],
                    animationDelay: `${(index % 6) * 0.08}s`,
                  }}
                />
              ))}
            </div>
          ) : null}

          <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-between gap-4 px-4 py-6 sm:px-6 lg:py-9">
            <div className="max-w-xl">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#f2b544]">{copy.boss.kicker}</p>
              <h2 className="mt-2 text-3xl font-black leading-[0.98] tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                {copy.boss.title}
              </h2>
              <p className="mt-3 max-w-lg text-xs leading-relaxed text-[#d7e3e8]/80 sm:text-sm">{copy.boss.body}</p>
            </div>

            <div className="w-full max-w-xl border-[3px] border-[#f6f0e2] bg-[#071923]/95 p-4 shadow-[8px_8px_0_rgba(0,0,0,0.35)] backdrop-blur-sm">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#a4bbc9]">{card.hp}</p>
                  <p className="text-2xl font-black leading-none tabular-nums">
                    {localDigits(closed ? 0 : hp)}%
                  </p>
                </div>
                <button
                  type="button"
                  onClick={finish}
                  disabled={closed}
                  className={`${BTN_GOLD} min-h-10 px-3 py-2 text-[10px] disabled:hidden`}
                >
                  <SwordsIcon /> {hp <= 22 && !closed ? card.finalBlow : card.settle}
                </button>
              </div>

              <div
                role="progressbar"
                aria-label={card.hp}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={closed ? 0 : hp}
                className="mt-2 h-4 overflow-hidden border-[2px] border-[#f6f0e2] bg-[#0f2b3d]"
              >
                <div
                  className="hp-segments h-full transition-[width] duration-150"
                  style={{ width: `${closed ? 0 : hp}%`, backgroundColor: barColor }}
                />
              </div>

              <ul className="mt-3 space-y-1 border-t border-[#f6f0e2]/20 pt-2">
                {card.rows.map((row) => (
                  <li key={`${row.from}-${row.to}`} className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="text-[#d7e3e8]/80">
                      {row.from} <span className="text-[#a4bbc9]">→</span> {row.to}
                    </span>
                    <span className="font-black tabular-nums">{money(row.amount)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[9px] font-bold text-[#a4bbc9]">{card.total}</p>

              {closed ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-block -rotate-3 border-[4px] border-[#f2b544] px-3 py-1 text-xl font-black uppercase tracking-[0.08em] text-[#f2b544]">
                    {card.closed}
                  </span>
                  <Link to="/signin" className="text-[10px] font-black uppercase tracking-wide text-[#f2b544] underline underline-offset-4">
                    {card.cta} <ArrowRight className="inline h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <p className="mt-2 text-[9px] font-semibold text-[#a4bbc9]">{card.hint}</p>
              )}
              <p className="mt-2 text-[8px] text-[#7695a8]">{card.note}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function SwordsIcon() {
  return <Sparkles className="h-3.5 w-3.5" />
}

function GuildCard({ copy }: { copy: LandingCopy }) {
  const card = copy.guild.card
  const [votes, setVotes] = useState<[number, number]>(() => [...card.initialVotes])
  const [voted, setVoted] = useState<number | null>(null)
  const [dice, setDice] = useState<number | null>(null)
  const totalVotes = votes[0] + votes[1]

  const vote = (index: 0 | 1) => {
    if (voted !== null) return
    setVotes((prev) => {
      const next: [number, number] = [...prev]
      next[index] += 1
      return next
    })
    setVoted(index)
  }

  return (
    <ComicCard className="p-4">
      <CardHead label={card.label} title={card.title} hint={card.hint} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="border-[2px] border-[var(--lp-line-soft)] bg-[var(--lp-paper)] p-3">
          <p className="text-[10px] font-black">{card.pollQuestion}</p>
          <div className="mt-2 space-y-1.5">
            {card.options.map((option, index) => {
              const pct = totalVotes ? Math.round((votes[index] / totalVotes) * 100) : 0
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={voted === index}
                  onClick={() => vote(index as 0 | 1)}
                  disabled={voted !== null}
                  className="relative w-full overflow-hidden border-[2px] border-[var(--lp-line)] px-2 py-2 text-left text-[10px] font-black transition hover:bg-[#f2b544]/25 disabled:cursor-default"
                >
                  <span
                    className="absolute inset-y-0 left-0 bg-[#f2b544]/45 transition-[width]"
                    style={{ width: `${pct}%` }}
                    aria-hidden="true"
                  />
                  <span className="relative flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      {voted === index ? <Check className="h-3 w-3" /> : null}
                      {option}
                    </span>
                    <span className="tabular-nums">{localDigits(pct)}%</span>
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-[8px] font-semibold text-[var(--lp-muted)]">{voted === null ? card.vote : card.voted}</p>
        </div>

        <div className="border-[2px] border-[var(--lp-line-soft)] bg-[var(--lp-paper)] p-3">
          <p className="text-[10px] font-black">{card.dice}</p>
          <div className="mt-2 flex items-center gap-2">
            <Dice5 className="h-6 w-6 text-[var(--lp-flame)]" />
            <button
              type="button"
              onClick={() => setDice(Math.floor(Math.random() * 6) + 1)}
              className="min-h-11 border-[2px] border-[var(--lp-line)] bg-[var(--lp-paper)] px-2 py-1 text-[9px] font-black uppercase tracking-wide transition hover:bg-[#f2b544] sm:min-h-9"
            >
              {card.roll}
            </button>
            {dice ? (
              <span className="text-[10px] font-bold text-[var(--lp-muted)]">
                {card.rolled} <span className="text-base font-black text-[var(--lp-flame)]">{localDigits(dice)}</span>
              </span>
            ) : null}
          </div>

          <p className="mt-3 text-[9px] font-black uppercase tracking-[0.14em] text-[var(--lp-muted)]">{card.leaderboard}</p>
          <ul className="mt-1 divide-y divide-[var(--lp-line-soft)]">
            {card.rows.map((row, index) => (
              <li
                key={row.name}
                className={`flex items-center justify-between gap-2 px-1 py-1.5 text-[10px] ${
                  index === 1 ? 'bg-[#f2b544]/25 font-black' : ''
                }`}
              >
                <span className="truncate">
                  <span className="mr-1 text-[8px] text-[var(--lp-muted)]">{localDigits(index + 1)}</span>
                  {row.name}
                </span>
                <span className="shrink-0 tabular-nums">{localDigits(row.points.toLocaleString('en-US'))}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[8px] text-[var(--lp-muted)]">{card.sample}</p>
        </div>
      </div>
    </ComicCard>
  )
}

function SquadCard({ copy }: { copy: LandingCopy }) {
  const card = copy.squad.card
  const [selected, setSelected] = useState(0)
  const character = card.characters[selected]
  const Icon = CHARACTER_ICONS[character.icon]

  return (
    <ComicCard className="p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--lp-muted)]">{card.hint}</p>
      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {card.characters.map((row, index) => {
          const RowIcon = CHARACTER_ICONS[row.icon]
          const active = selected === index
          return (
            <button
              key={row.name}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected(index)}
              className={`border-[2px] border-[var(--lp-line)] px-2 py-2 text-left transition ${
                active ? 'bg-[#f2b544] text-[#0f2b3d]' : 'bg-[var(--lp-paper)] text-[var(--lp-ink)] hover:bg-[#f2b544]/25'
              }`}
            >
              <RowIcon className="h-4 w-4" />
              <span className="mt-1 block text-xs font-black leading-tight">{row.name}</span>
              <span className="block text-[8px] font-semibold leading-tight opacity-75">{row.role}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 border-[2px] border-[var(--lp-line)] bg-[var(--lp-paper)] p-3">
        <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-[var(--lp-flame)]">
          <Icon className="h-3.5 w-3.5" /> {character.name}
        </p>
        <p className="mt-1 text-xs font-black leading-relaxed">“{character.line}”</p>
      </div>

      <Link to="/signin" className={`${BTN_GOLD} mt-3 w-full`}>
        {copy.hero.cta} <ArrowRight className="h-4 w-4" />
      </Link>
    </ComicCard>
  )
}

function Features({ copy }: { copy: LandingCopy }) {
  return (
    <section id="features" className="scroll-mt-24 border-b-[3px] border-[var(--lp-line)] bg-[var(--lp-paper)] px-4 py-14 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[var(--lp-flame)]">{copy.features.label}</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-black leading-[1.02] tracking-[-0.04em] sm:text-4xl">
          {copy.features.title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--lp-muted)]">{copy.features.intro}</p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {copy.features.items.map((item, index) => {
            const Icon = FEATURE_ICONS[index] ?? Check
            return (
              <article
                key={item.title}
                className="border-[3px] border-[var(--lp-line)] bg-[var(--lp-panel)] p-4 text-[var(--lp-ink)] shadow-[5px_5px_0_var(--lp-shadow)]"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center border-[2px] border-[var(--lp-line)] bg-[#f2b544] text-[#0f2b3d]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-2xl font-black leading-none text-[var(--lp-line-faint)]">{localDigits(`0${index + 1}`)}</span>
                </div>
                <h3 className="mt-3 text-sm font-black leading-snug">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--lp-muted)]">{item.body}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function HowItWorks({ copy }: { copy: LandingCopy }) {
  return (
    <section id="how" className="scroll-mt-24 border-b-[3px] border-[var(--lp-line)] bg-[#0b2230] px-4 py-14 text-[#f6f0e2] sm:px-6 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#70dbc6]">{copy.how.label}</p>
        <h2 className="mt-2 text-3xl font-black leading-[1.02] tracking-[-0.04em] sm:text-4xl">{copy.how.title}</h2>
        <div className="mt-7 grid gap-3 md:grid-cols-3">
          {copy.how.steps.map((step, index) => {
            const Icon = HOW_ICONS[index] ?? Check
            return (
              <div key={step.title} className="border-[2px] border-[#f6f0e2]/25 bg-[#102f3f] p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center border-[2px] border-[#f6f0e2]/40 bg-[#f2b544] text-[#0f2b3d]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-4xl font-black leading-none text-[#f6f0e2]/15">{localDigits(`0${index + 1}`)}</span>
                </div>
                <h3 className="mt-3 text-sm font-black">{step.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#a4bbc9]">{step.body}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Trust({ copy }: { copy: LandingCopy }) {
  return (
    <section className="border-b-[3px] border-[var(--lp-line)] bg-[var(--lp-paper)] px-4 py-14 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-6 border-[3px] border-[var(--lp-line)] bg-[var(--lp-panel)] p-5 shadow-[8px_8px_0_var(--lp-shadow)] lg:grid-cols-2 lg:p-8">
        <div>
          <p className="inline-flex items-center gap-1.5 border-[2px] border-[var(--lp-line)] bg-[#d1f7ec] px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#0d6963]">
            <ShieldCheck className="h-3 w-3" /> {copy.trust.label}
          </p>
          <h2 className="mt-3 text-2xl font-black leading-tight tracking-[-0.03em] sm:text-3xl">{copy.trust.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--lp-muted)]">{copy.trust.body}</p>
        </div>
        <ul className="space-y-2.5 self-center">
          {copy.trust.points.map((point) => (
            <li key={point} className="flex items-start gap-2 border-b border-[var(--lp-line-soft)] pb-2 text-xs leading-relaxed">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0c8279]" /> {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Pricing({ copy }: { copy: LandingCopy }) {
  return (
    <section id="pricing" className="scroll-mt-24 border-b-[3px] border-[var(--lp-line)] bg-[var(--lp-soft)] px-4 py-14 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[var(--lp-flame)]">{copy.pricing.label}</p>
        <h2 className="mt-2 text-3xl font-black leading-[1.02] tracking-[-0.04em] sm:text-4xl">{copy.pricing.title}</h2>
        <p className="mt-2 text-sm text-[var(--lp-muted)]">{copy.pricing.intro}</p>
        <div className="mt-7 grid gap-3 md:grid-cols-2">
          <div className="border-[3px] border-[var(--lp-line)] bg-[var(--lp-panel)] p-5 shadow-[6px_6px_0_var(--lp-shadow)]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black">{copy.pricing.freeName}</h3>
              <span className="border-[2px] border-[var(--lp-line)] bg-[#d1f7ec] px-2 py-1 text-[8px] font-black uppercase tracking-wide text-[#0d6963]">
                {copy.pricing.freeBadge}
              </span>
            </div>
            <p className="mt-2 text-3xl font-black tabular-nums">{copy.pricing.freePrice}</p>
            <p className="mt-1 text-xs text-[var(--lp-muted)]">{copy.pricing.freeBody}</p>
            <ul className="mt-4 space-y-2">
              {copy.pricing.freePoints.map((point) => (
                <li key={point} className="flex items-start gap-2 text-xs text-[var(--lp-muted)]">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0c8279]" /> {point}
                </li>
              ))}
            </ul>
            <Link to="/signin" className={`${BTN_DARK} mt-5 w-full`}>
              {copy.pricing.freeCta} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="border-[3px] border-[var(--lp-line)] bg-[#f2b544] p-5 text-[#0f2b3d] shadow-[6px_6px_0_var(--lp-shadow)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Crown className="h-4 w-4" />
                <h3 className="text-sm font-black">{copy.pricing.proName}</h3>
              </div>
              <span className="border-[2px] border-[#0f2b3d] bg-[#0f2b3d] px-2 py-1 text-[8px] font-black uppercase tracking-wide text-[#f2b544]">
                {copy.pricing.proBadge}
              </span>
            </div>
            <p className="mt-2 text-3xl font-black tabular-nums">{copy.pricing.proPrice}</p>
            <p className="mt-1 text-xs text-[#0f2b3d]/70">{copy.pricing.proBody}</p>
            <ul className="mt-4 space-y-2">
              {copy.pricing.proPoints.map((point) => (
                <li key={point} className="flex items-start gap-2 text-xs text-[#0f2b3d]/80">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {point}
                </li>
              ))}
            </ul>
            <a
              href="https://wa.me/8801797989412?text=Mess%20Mates%20Pro"
              target="_blank"
              rel="noopener noreferrer"
              className={`${BTN_DARK} mt-5 w-full`}
            >
              {copy.pricing.proCta} <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

function FAQ({ copy }: { copy: LandingCopy }) {
  return (
    <section className="border-b-[3px] border-[var(--lp-line)] bg-[var(--lp-paper)] px-4 py-14 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[var(--lp-flame)]">{copy.faq.label}</p>
        <h2 className="mt-2 text-3xl font-black leading-[1.02] tracking-[-0.04em] sm:text-4xl">{copy.faq.title}</h2>
        <div className="mt-5 border-[3px] border-[var(--lp-line)] bg-[var(--lp-panel)] px-4 shadow-[6px_6px_0_var(--lp-shadow)]">
          {copy.faq.items.map((item) => (
            <details key={item.q} className="group border-b-[2px] border-[var(--lp-line-soft)] py-3 last:border-b-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black">
                {item.q}
                <span className="text-lg text-[var(--lp-flame)] transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-[var(--lp-muted)]">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCTA({ copy }: { copy: LandingCopy }) {
  return (
    <section className="relative isolate overflow-hidden bg-[#071923] px-4 py-16 text-[#f6f0e2] sm:px-6 lg:py-24">
      <img
        src="/landing/guild.jpg"
        alt=""
        width={1392}
        height={752}
        className="absolute inset-0 h-full w-full object-cover opacity-35"
        loading="lazy"
        decoding="async"
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(90deg, rgba(7,25,35,0.98) 0%, rgba(7,25,35,0.75) 55%, rgba(7,25,35,0.35) 100%)' }}
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto max-w-3xl">
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#f2b544]">{copy.final.label}</p>
        <h2 className="mt-3 text-3xl font-black leading-[0.98] tracking-[-0.04em] sm:text-5xl">{copy.final.title}</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#d7e3e8]/80">{copy.final.body}</p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Link to="/signin" className={BTN_GOLD}>
            {copy.final.cta} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/signin" className={BTN_CREAM}>
            {copy.final.join}
          </Link>
        </div>
      </div>
    </section>
  )
}

function Footer({ copy }: { copy: LandingCopy }) {
  return (
    <footer className="bg-[var(--lp-paper)] px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 border-t-[3px] border-[var(--lp-line)] pt-6 text-[10px] text-[var(--lp-muted)] sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5">
          <Smartphone className="h-3.5 w-3.5" /> {copy.footer.made}
        </p>
        <div className="flex flex-wrap items-center gap-4 font-black">
          <Link to="/privacy" className="hover:text-[var(--lp-flame)]">
            {copy.footer.privacy}
          </Link>
          <Link to="/terms" className="hover:text-[var(--lp-flame)]">
            {copy.footer.terms}
          </Link>
          <a
            href="https://wa.me/8801797989412"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--lp-flame)]"
          >
            {copy.footer.whatsapp}
          </a>
        </div>
      </div>
    </footer>
  )
}

export function LandingPage() {
  const { busy, signInDemo } = useApp()
  const { lang } = useI18n()
  const copy = COPY[lang]

  // `overflow-x: hidden` on the body would break the sticky header and boss
  // stage. Mark the body for the landing's `clip` rule, and clean it up when
  // the visitor moves to sign-in or the app shell.
  useEffect(() => {
    document.body.classList.add('landing-body')
    return () => document.body.classList.remove('landing-body')
  }, [])

  return (
    <div className="landing-page min-h-dvh">
      <a
        href="#story"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:border-[3px] focus:border-[#0f2b3d] focus:bg-[#f2b544] focus:px-3 focus:py-2 focus:text-xs focus:font-black focus:text-[#0f2b3d]"
      >
        Skip to story
      </a>
      <Header copy={copy} />
      <main>
        <Hero copy={copy} busy={busy} onDemo={() => void signInDemo()} />
        <HostelScene />
        <StoryIntro copy={copy} />

        <Chapter chapter={copy.bazar} index={0} tone="paper">
          <BazarCard copy={copy} />
        </Chapter>
        <Chapter chapter={copy.meals} index={1} reverse tone="soft">
          <MealsCard copy={copy} />
        </Chapter>
        <Chapter chapter={copy.deposit} index={2} tone="ink">
          <DepositCard copy={copy} />
        </Chapter>

        <BossFight copy={copy} />

        <Chapter chapter={copy.guild} index={4} reverse tone="soft">
          <GuildCard copy={copy} />
        </Chapter>
        <Chapter chapter={copy.squad} index={5} tone="paper">
          <SquadCard copy={copy} />
        </Chapter>

        <Features copy={copy} />
        <HowItWorks copy={copy} />
        <Trust copy={copy} />
        <Pricing copy={copy} />
        <FAQ copy={copy} />
        <FinalCTA copy={copy} />
      </main>
      <Footer copy={copy} />
    </div>
  )
}
