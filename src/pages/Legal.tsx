import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useI18n, type Lang } from '../lib/i18n'

/**
 * Privacy and terms.
 *
 * These pages are readable without signing in, because a person deciding
 * whether to install the PWA should be able to check them first. The copy is
 * kept beside the component in both languages rather than in the main
 * dictionary: it is long-form legal text, not UI labels.
 */

interface Section {
  heading: string
  body: string[]
}

const privacy: Record<Lang, Section[]> = {
  en: [
    {
      heading: 'What we store',
      body: [
        'Your sign-in identity (Google account or email), the name and photo you choose to show, and the mess records you or your messmates enter: meals, bazar, fixed utilities, deposits, settlements, duty rosters, polls, votes and messages.',
        'Payment screenshots you attach are stored in a private bucket. They are visible only to members of that mess and are opened through short-lived signed links.',
      ],
    },
    {
      heading: 'Who can see it',
      body: [
        'Each mess is isolated at the database level with Row-Level Security. A member of one mess cannot read another mess’s records, and no one outside your mess can read your books.',
        'Crashes are recorded in the app’s own database with the route and message so your admin can fix them; no third-party analytics or advertising network is loaded.',
      ],
    },
    {
      heading: 'How long we keep it',
      body: [
        'Monthly books are permanent by design: a closed month keeps its figures so a settlement can never silently rewrite history. Chat keeps the latest 100 messages per mess.',
        'Leaving a mess does not delete the months you were part of; it removes your access. Account deletion is requested through the mess admin, and settled months keep their amounts without your name or sign-in details.',
      ],
    },
    {
      heading: 'Your controls',
      body: [
        'You can download every record in the mess as JSON, and the month statement as CSV or PDF, from Mess Hub → Settings. You can correct your display name per mess at any time.',
        'Questions or a deletion request: message the Mess Mates team on WhatsApp at 01797989412.',
      ],
    },
  ],
  bn: [
    {
      heading: 'আমরা কী সংরক্ষণ করি',
      body: [
        'আপনার সাইন-ইন পরিচয় (গুগল অ্যাকাউন্ট বা ইমেইল), আপনি যে নাম ও ছবি দেখাতে বেছে নেন, এবং আপনি বা আপনার মেসের সদস্যরা যে হিসাব লেখেন: মিল, বাজার, নির্দিষ্ট ইউটিলিটি, জমা, নিষ্পত্তি, ডিউটি রোস্টার, ভোট ও বার্তা।',
        'আপনি যে পেমেন্টের স্ক্রিনশট সংযুক্ত করেন তা একটি ব্যক্তিগত বাকেটে থাকে। শুধু সেই মেসের সদস্যরা তা দেখতে পারেন, আর তা খোলে স্বল্পমেয়াদি সাইন করা লিংকে।',
      ],
    },
    {
      heading: 'কে দেখতে পারে',
      body: [
        'প্রতিটি মেস ডেটাবেস স্তরে Row-Level Security দিয়ে আলাদা করা। এক মেসের সদস্য অন্য মেসের হিসাব পড়তে পারেন না, আর আপনার মেসের বাইরের কেউ আপনার খাতা দেখতে পারে না।',
        'অ্যাপের ত্রুটি অ্যাপের নিজের ডেটাবেসে রুট ও বার্তাসহ জমা হয়, যাতে আপনার অ্যাডমিন ঠিক করতে পারেন; কোনো তৃতীয় পক্ষের অ্যানালিটিক্স বা বিজ্ঞাপন নেটওয়ার্ক লোড হয় না।',
      ],
    },
    {
      heading: 'কতদিন রাখি',
      body: [
        'মাসিক খাতা ইচ্ছাকৃতভাবে স্থায়ী: বন্ধ মাস তার সংখ্যা ধরে রাখে, যাতে নিষ্পত্তি কখনো ইতিহাস নীরবে বদলে দিতে না পারে। চ্যাটে প্রতি মেসে সর্বশেষ ১০০টি বার্তা থাকে।',
        'মেস ছাড়লে আপনি যে মাসগুলোর অংশ ছিলেন সেগুলো মুছে যায় না; শুধু আপনার অ্যাক্সেস বন্ধ হয়। অ্যাকাউন্ট মুছতে মেস অ্যাডমিনের অনুমোদন লাগে, আর নিষ্পত্তি হওয়া মাসগুলোর টাকার অঙ্ক থাকে কিন্তু আপনার নাম ও সাইন-ইন তথ্য সরে যায়।',
      ],
    },
    {
      heading: 'আপনার নিয়ন্ত্রণ',
      body: [
        'মেস হাব → সেটিংস থেকে পুরো মেসের সব রেকর্ড JSON হিসেবে, আর মাসের বিবরণ CSV বা PDF হিসেবে নামাতে পারেন। যেকোনো সময় প্রতি মেসের প্রদর্শিত নাম বদলাতে পারেন।',
        'প্রশ্ন বা অ্যাকাউন্ট মোছার অনুরোধ: হোয়াটসঅ্যাপে ০১৭৯৭৯৮৯৪১২ নম্বরে মেস মেটস দলকে জানান।',
      ],
    },
  ],
}

