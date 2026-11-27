import type { Lang } from './i18n'

/**
 * The guided tour speaks in the voices of the two characters from the landing
 * corridor: Rafi (the night owl who forgets to log dinner) and Mim (the guild
 * captain who closes the month). Every step points at a real element through a
 * `data-tour` anchor, so the copy can never drift away from the UI silently.
 */
export type CastId = 'rafi' | 'mim'

export type TourId = 'dashboard' | 'meals' | 'arena' | 'hub' | 'settlement'

export type TourStep = {
  anchor?: string
  who: CastId
  title: string
  body: string
}

export const CAST_IMG: Record<CastId, string> = {
  rafi: '/app/rafi.jpg',
  mim: '/app/mim.jpg',
}

export function tourForPath(pathname: string): TourId {
  if (pathname.startsWith('/meals')) return 'meals'
  if (pathname.startsWith('/arena')) return 'arena'
  if (pathname.startsWith('/hub')) return 'hub'
  if (pathname.startsWith('/settlement')) return 'settlement'
  return 'dashboard'
}

export const TOURS: Record<TourId, Record<Lang, TourStep[]>> = {
  dashboard: {
    en: [
      {
        anchor: 'quests',
        who: 'mim',
        title: 'Start at the quest board',
        body: 'Every month starts here. Each quest is one real action — log meals, add a bazar, cast a vote. Clear all six and the board packs itself away until you tap this chip.',
      },
      {
        anchor: 'month',
        who: 'mim',
        title: 'Pick the month',
        body: 'This switch changes the whole screen: live month, last month, or any archive. Nothing is ever deleted.',
      },
      {
        anchor: 'balance',
        who: 'rafi',
        title: 'Your balance, in one number',
        body: 'Negative means you still owe the mess; positive means the mess owes you. Log your meals before month-end and this sorts itself out.',
      },
      {
        anchor: 'members',
        who: 'mim',
        title: 'The squad sheet',
        body: 'Meals, bazar, deposits and what everyone owes. Forget where something lives? Tap my face in the menu and I’ll walk you there.',
      },
    ],
    bn: [
      {
        anchor: 'quests',
        who: 'mim',
        title: 'কোয়েস্ট বোর্ড থেকেই শুরু',
        body: 'প্রতি মাস এখান থেকেই শুরু। প্রতিটি কোয়েস্ট একটি আসল কাজ — মিল লেখা, বাজার যোগ করা, ভোট দেওয়া। ছয়টিই শেষ হলে বোর্ডটা সরে যায়; আবার দেখতে এই বাটনে চাপুন।',
      },
      {
        anchor: 'month',
        who: 'mim',
        title: 'মাস বেছে নিন',
        body: 'এই সুইচ পুরো স্ক্রিন বদলে দেয়: চলতি মাস, গত মাস বা যেকোনো পুরনো মাস। কিছুই মুছে যায় না।',
      },
      {
        anchor: 'balance',
        who: 'rafi',
        title: 'একটি সংখ্যায় আপনার হিসাব',
        body: 'মাইনাস মানে মেসকে এখনো টাকা দিতে হবে; প্লাস মানে মেস আপনার টাকা পাওনা। মাস শেষের আগে মিল লিখে নিন, বাকিটা নিজেই ঠিক হয়ে যাবে।',
      },
      {
        anchor: 'members',
        who: 'mim',
        title: 'স্কোয়াড শিট',
        body: 'মিল, বাজার, জমা আর সবার পাওনা। কোথায় কী আছে ভুলে গেলে মেনুতে আমার ছবিতে চাপ দিন, আমি পথ দেখিয়ে নেব।',
      },
    ],
  },
  meals: {
    en: [
      {
        anchor: 'meals-tabs',
        who: 'rafi',
        title: 'Four tabs, one ledger',
        body: 'Meals, bazar, utilities and deposits. You are on meals — the one you will touch every single day.',
      },
      {
        anchor: 'day-console',
        who: 'mim',
        title: 'The day console',
        body: 'Pick a date and the week’s totals appear. Copy yesterday when today looks the same. A lock means the kitchen has already closed that day.',
      },
      {
        anchor: 'squad',
        who: 'mim',
        title: 'The squad grid',
        body: 'Tap + or − on your own tile for breakfast, lunch, dinner and guests. Everyone’s tile updates the meal rate instantly.',
      },
    ],
    bn: [
      {
        anchor: 'meals-tabs',
        who: 'rafi',
        title: 'চার ট্যাব, এক খাতা',
        body: 'মিল, বাজার, ইউটিলিটি আর জমা। আপনি এখন মিল ট্যাবে — যেটা প্রতিদিনই লাগবে।',
      },
      {
        anchor: 'day-console',
        who: 'mim',
        title: 'দিন কনসোল',
        body: 'তারিখ বাছুন, সপ্তাহের টোটাল দেখুন। আজকের মতোই হলে গতদিনের কপি করুন। তালা মানে রান্নাঘর ওই দিন বন্ধ করেছে।',
      },
      {
        anchor: 'squad',
        who: 'mim',
        title: 'স্কোয়াড গ্রিড',
        body: 'নিজের টাইলে নাশতা, দুপুর, রাত আর অতিথির জন্য + বা − চাপুন। সবার টাইল সাথে সাথে মিল রেট বদলায়।',
      },
    ],
  },
  arena: {
    en: [
      {
        anchor: 'arena-tabs',
        who: 'rafi',
        title: 'Welcome to the arena',
        body: 'Polls settle mess business, games earn guild points. Three tabs: ballots, games and the guild ladder.',
      },
      {
        anchor: 'arena-points',
        who: 'rafi',
        title: 'Guild points',
        body: 'Every win and every closed poll adds to the mess total. This is the number you get to brag about.',
      },
      {
        anchor: 'arena-polls',
        who: 'mim',
        title: 'Cast your vote',
        body: 'One tap per ballot and the bar fills live. Contentious? Open the chat in Hub and argue in style.',
      },
    ],
    bn: [
      {
        anchor: 'arena-tabs',
        who: 'rafi',
        title: 'অ্যারেনায় স্বাগতম',
        body: 'পোল ঠিক করে মেসের সিদ্ধান্ত, গেমে জমে গিল্ড পয়েন্ট। তিন ট্যাব: ব্যালট, গেম আর গিল্ড ল্যাডার।',
      },
      {
        anchor: 'arena-points',
        who: 'rafi',
        title: 'গিল্ড পয়েন্ট',
        body: 'প্রতিটি জয় আর বন্ধ হওয়া পোল মেসের টোটালে যোগ হয়। এই সংখ্যাটাই আপনার গর্ব।',
      },
      {
        anchor: 'arena-polls',
        who: 'mim',
        title: 'ভোট দিন',
        body: 'প্রতি ব্যালটে এক ট্যাপ, বার সাথে সাথে ভরে। মতভেদ? হাবের চ্যাট খুলে স্টাইলে তর্ক করুন।',
      },
    ],
  },
  hub: {
    en: [
      {
        anchor: 'hub-tabs',
        who: 'mim',
        title: 'Squad HQ',
        body: 'Board, roster, council, ledger and settings. The board is where the mess actually talks.',
      },
      {
        anchor: 'hub-chat',
        who: 'rafi',
        title: 'Comms',
        body: 'Type, hit Enter, done. Managers can pin an announcement so nobody blames the algorithm.',
      },
      {
        anchor: 'hub-board-side',
        who: 'mim',
        title: 'Pinned orders',
        body: 'Announcements and safety notes live here. Bazar duty is under Roster — check it before you buy groceries.',
      },
    ],
    bn: [
      {
        anchor: 'hub-tabs',
        who: 'mim',
        title: 'স্কোয়াড হেডকোয়ার্টার',
        body: 'বোর্ড, রোস্টার, কাউন্সিল, খাতা আর সেটিংস। বোর্ডেই আসলে মেসের কথা হয়।',
      },
      {
        anchor: 'hub-chat',
        who: 'rafi',
        title: 'কমস',
        body: 'লিখুন, Enter চাপুন, শেষ। ম্যানেজার নোটিশ পিন করতে পারেন, যাতে দোষ অ্যালগরিদমের না পড়ে।',
      },
      {
        anchor: 'hub-board-side',
        who: 'mim',
        title: 'পিন করা নির্দেশ',
        body: 'নোটিশ আর নিরাপত্তা নোট এখানে থাকে। বাজারের ডিউটি “রোস্টার”-এ — বাজারে যাওয়ার আগে দেখে নিন।',
      },
    ],
  },
  settlement: {
    en: [
      {
        anchor: 'settle-actions',
        who: 'mim',
        title: 'The final score',
        body: 'Print it or download the branded PDF. This page is the proof you show at month-end.',
      },
      {
        anchor: 'settle-stats',
        who: 'rafi',
        title: 'The month in five numbers',
        body: 'Meals, bazar, utilities, deposits and the utility share. If these look right, the split is right.',
      },
      {
        anchor: 'settle-transfers',
        who: 'mim',
        title: 'Who pays whom',
        body: 'The shortest path to zero — each line is one real payment. Copy the plan into WhatsApp and go collect.',
      },
    ],
    bn: [
      {
        anchor: 'settle-actions',
        who: 'mim',
        title: 'চূড়ান্ত স্কোর',
        body: 'প্রিন্ট করুন বা ব্র্যান্ডেড PDF নামান। মাস শেষে এটাই আপনার প্রমাণ।',
      },
      {
        anchor: 'settle-stats',
        who: 'rafi',
        title: 'পাঁচ সংখ্যায় পুরো মাস',
        body: 'মিল, বাজার, ইউটিলিটি, জমা আর ইউটিলিটি ভাগ। এগুলো ঠিক থাকলে ভাগও ঠিক।',
      },
      {
        anchor: 'settle-transfers',
        who: 'mim',
        title: 'কে কাকে দেবে',
        body: 'শূন্যে পৌঁছানোর সবচেয়ে ছোট পথ — প্রতিটি লাইন একটি আসল পেমেন্ট। প্ল্যান কপি করে হোয়াটসঅ্যাপে পাঠান।',
      },
    ],
  },
}
