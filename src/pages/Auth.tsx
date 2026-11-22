import { useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  Crown,
  Dice5,
  Mail,
  ShieldCheck,
  Swords,
  Utensils,
  Vote,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Pill } from '../components/ui'

export function SplashScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50">
      <div className="flex flex-col items-center gap-3">
        <img src="/logo.png" alt="Mess Mates" className="h-16 w-16 animate-float rounded-2xl" />
        <p className="text-sm font-bold text-ink-500">Loading your mess…</p>
      </div>
    </div>
  )
}

export function AuthScreen() {
  const { backend, busy, signInWithGoogle, signInDemo, signInWithEmail, error } = useApp()
  const isDemo = backend.mode === 'demo'
  const [email, setEmail] = useState('')
  const [showEmail, setShowEmail] = useState(false)

  return (
    <div className="min-h-screen bg-ink-50 md:grid md:grid-cols-[1.1fr_1fr]">
      <section className="relative overflow-hidden bg-guild-hero px-6 py-10 text-white md:flex md:flex-col md:justify-between md:px-12 md:py-14">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-flame-500/20 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/95 p-2 shadow-lg">
              <img src="/logo.png" alt="Mess Mates" className="h-10 w-10 rounded-lg object-cover" />
            </div>
            <div>
              <p className="text-lg font-extrabold tracking-tight">Mess Mates</p>
              <p className="text-[11px] font-semibold text-brand-100/80">Mess accounting · Guild arena</p>
            </div>
          </div>

          <h1 className="mt-8 max-w-lg text-3xl font-extrabold leading-tight md:mt-12 md:text-[2.6rem]">
            Every meal counted.
            <br />
            Every taka settled.
            <span className="block text-brand-200">Zero mess drama.</span>
          </h1>
          <p className="mt-3 max-w-md text-sm text-brand-50/80">
            Track meals, bazar and deposits for your hostel or bachelor mess — then settle the month in one tap. Plus
            bazar duty rosters, polls and mess-vs-mess guild games.
          </p>

          <div className="mt-6 grid max-w-md grid-cols-2 gap-2.5">
            {[
              { icon: BarChart3, label: 'Live meal rate & dues' },
              { icon: Utensils, label: 'Fast daily meal grid' },
              { icon: Vote, label: 'Democratic mess polls' },
              { icon: Swords, label: 'Chess & dice arena' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-xs font-semibold backdrop-blur">
                <item.icon className="h-4 w-4 text-brand-200" />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-10 hidden items-center gap-3 text-[11px] text-brand-100/70 md:flex">
          <ShieldCheck className="h-4 w-4" />
          Row-Level Security keeps every mess's data private. Installable as a PWA.
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 md:px-10">
        <div className="w-full max-w-sm">
          <div className="card p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-ink-900">Sign in</h2>
                <p className="mt-1 text-xs text-ink-500">One account, all your messes.</p>
              </div>
              {isDemo ? <Pill tone="warn">Demo mode</Pill> : <Pill tone="success">Supabase live</Pill>}
            </div>

            {isDemo ? (
              <div className="space-y-3">
                <Button className="w-full" size="lg" onClick={signInDemo} loading={busy}>
                  Enter the demo mess
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800">
                  Supabase isn't configured yet, so you'll explore a seeded mess: 5 members, live meal rate, polls,
                  duty roster and guild games. Add <span className="font-mono">VITE_SUPABASE_URL</span> to go live.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <Button className="w-full" size="lg" onClick={signInWithGoogle} loading={busy}>
                  <GoogleMark />
                  Continue with Google
                </Button>
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-ink-300">
                  <span className="h-px flex-1 bg-ink-100" /> or <span className="h-px flex-1 bg-ink-100" />
                </div>
                {showEmail ? (
                  <div className="space-y-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="field"
                    />
                    <Button
                      className="w-full"
                      variant="secondary"
                      disabled={!email.includes('@')}
                      onClick={() => signInWithEmail(email)}
                    >
                      <Mail className="h-4 w-4" /> Send magic link
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full" variant="secondary" onClick={() => setShowEmail(true)}>
                    <Mail className="h-4 w-4" /> Use email instead
                  </Button>
                )}
              </div>
            )}

            {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p> : null}

            <ul className="mt-5 space-y-1.5 border-t border-ink-100 pt-4 text-[11px] text-ink-500">
              {['Create a mess or join with a 6-character code', 'Meal rate, deposits and dues computed live', 'Settle the month with a printable summary'].map(
                (line) => (
                  <li key={line} className="flex items-start gap-1.5">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                    {line}
                  </li>
                ),
              )}
            </ul>
          </div>

          <p className="mt-4 text-center text-[11px] text-ink-400">
            Mess Mates · PWA · ৳ BDT by default, any currency supported
          </p>
        </div>
      </section>
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
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('৳')
  const [code, setCode] = useState('')

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Mess Mates" className="h-10 w-10 rounded-xl object-cover" />
            <div>
              <p className="text-sm font-extrabold text-ink-900">Mess Mates</p>
              <p className="text-[11px] text-ink-400">Welcome, {user?.full_name}</p>
            </div>
          </div>
          <button onClick={signOut} className="text-xs font-bold text-ink-400 hover:text-rose-500">
            Sign out
          </button>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <h1 className="text-2xl font-extrabold text-ink-900">Set up your mess</h1>
            <p className="mt-1 text-sm text-ink-500">
              Start a new mess as admin, or join your roommates with the invite code they shared.
            </p>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Crown className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-ink-900">Create a new mess</p>
                <p className="text-[11px] text-ink-400">You become the admin</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Mess name</label>
                <input
                  className="field"
                  placeholder="e.g. Chittagong Boys Mess"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div>
                <label className="label">Currency</label>
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
                Create mess <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-flame-50 text-flame-600">
                <Dice5 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-ink-900">Join an existing mess</p>
                <p className="text-[11px] text-ink-400">Use the 6-character invite code</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Invite code</label>
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
                Join mess <ChevronRight className="h-4 w-4" />
              </Button>
              {backend.mode === 'demo' ? (
                <p className="rounded-lg bg-ink-50 px-3 py-2 text-[11px] text-ink-500">
                  Demo invite code: <span className="font-mono font-bold">MM7K2Q</span>
                </p>
              ) : null}
            </div>
          </div>

          {error ? (
            <div className="md:col-span-2">
              <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-600">{error}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
