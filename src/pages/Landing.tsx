import { Link } from 'react-router-dom'
import { Pill } from '../components/ui'
import {
  ArrowRight,
  BarChart3,
  Check,
  Crown,
  FileDown,
  Languages,
  ShieldCheck,
  Smartphone,
  Users,
  UtensilsCrossed,
  Wallet,
  WifiOff,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { LanguageToggle } from '../components/LanguageToggle'
import { ThemeToggle } from '../components/ThemeToggle'
import { useI18n } from '../lib/i18n'
import { localDigits } from '../lib/format'

type Copy = {
  navFeatures: string
  navHow: string
  navPricing: string
  signIn: string
  eyebrow: string
  headline: string
  headlineAccent: string
  intro: string
  cta: string
  demo: string
  note: string
  mockLabel: string
  mockRate: string
  mockMeals: string
  mockBazar: string
  mockSettled: string
  mockBalance: string
  featuresTitle: string
  featuresIntro: string
  features: { title: string; body: string }[]
  howTitle: string
  how: { title: string; body: string }[]
  trustTitle: string
  trustBody: string
  trustPoints: string[]
  pricingTitle: string
  pricingIntro: string
  freeName: string
  freePrice: string
  freeBody: string
  freePoints: string[]
  proName: string
  proPrice: string
  proBody: string
  proPoints: string[]
  proCta: string
  faqTitle: string
  faq: { q: string; a: string }[]
  footer: string
  privacy: string
  terms: string
  whatsapp: string
}

const COPY: Record<'en' | 'bn', Copy> = {
  en: {
    navFeatures: 'Features',
    navHow: 'How it works',
    navPricing: 'Pricing',
    signIn: 'Sign in',
    eyebrow: 'The mess ledger everyone agrees on',
    headline: 'Stop settling the month',
    headlineAccent: 'with a calculator and a group chat.',
    intro:
      'Mess Mates keeps meals, bazar, utilities and deposits in one shared book — then shows exactly who owes what, and why. Built for Bangladeshi messes, in English and Bangla.',
    cta: 'Start your mess',
    demo: 'Try the demo',
    note: 'Free for the whole mess · No card · Works offline',
    mockLabel: 'November · current cycle',
    mockRate: 'Meal rate',
    mockMeals: 'Meals',
    mockBazar: 'Bazar',
    mockSettled: 'Settled',
    mockBalance: 'Your balance',
    featuresTitle: 'Built for the way a mess actually runs',
    featuresIntro:
      'Not a spreadsheet with a login. Every screen answers a question a mess manager asks at 11pm.',
    features: [
      {
        title: 'One meal rate, no arguments',
        body: 'Approved bazar ÷ total meals, recalculated as the month moves. Pending bazar stays out until a manager approves it.',
      },
      {
        title: 'Every taka has a trail',
        body: 'Deposits, bazar and utilities are never silently deleted. A mistake is voided with a reason, and the original stays visible.',
      },
      {
        title: 'Settlement that explains itself',
        body: 'Carried credit, late payments and this month’s dues are shown line by line — plus the fewest transfers that clear the month.',
      },
      {
        title: 'Approval, not free entry',
        body: 'An invite code opens a request. The admin approves who joins, and a removed member cannot walk back in.',
      },
      {
        title: 'Works when the wifi does not',
        body: 'Queued writes, an installable app and a cached ledger. Log lunch on the bus and it syncs when you are back.',
      },
      {
        title: 'Bangla, digits and all',
        body: 'Bengali months, Bengali numerals, ৳ formatting and a statement PDF that renders Bengali names properly.',
      },
    ],
    howTitle: 'From first invite to a closed month',
    how: [
      { title: 'Create the mess', body: 'Name it, pick a currency, share the six-character code. Members request to join; you approve.' },
      { title: 'Log the ordinary days', body: 'Meals, bazar with a receipt, fixed utilities and deposits. Managers approve what needs checking.' },
      { title: 'Close and settle', body: 'Review the month, see every balance and the transfer plan, then export the statement for the group.' },
    ],
    trustTitle: 'A shared book, not a black box',
    trustBody:
      'Each mess is isolated in the database, not just hidden in the interface. Members see their own mess, their own ledger and nothing else.',
    trustPoints: [
      'Every money row can be traced to a person, a date and a reason',
      'A closed month keeps its figures, even when late money arrives',
      'Managers cannot approve their own deposit request',
      'Export the whole workspace as JSON, or the month as CSV or PDF',
    ],
    pricingTitle: 'Simple pricing, arranged on WhatsApp',
    pricingIntro: 'No card is needed to start, and the free plan is not a trial.',
    freeName: 'Free',
    freePrice: '৳0',
    freeBody: 'For a mess that wants its books straight.',
    freePoints: ['Unlimited members and months', 'Meals, bazar, utilities and deposits', 'Settlement, exports and the ledger', 'Bangla and dark mode'],
    proName: 'Pro',
    proPrice: '৳199 / month',
    proBody: 'For the mess that wants the extra polish.',
    proPoints: ['Everything in Free', 'Pro badge on the guild card', 'Priority help on WhatsApp', 'Cancel any month — it is manual billing'],
    proCta: 'Arrange Pro on WhatsApp',
    faqTitle: 'Questions a mess manager asks',
    faq: [
      { q: 'Who can see our books?', a: 'Only active members of your mess. Row-Level Security is enforced in Postgres, so another mess cannot read your rows even with the API key.' },
      { q: 'What if two people share a phone?', a: 'Sign out from Mess Hub → Account. The next person signs in with their own Google account or email; the books stay with the mess, not the device.' },
      { q: 'Can a manager change an old month?', a: 'No. A closed month is frozen. A late payment is recorded beside it as a settlement, so history and the outstanding balance both stay correct.' },
      { q: 'Do you take payments inside the app?', a: 'Not yet. Deposits are recorded, not charged. Pro is arranged on WhatsApp and marked by the team, which keeps the app out of payment gateways.' },
    ],
    footer: 'Made for messes in Bangladesh.',
    privacy: 'Privacy',
    terms: 'Terms',
    whatsapp: 'WhatsApp 01797989412',
  },
  bn: {
    navFeatures: 'সুবিধা',
    navHow: 'যেভাবে কাজ করে',
    navPricing: 'মূল্য',
    signIn: 'সাইন ইন',
    eyebrow: 'সবার এক হিসাবের খাতা',
    headline: 'মাসের হিসাব আর',
    headlineAccent: 'ক্যালকুলেটর আর গ্রুপ চ্যাটে নয়।',
    intro:
      'মিল, বাজার, ইউটিলিটি আর জমা — সব এক খাতায়। কে কত দেবে, কেন দেবে, সেটাও পরিষ্কার। বাংলাদেশের মেসের জন্য, বাংলা ও ইংরেজিতে।',
    cta: 'মেস শুরু করুন',
    demo: 'ডেমো দেখুন',
    note: 'পুরো মেসের জন্য ফ্রি · কার্ড লাগবে না · অফলাইনেও চলে',
    mockLabel: 'নভেম্বর · চলমান সাইকেল',
    mockRate: 'মিল রেট',
    mockMeals: 'মিল',
    mockBazar: 'বাজার',
    mockSettled: 'নিষ্পত্তি',
    mockBalance: 'আপনার ব্যালেন্স',
    featuresTitle: 'মেস যেভাবে চলে, সেভাবেই বানানো',
    featuresIntro: 'শুধু লগইন দেওয়া স্প্রেডশিট নয়। প্রতিটি স্ক্রিন রাত ১১টার প্রশ্নের উত্তর দেয়।',
    features: [
      { title: 'এক মিল রেট, ঝগড়া নেই', body: 'অনুমোদিত বাজার ÷ মোট মিল। পেন্ডিং বাজার অনুমোদনের আগে হিসাবে আসে না।' },
      { title: 'প্রতিটি টাকার হিসাব থাকে', body: 'জমা, বাজার বা ইউটিলিটি চুপচাপ মুছে যায় না। ভুল হলে কারণসহ বাতিল হয়, আসলটা থেকে যায়।' },
      { title: 'নিষ্পত্তি নিজেই বুঝিয়ে দেয়', body: 'পুরনো ক্রেডিট, দেরিতে দেওয়া টাকা আর এ মাসের বাকি — লাইন ধরে। সাথে সবচেয়ে কম লেনদেনের প্ল্যান।' },
      { title: 'কোড দিলেই ঢোকা যায় না', body: 'কোড দিয়ে অনুরোধ যায়, অ্যাডমিন অনুমোদন দেন। বাদ পড়া সদস্য আবার ঢুকতে পারেন না।' },
      { title: 'ইন্টারনেট ছাড়াও কাজ করে', body: 'লেখা অপেক্ষায় থাকে, অ্যাপ ইনস্টল করা যায়, খাতা ক্যাশে থাকে। বাসে লাঞ্চ লিখুন, ফিরে সিঙ্ক হবে।' },
      { title: 'বাংলা, বাংলা অঙ্কে', body: 'বাংলা মাস, বাংলা সংখ্যা, ৳ ফরম্যাট আর বাংলা নামসহ বিবরণীর PDF।' },
    ],
    howTitle: 'প্রথম ইনভাইট থেকে মাস বন্ধ',
    how: [
      { title: 'মেস তৈরি করুন', body: 'নাম ও মুদ্রা দিন, ছয় অক্ষরের কোড শেয়ার করুন। সদস্য অনুরোধ করবে, আপনি অনুমোদন দেবেন।' },
      { title: 'প্রতিদিনের হিসাব লিখুন', body: 'মিল, রসিদসহ বাজার, ফিক্সড ইউটিলিটি আর জমা। যেটা যাচাই দরকার, ম্যানেজার অনুমোদন দেন।' },
      { title: 'মাস বন্ধ করে নিষ্পত্তি', body: 'মাস রিভিউ করুন, সবার ব্যালেন্স আর ট্রান্সফার প্ল্যান দেখুন, তারপর বিবরণী এক্সপোর্ট করুন।' },
    ],
    trustTitle: 'ভাগের খাতা, বন্ধ বাক্স নয়',
    trustBody: 'প্রতিটি মেস ডাটাবেসেই আলাদা — শুধু ইন্টারফেসে লুকানো নয়। সদস্য নিজের মেস আর নিজের খাতা ছাড়া কিছু দেখেন না।',
    trustPoints: [
      'প্রতিটি টাকার পেছনে মানুষ, তারিখ আর কারণ থাকে',
      'মাস বন্ধ হলে হিসাব জমে থাকে, দেরির টাকা এলেও',
      'ম্যানেজার নিজের জমার অনুরোধ নিজে অনুমোদন করতে পারেন না',
      'পুরো ওয়ার্কস্পেস JSON, মাসের হিসাব CSV বা PDF-এ',
    ],
    pricingTitle: 'সহজ মূল্য, হোয়াটসঅ্যাপে',
    pricingIntro: 'শুরু করতে কার্ড লাগে না, ফ্রি প্ল্যান কোনো ট্রায়ালও নয়।',
    freeName: 'ফ্রি',
    freePrice: '৳০',
    freeBody: 'যে মেস শুধু হিসাব ঠিক চায়।',
    freePoints: ['সদস্য ও মাস Unlimited', 'মিল, বাজার, ইউটিলিটি, জমা', 'নিষ্পত্তি, এক্সপোর্ট, খাতা', 'বাংলা ও ডার্ক মোড'],
    proName: 'প্রো',
    proPrice: '৳১৯৯ / মাস',
    proBody: 'যে মেস একটু বাড়তি যত্ন চায়।',
    proPoints: ['ফ্রি-র সবকিছু', 'গিল্ড কার্ডে প্রো ব্যাজ', 'হোয়াটসঅ্যাপে অগ্রাধিকার সহায়তা', 'যেকোনো মাসে বন্ধ — ম্যানুয়াল বিলিং'],
    proCta: 'হোয়াটসঅ্যাপে প্রো নিন',
    faqTitle: 'মেস ম্যানেজারের প্রশ্ন',
    faq: [
      { q: 'আমাদের খাতা কে দেখতে পারে?', a: 'শুধু আপনার মেসের সক্রিয় সদস্যরা। Postgres-এ Row-Level Security থাকে, তাই API key দিয়েও অন্য মেসের তথ্য পড়া যায় না।' },
      { q: 'এক ফোনে দুইজন ব্যবহার করলে?', a: 'Mess Hub → Account থেকে সাইন আউট করুন। পরেরজন নিজের Google বা ইমেইলে ঢুকবে; খাতা ডিভাইসে নয়, মেসের সাথে থাকে।' },
      { q: 'ম্যানেজার পুরনো মাস বদলাতে পারেন?', a: 'না। বন্ধ মাস জমে যায়। দেরির টাকা পাশে নিষ্পত্তি হিসেবে লেখা হয়, তাই ইতিহাস আর বাকি দুটোই ঠিক থাকে।' },
      { q: 'অ্যাপে টাকা নেওয়া হয়?', a: 'এখন না। জমা শুধু লেখা হয়, চার্জ নয়। প্রো হোয়াটসঅ্যাপে ঠিক হয়, যাতে অ্যাপ পেমেন্ট গেটওয়ের বাইরে থাকে।' },
    ],
    footer: 'বাংলাদেশের মেসের জন্য বানানো।',
    privacy: 'গোপনীয়তা',
    terms: 'শর্তাবলি',
    whatsapp: 'হোয়াটসঅ্যাপ ০১৭৯৭৯৮৯৪১২',
  },
}

const FEATURE_ICONS = [BarChart3, ShieldCheck, Wallet, Users, WifiOff, Languages]
const HOW_ICONS = [Users, UtensilsCrossed, FileDown]

export function LandingPage() {
  const { backend, busy, signInDemo } = useApp()
  const { lang } = useI18n()
  const copy = COPY[lang]

  return (
    <div className="min-h-dvh bg-ink-50">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Mess Mates" className="h-10 w-10 rounded-xl object-cover" />
            <span>
              <span className="block text-sm font-extrabold leading-tight text-ink-900">Mess Mates</span>
              <span className="block text-[10px] font-semibold text-ink-400">মেসের হিসাব, পরিষ্কার</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-5 text-xs font-bold text-ink-500 md:flex">
            {[
              { id: 'features', label: copy.navFeatures },
              { id: 'how', label: copy.navHow },
              { id: 'pricing', label: copy.navPricing },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })}
                className="hover:text-brand-700"
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <LanguageToggle />
            <Link
              to="/signin"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-brand-700"
            >
              {copy.signIn}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-guild-hero px-4 pb-14 pt-12 text-white sm:px-6 sm:pt-16">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-flame-500/20 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-200">{copy.eyebrow}</p>
              <h1 className="mt-3 max-w-2xl text-[2.1rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
                {copy.headline}
                <span className="mt-1 block text-brand-200">{copy.headlineAccent}</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-brand-50/80 sm:text-base">{copy.intro}</p>
              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                <Link
                  to="/signin"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-brand-800 transition hover:bg-brand-50"
                >
                  {copy.cta} <ArrowRight className="h-4 w-4" />
                </Link>
                {backend.mode === 'demo' ? (
                  <button
                    onClick={() => void signInDemo()}
                    disabled={busy}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15 disabled:opacity-60"
                  >
                    {copy.demo}
                  </button>
                ) : null}
              </div>
              <p className="mt-3 text-[11px] font-semibold text-brand-100/70">{copy.note}</p>
            </div>

            <div className="relative mx-auto w-full max-w-sm">
              <div className="absolute -inset-3 rounded-[2rem] bg-white/10 blur-xl" />
              <div className="relative rounded-[1.6rem] border border-white/15 bg-white p-4 text-ink-900 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">{copy.mockLabel}</p>
                    <p className="mt-0.5 text-sm font-extrabold">Chittagong Boys Mess</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase text-emerald-700">Live</span>
                </div>
                <div className="mt-4 rounded-2xl bg-guild-hero p-4 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-brand-100/70">{copy.mockRate}</p>
                  <p className="mt-1 text-3xl font-extrabold tabular-nums">৳{localDigits('49.58')}</p>
                  <p className="text-[10px] text-brand-50/70">per meal · approved bazar ÷ meals</p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: copy.mockMeals, value: localDigits('353') },
                    { label: copy.mockBazar, value: `৳${localDigits('17,500')}` },
                    { label: copy.mockSettled, value: `৳${localDigits('25,000')}` },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-ink-50 px-2 py-2">
                      <p className="text-[9px] font-bold uppercase text-ink-400">{item.label}</p>
                      <p className="text-xs font-extrabold tabular-nums text-ink-800">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-xl border border-ink-100 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase text-ink-400">{copy.mockBalance}</p>
                    <Wallet className="h-3.5 w-3.5 text-ink-300" />
                  </div>
                  <p className="mt-1 text-xl font-extrabold tabular-nums text-emerald-600">৳{localDigits('1,159.06')}</p>
                  <p className="text-[10px] text-ink-400">Refundable — collect at settlement</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{copy.featuresTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{copy.featuresIntro}</p>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {copy.features.map((feature, index) => {
              const Icon = FEATURE_ICONS[index] ?? Check
              return (
                <article key={feature.title} className="card p-4">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="mt-3 text-sm font-extrabold text-ink-900">{feature.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-ink-500">{feature.body}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section id="how" className="border-y border-ink-100 bg-white px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{copy.howTitle}</h2>
            <div className="mt-7 grid gap-3 md:grid-cols-3">
              {copy.how.map((step, index) => {
                const Icon = HOW_ICONS[index] ?? Check
                return (
                  <div key={step.title} className="rounded-2xl border border-ink-100 p-5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-ink-900 text-white">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-3xl font-extrabold text-ink-100">0{index + 1}</span>
                    </div>
                    <h3 className="mt-3 text-sm font-extrabold text-ink-900">{step.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-ink-500">{step.body}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="grid gap-6 rounded-3xl bg-ink-900 p-6 text-white sm:p-8 lg:grid-cols-2 lg:p-10">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-200">
                <ShieldCheck className="h-3 w-3" /> Trust
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{copy.trustTitle}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{copy.trustBody}</p>
            </div>
            <ul className="space-y-2.5 self-center">
              {copy.trustPoints.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-white/85">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> {point}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{copy.pricingTitle}</h2>
          <p className="mt-2 text-sm text-ink-500">{copy.pricingIntro}</p>
          <div className="mt-7 grid gap-3 md:grid-cols-2">
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-ink-900">{copy.freeName}</h3>
                <Pill>Free forever</Pill>
              </div>
              <p className="mt-2 text-3xl font-extrabold tabular-nums text-ink-900">{copy.freePrice}</p>
              <p className="mt-1 text-xs text-ink-500">{copy.freeBody}</p>
              <ul className="mt-4 space-y-2">
                {copy.freePoints.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-xs text-ink-600">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> {point}
                  </li>
                ))}
              </ul>
              <Link
                to="/signin"
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-brand-700"
              >
                {copy.cta} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="card relative overflow-hidden border-amber-200 p-5 ring-1 ring-amber-200">
              <div className="absolute right-0 top-0 rounded-bl-2xl bg-amber-400 px-3 py-1 text-[9px] font-extrabold uppercase tracking-wide text-ink-900">
                Optional
              </div>
              <div className="flex items-center gap-1.5">
                <Crown className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-extrabold text-ink-900">{copy.proName}</h3>
              </div>
              <p className="mt-2 text-3xl font-extrabold tabular-nums text-ink-900">{copy.proPrice}</p>
              <p className="mt-1 text-xs text-ink-500">{copy.proBody}</p>
              <ul className="mt-4 space-y-2">
                {copy.proPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-xs text-ink-600">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" /> {point}
                  </li>
                ))}
              </ul>
              <a
                href="https://wa.me/8801797989412?text=Mess%20Mates%20Pro"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-ink-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-ink-800"
              >
                {copy.proCta} <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </section>

        <section className="border-y border-ink-100 bg-white px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{copy.faqTitle}</h2>
            <div className="mt-5 divide-y divide-ink-100">
              {copy.faq.map((item) => (
                <details key={item.q} className="group py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-ink-800">
                    {item.q}
                    <span className="text-ink-300 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-xs leading-relaxed text-ink-500">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 border-t border-ink-100 pt-6 text-[11px] text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5" /> {copy.footer}
          </p>
          <div className="flex flex-wrap items-center gap-4 font-bold">
            <Link to="/privacy" className="hover:text-brand-700">{copy.privacy}</Link>
            <Link to="/terms" className="hover:text-brand-700">{copy.terms}</Link>
            <a href="https://wa.me/8801797989412" target="_blank" rel="noopener noreferrer" className="hover:text-brand-700">
              {copy.whatsapp}
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
