import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  ChevronRight,
  Crown,
  Dice5,
  Flame,
  Gamepad2,
  Mail,
  ShieldCheck,
  Swords,
  Utensils,
  Vote,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Pill } from '../components/ui'
import { LedgerPanel } from '../components/LedgerPanel'
import { LanguageToggle } from '../components/LanguageToggle'
import { useI18n } from '../lib/i18n'

export function SplashScreen() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink-50">
      <div className="flex flex-col items-center gap-3">
        <img src="/logo.png" alt="Mess Mates" className="h-16 w-16 animate-float rounded-2xl" />
        <p className="text-sm font-bold text-ink-500">{t('auth.splash')}</p>
      </div>
    </div>
  )
}

export function AuthScreen() {
  const { backend, busy, signInWithGoogle, signInDemo, signInWithEmail, error } = useApp()
  const { t } = useI18n()
  const isDemo = backend.mode === 'demo'
  const [email, setEmail] = useState('')
  const [showEmail, setShowEmail] = useState(false)

  const chips = [
    { icon: Utensils, label: t('auth.featureRate') },
    { icon: Flame, label: t('auth.gateChipBoss') },
    { icon: Vote, label: t('auth.featurePolls') },
    { icon: Swords, label: t('auth.featureArena') },
  ]

  return (
    <div className="relative min-h-dvh overflow-hidden bg-ink-900 text-white">
      {/* The corridor poster is the whole first impression, so it runs edge to
          edge behind both columns and only fades out under the form. */}
      <img
        src="/app/gate.jpg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-900/55 via-ink-900/80 to-ink-900 md:bg-gradient-to-r md:from-ink-900/95 md:via-ink-900/75 md:to-ink-900/35" />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pb-6 pt-5 sm:px-6 md:px-8 md:pb-8 md:pt-6">
        <header className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt=""
              className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/25"
            />
            <span>
              <span className="block text-base font-extrabold leading-tight tracking-tight">
                Mess Mates
              </span>
              <span className="block text-[11px] font-semibold text-brand-200/80">
                {t('app.tagline')}
              </span>
            </span>
          </Link>
          <LanguageToggle />
        </header>

        <div className="grid flex-1 items-center gap-8 py-7 md:grid-cols-[1.1fr_minmax(340px,400px)] md:gap-12 md:py-10">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-100 backdrop-blur">
              <Gamepad2 className="h-3.5 w-3.5" />
              {t('auth.gateKicker')}
            </p>
            <h1 className="mt-4 text-[30px] font-extrabold leading-[1.08] tracking-tight sm:text-4xl md:text-[3.1rem]">
              {t('auth.gateTitle')}
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75 sm:text-base">
              {t('auth.gateBody')}
            </p>

            <ul className="mt-6 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <li
                  key={chip.label}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.07] px-2.5 py-1.5 text-xs font-bold text-white/85 backdrop-blur"
                >
                  <chip.icon className="h-3.5 w-3.5 text-brand-300" />
                  {chip.label}
                </li>
              ))}
            </ul>

            <p className="mt-6 hidden items-center gap-2 text-[11px] font-semibold text-white/55 md:flex">
              <ShieldCheck className="h-4 w-4 shrink-0 text-brand-300" />
              {t('auth.security')}
            </p>
          </div>

          <div className="hud-panel p-5 text-ink-900 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="hud-kicker">{t('auth.gatePanelKicker')}</p>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight text-ink-900">
                  {t('auth.signIn')}
                </h2>
                <p className="mt-0.5 text-xs text-ink-500">{t('auth.signInSub')}</p>
              </div>
              {isDemo ? (
                <Pill tone="warn">{t('auth.demoMode')}</Pill>
              ) : (
                <Pill tone="success">{t('auth.live')}</Pill>
              )}
            </div>

            {isDemo ? (
              <div className="space-y-3">
                <Button className="w-full" size="lg" onClick={signInDemo} loading={busy}>
                  {t('auth.enterDemo')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800">
                  {t('auth.demoNote')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <Button className="w-full" size="lg" onClick={signInWithGoogle} loading={busy}>
                  <GoogleMark />
                  {t('auth.google')}
                </Button>
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-ink-300">
                  <span className="h-px flex-1 bg-ink-100" /> {t('auth.or')}{' '}
                  <span className="h-px flex-1 bg-ink-100" />
                </div>
                {showEmail ? (
                  <div className="space-y-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder={t('auth.emailPlaceholder')}
                      className="field"
                    />
                    <Button
                      className="w-full"
                      variant="secondary"
                      disabled={!email.includes('@')}
                      onClick={() => signInWithEmail(email)}
                    >
                      <Mail className="h-4 w-4" /> {t('auth.sendLink')}
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full" variant="secondary" onClick={() => setShowEmail(true)}>
                    <Mail className="h-4 w-4" /> {t('auth.useEmail')}
                  </Button>
                )}
              </div>
            )}

            {error ? (
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
                {error}
              </p>
            ) : null}

            <ul className="mt-5 space-y-1.5 border-t border-ink-100 pt-4 text-[11px] text-ink-500">
              {[t('auth.bullet1'), t('auth.bullet2'), t('auth.bullet3')].map((line) => (
                <li key={line} className="flex items-start gap-1.5">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                  {line}
                </li>
              ))}
            </ul>

            <p className="mt-4 flex items-center justify-center gap-1.5 border-t border-dashed border-ink-100 pt-3 text-center text-[10px] font-semibold text-ink-400">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand-500" />
              {t('auth.gateTrust')}
            </p>
          </div>
        </div>

        <footer className="flex flex-col items-center gap-1.5 text-[11px] text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center sm:text-left">{t('auth.footer')}</p>
          <p className="flex items-center gap-3 font-semibold">
            <Link to="/privacy" className="text-white/60 transition hover:text-white">
              {t('legal.privacyTitle')}
            </Link>
            <span className="text-white/25">·</span>
            <Link to="/terms" className="text-white/60 transition hover:text-white">
              {t('legal.termsTitle')}
            </Link>
          </p>
        </footer>
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#fff" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z" />
      <path fill="#fff" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.3 7.4 24 12 24z" />
      <path fill="#fff" d="M5.4 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.4C.5 8.2 0 10 0 12s.5 3.8 1.4 5.4l4-3.1z" />
      <path fill="#fff" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  )
}

