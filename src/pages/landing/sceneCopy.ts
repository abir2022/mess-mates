import type { Lang } from './copy'

export type SceneStage = 0 | 1 | 2 | 3

export type SceneCharacter = {
  name: string
  role: string
  line: string
}

export type SceneCopy = {
  eyebrow: string
  badge: string
  title: string
  intro: string
  scroll: string
  hint: string
  loading: string
  fallback: string
  skip: string
  cta: string
  meet: string
  clear: string
  stages: {
    label: string
    kicker: string
    title: string
    body: string
  }[]
  characters: {
    rafi: SceneCharacter
    mim: SceneCharacter
  }
  controls: string
}

export const SCENE_COPY: Record<Lang, SceneCopy> = {
  en: {
    eyebrow: '3D CORRIDOR · HOSTEL 7 · FLOOR 3',
    badge: 'SCROLL-DRIVEN',
    title: 'Walk the corridor.',
    intro: 'Scroll to move through the hostel. Two wings, one shared ledger, and a month-end boss waiting at the end.',
    scroll: 'Scroll to walk',
    hint: 'Move your cursor to look · tap a character to meet them',
    loading: 'Building the corridor…',
    fallback: '3D is off on this device, so this is the concept art. Everything below still works.',
    skip: 'Skip to the story',
    cta: 'Start your mess',
    meet: 'Meet',
    clear: 'Close',
    stages: [
      {
        label: 'ENTRY',
        kicker: '02:00 AM · FLOOR 3',
        title: 'The corridor is the menu.',
        body: 'Warm light under two doors. A rice cooker humming somewhere. Every mess story starts in this hallway.',
      },
      {
        label: "BOYS' WING",
        kicker: 'ROOM 302 · CURFEW? NEVER HEARD OF IT',
        title: 'Rafi is still awake.',
        body: 'Headphones on, dinner unlogged, one ranked match from sleep. He will remember at 2 AM. The ledger will remember exactly.',
      },
      {
        label: "GIRLS' WING",
        kicker: 'ROOM 305 · THE RECEIPTS ARE IN',
        title: 'Mim has the receipts.',
        body: 'Bazar bags by the door, a Friday poll already running, and a chess board waiting on the rooftop. The guild captain is prepared.',
      },
      {
        label: 'LEDGER ROOM',
        kicker: '11:59 PM · MONTH-END',
        title: 'Enter the ledger.',
        body: 'One shared book, every taka traced, every month closed with proof. Month-end does not stand a chance.',
      },
    ],
    characters: {
      rafi: {
        name: 'Rafi',
        role: 'The night owl',
        line: 'I log dinner at 2 AM. Judge me after the settlement.',
      },
      mim: {
        name: 'Mim',
        role: 'The guild captain',
        line: 'Close the month, then meet me on the board.',
      },
    },
    controls: 'Corridor progress',
  },
  bn: {
    eyebrow: 'থ্রিডি করিডোর · হোস্টেল ৭ · ফ্লোর ৩',
    badge: 'স্ক্রল-চালিত',
    title: 'করিডোরে হাঁটুন।',
    intro: 'স্ক্রল করে হোস্টেলের ভেতর এগিয়ে যান। দুই উইং, এক খাতা, আর শেষে অপেক্ষা করছে মাস-শেষ বস।',
    scroll: 'হাঁটতে স্ক্রল করুন',
    hint: 'কার্সর নাড়িয়ে তাকান · চরিত্রে ট্যাপ করে দেখা করুন',
    loading: 'করিডোর তৈরি হচ্ছে…',
    fallback: 'এই ডিভাইসে থ্রিডি বন্ধ, তাই কনসেপ্ট আর্ট দেখানো হচ্ছে। নিচের সবকিছু আগের মতোই কাজ করবে।',
    skip: 'সরাসরি গল্পে যান',
    cta: 'মেস শুরু করুন',
    meet: 'দেখা করুন',
    clear: 'বন্ধ',
    stages: [
      {
        label: 'প্রবেশ',
        kicker: 'রাত ২টা · ফ্লোর ৩',
        title: 'করিডোরটাই মেনু।',
        body: 'দুই দরজার নিচে উষ্ণ আলো। কোথাও রাইস কুকারের শব্দ। প্রতিটি মেসের গল্প এই করিডোর থেকেই শুরু।',
      },
      {
        label: 'ছেলেদের উইং',
        kicker: 'রুম ৩০২ · কারফিউ? শুনিনি',
        title: 'রাফি এখনো জেগে।',
        body: 'কানে হেডফোন, ডিনার এখনো লেখা হয়নি, ঘুমের আগে আরেকটা ম্যাচ। রাত ২টায় তার মনে পড়বে। খাতা ঠিকঠাক মনে রাখবে।',
      },
      {
        label: 'মেয়েদের উইং',
        kicker: 'রুম ৩০৫ · রসিদ হাজির',
        title: 'মিমের কাছে সব রসিদ আছে।',
        body: 'দরজার পাশে বাজারের ব্যাগ, শুক্রবারের পোল চলছে, আর ছাদে দাবার বোর্ড অপেক্ষা করছে। গিল্ড ক্যাপ্টেন তৈরি।',
      },
      {
        label: 'খাতার ঘর',
        kicker: 'রাত ১১:৫৯ · মাসের শেষ',
        title: 'খাতায় ঢুকুন।',
        body: 'এক খাতা, প্রতিটি টাকার হিসাব, প্রতি মাস প্রমাণসহ বন্ধ। মাসের শেষের আর কোনো সুযোগ নেই।',
      },
    ],
    characters: {
      rafi: {
        name: 'রাফি',
        role: 'রাতজাগা গেমার',
        line: 'রাত ২টায় ডিনার লিখি। হিসাবের পরে বিচার করো।',
      },
      mim: {
        name: 'মিম',
        role: 'গিল্ড ক্যাপ্টেন',
        line: 'মাস বন্ধ করো, তারপর বোর্ডে দেখা হবে।',
      },
    },
    controls: 'করিডোরের অগ্রগতি',
  },
}