const terms: Record<Lang, Section[]> = {
  en: [
    {
      heading: 'The service',
      body: [
        'Mess Mates keeps the books for a shared mess: meals, bazar, utilities, deposits and month-end settlement, plus duty rosters, polls and optional games. It is a record-keeping tool, not a bank or a payment processor.',
        'Money moves between you and your messmates directly (cash, bKash, Nagad or bank). The app records what you tell it; it does not hold or transfer funds.',
      ],
    },
    {
      heading: 'Your account and your mess',
      body: [
        'One account can be in one mess at a time for now. Joining with an invite code may need an admin’s approval, and an admin can remove a member only through the mess’s own vote or approved request.',
        'You are responsible for the accuracy of what you enter. A manager approves bazar and payments; a member can request a correction through the mess, but cannot rewrite a closed month.',
      ],
    },
    {
      heading: 'Acceptable use',
      body: [
        'Do not use the app to harass a messmate, upload unlawful content, or attempt to read another mess’s data. The app may suspend an account that does.',
        'The app is provided as-is. Back up anything you cannot afford to lose with the JSON export; no service can promise that a phone, a browser or a network never fails.',
      ],
    },
    {
      heading: 'Mess Mates Pro',
      body: [
        'The core app is free: every member, every past month and every export. Pro is an optional extra for the whole mess, arranged manually over WhatsApp while there is no payment gateway in the app.',
        'Pro unlocks premium avatar frames and priority setup help. It does not change the books, and letting it lapse never hides your history.',
      ],
    },
  ],
  bn: [
    {
      heading: 'পরিষেবা',
      body: [
        'মেস মেটস একটি শেয়ার করা মেসের হিসাব রাখে: মিল, বাজার, ইউটিলিটি, জমা ও মাস শেষের নিষ্পত্তি, সাথে ডিউটি রোস্টার, ভোট ও ঐচ্ছিক গেম। এটি হিসাব রাখার যন্ত্র, ব্যাংক বা পেমেন্ট প্রসেসর নয়।',
        'টাকা আপনার ও আপনার মেসের সদস্যদের মধ্যে সরাসরি চলে (নগদ, বিকাশ, নগদ বা ব্যাংক)। অ্যাপ শুধু আপনি যা জানান তা লিখে রাখে; এটি টাকা ধরে বা পাঠায় না।',
      ],
    },
    {
      heading: 'আপনার অ্যাকাউন্ট ও মেস',
      body: [
        'এখন এক অ্যাকাউন্ট একসাথে একটিমাত্র মেসে থাকতে পারে। ইনভাইট কোড দিয়ে যোগ দিতে অ্যাডমিনের অনুমোদন লাগতে পারে, আর অ্যাডমিন কাউকে সরাতে পারেন শুধু মেসের নিজের ভোট বা অনুমোদিত অনুরোধে।',
        'আপনি যা লেখেন তার নির্ভুলতার দায় আপনার। ম্যানেজার বাজার ও পেমেন্ট অনুমোদন করেন; সদস্য সংশোধনের অনুরোধ করতে পারেন, কিন্তু বন্ধ মাস নীরবে বদলাতে পারেন না।',
      ],
    },
    {
      heading: 'গ্রহণযোগ্য ব্যবহার',
      body: [
        'মেসের সদস্যকে বিরক্ত করা, বেআইনি কিছু আপলোড করা বা অন্য মেসের তথ্য পড়ার চেষ্টা করবেন না। এমন করলে অ্যাকাউন্ট স্থগিত হতে পারে।',
        'অ্যাপটি যেমন আছে তেমনই দেওয়া হয়। যা হারানো চলবে না তা JSON এক্সপোর্ট দিয়ে ব্যাকআপ রাখুন; কোনো পরিষেবাই ফোন, ব্রাউজার বা নেটওয়ার্ক কখনো ব্যর্থ হবে না বলে প্রতিশ্রুতি দিতে পারে না।',
      ],
    },
    {
      heading: 'মেস মেটস প্রো',
      body: [
        'মূল অ্যাপ ফ্রি: সব সদস্য, সব পুরনো মাস ও সব এক্সপোর্ট। প্রো পুরো মেসের জন্য ঐচ্ছিক অতিরিক্ত, অ্যাপে পেমেন্ট গেটওয়ে না থাকায় হোয়াটসঅ্যাপে হাতে হাতে ব্যবস্থা করা হয়।',
        'প্রো প্রিমিয়াম অ্যাভাটার ফ্রেম ও অগ্রাধিকার সেটআপ সহায়তা খোলে। এটি হিসাব বদলায় না, আর মেয়াদ শেষ হলেও আপনার ইতিহাস লুকায় না।',
      ],
    },
  ],
}

export function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const { t, lang } = useI18n()
  const sections = (kind === 'privacy' ? privacy : terms)[lang]
  const title = kind === 'privacy' ? t('legal.privacyTitle') : t('legal.termsTitle')

  return (
    <div className="min-h-dvh bg-ink-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-xs font-bold text-brand-700 hover:text-brand-800"
        >
          <ArrowLeft className="h-4 w-4" /> {t('legal.back')}
        </Link>

        <div className="card mt-4 p-5 sm:p-7">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-ink-900">{title}</h1>
              <p className="text-[11px] font-semibold text-ink-400">{t('legal.updated')}</p>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-sm font-extrabold text-ink-900">{section.heading}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="mt-1.5 text-xs leading-relaxed text-ink-600">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-ink-100 pt-4 text-[11px] font-bold">
            {kind === 'privacy' ? (
              <Link to="/terms" className="text-brand-700 hover:text-brand-800">
                {t('legal.termsTitle')}
              </Link>
            ) : (
              <Link to="/privacy" className="text-brand-700 hover:text-brand-800">
                {t('legal.privacyTitle')}
              </Link>
            )}
            <a href="https://wa.me/8801797989412" className="text-brand-700 hover:text-brand-800">
              WhatsApp 01797989412
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