export function OnboardingScreen() {
  const { user, backend, busy, createMess, joinMess, signOut, error } = useApp()
  const { t } = useI18n()
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('৳')
  const [code, setCode] = useState('')
  return (
    <div className="min-h-dvh bg-ink-50">
      <div className="mx-auto flex min-h-dvh max-w-4xl flex-col px-4 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Mess Mates" className="h-10 w-10 rounded-xl object-cover" />
            <div>
              <p className="text-sm font-extrabold text-ink-900">Mess Mates</p>
              <p className="text-[11px] text-ink-400">
                {t('auth.welcome', { name: user?.full_name ?? '' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button onClick={signOut} className="text-xs font-bold text-ink-400 hover:text-rose-500">
              {t('common.signOut')}
            </button>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <h1 className="text-2xl font-extrabold text-ink-900">{t('auth.setupTitle')}</h1>
            <p className="mt-1 text-sm text-ink-500">{t('auth.setupBody')}</p>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Crown className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-ink-900">{t('auth.createTitle')}</p>
                <p className="text-[11px] text-ink-400">{t('auth.createSub')}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="label">{t('auth.messName')}</label>
                <input
                  className="field"
                  placeholder={t('auth.messNamePlaceholder')}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div>
                <label className="label">{t('auth.currency')}</label>
                <div className="flex gap-2">
                  {['৳', '₹', '$', 'Rs'].map((symbol) => (
                    <button
                      key={symbol}
                      onClick={() => setCurrency(symbol)}
                      className={`flex-1 rounded-xl border py-2 text-sm font-bold transition ${
                        currency === symbol
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-ink-200 text-ink-500 hover:border-brand-300'
                      }`}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                disabled={name.trim().length < 2 || busy}
                loading={busy && mode === 'create'}
                onClick={() => {
                  setMode('create')
                  createMess(name.trim(), currency)
                }}
              >
                {t('auth.createBtn')} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-flame-50 text-flame-600">
                <Dice5 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-ink-900">{t('auth.joinTitle')}</p>
                <p className="text-[11px] text-ink-400">{t('auth.joinSub')}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="label">{t('auth.inviteCode')}</label>
                <input
                  className="field font-mono text-lg uppercase tracking-[0.35em]"
                  placeholder="ABC123"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                />
              </div>
              <Button
                className="w-full"
                variant="secondary"
                disabled={code.trim().length < 6 || busy}
                loading={busy && mode === 'join'}
                onClick={() => {
                  setMode('join')
                  joinMess(code)
                }}
              >
                {t('auth.joinBtn')} <ChevronRight className="h-4 w-4" />
              </Button>
              <p className="text-[10px] leading-relaxed text-ink-400">{t('hub.joinRequestsHint')}</p>
              {backend.mode === 'demo' ? (
                <p className="rounded-lg bg-ink-50 px-3 py-2 text-[11px] text-ink-500">
                  {t('auth.demoCode')} <span className="font-mono font-bold">MM7K2Q</span>
                </p>
              ) : null}
            </div>
          </div>

          {error ? (
            <div className="md:col-span-2">
              <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-600">{error}</p>
            </div>
          ) : null}

          {/* This screen is the only one a member sees between messes, so
              their own ledger has to live here: the months they left behind
              stay readable to them (and to that mess) for good. */}
          <div className="md:col-span-2 rounded-2xl border border-ink-100 bg-white p-4">
            <LedgerPanel compact />
          </div>
        </div>
      </div>

    </div>
  )
}
