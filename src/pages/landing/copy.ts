export type Lang = 'en' | 'bn'

export type CharacterIcon =
  | 'gamepad'
  | 'basket'
  | 'clipboard'
  | 'chef'
  | 'trophy'
  | 'stethoscope'
  | 'megaphone'
  | 'code'

type Chapter = {
  id: string
  level: string
  kicker: string
  title: string
  body: string
  quote: string
  image: string
  alt: string
}

export type LandingCopy = {
  nav: {
    story: string
    features: string
    how: string
    pricing: string
    signIn: string
    start: string
    startShort: string
    join: string
    menu: string
  }
  hero: {
    eyebrow: string
    titleA: string
    titleB: string
    intro: string
    cta: string
    join: string
    demo: string
    note: string
    scroll: string
    badges: string[]
    imageAlt: string
    ledger: {
      label: string
      mess: string
      live: string
      rate: string
      rateValue: string
      perMeal: string
      meals: string
      mealsValue: string
      bazar: string
      bazarValue: string
      settled: string
      settledValue: string
      balance: string
      balanceValue: string
      balanceNote: string
      formula: string
    }
  }
  intro: {
    label: string
    title: string
    body: string
    stats: { value: string; label: string }[]
  }
  bazar: Chapter & {
    card: {
      label: string
      title: string
      hint: string
      approved: string
      pending: string
      approve: string
      undo: string
      mealRate: string
      meals: string
      perMeal: string
      rateNote: string
      receipts: { id: string; name: string; amount: number; initial: boolean }[]
    }
  }
  meals: Chapter & {
    card: {
      label: string
      title: string
      hint: string
      total: string
      guest: string
      guestHint: string
      days: string[]
      meals: { short: string; long: string }[]
      initial: number[][]
    }
  }
  deposit: Chapter & {
    card: {
      label: string
      title: string
      hint: string
      deposit: string
      bazarPaid: string
      balance: string
      trail: string
      recorded: string
      missing: string
      voidNote: string
      members: {
        name: string
        role: string
        deposit: number
        bazar: number
        balance: number
        recorded: boolean
        status: string
        trail: string
      }[]
    }
  }
  boss: Chapter & {
    card: {
      hp: string
      hint: string
      settle: string
      finalBlow: string
      closed: string
      rows: { from: string; to: string; amount: number }[]
      total: string
      note: string
      cta: string
    }
  }
  guild: Chapter & {
    card: {
      label: string
      title: string
      hint: string
      pollQuestion: string
      options: [string, string]
      initialVotes: [number, number]
      vote: string
      voted: string
      dice: string
      roll: string
      rolled: string
      leaderboard: string
      sample: string
      rows: { name: string; points: number }[]
    }
  }
  squad: Chapter & {
    card: {
      hint: string
      characters: { name: string; role: string; line: string; icon: CharacterIcon }[]
    }
  }
  features: {
    label: string
    title: string
    intro: string
    items: { title: string; body: string }[]
  }
  how: {
    label: string
    title: string
    steps: { title: string; body: string }[]
  }
  trust: {
    label: string
    title: string
    body: string
    points: string[]
  }
  pricing: {
    label: string
    title: string
    intro: string
    freeName: string
    freePrice: string
    freeBadge: string
    freeBody: string
    freePoints: string[]
    proName: string
    proPrice: string
    proBadge: string
    proBody: string
    proPoints: string[]
    proCta: string
    freeCta: string
  }
  faq: {
    label: string
    title: string
    items: { q: string; a: string }[]
  }
  final: {
    label: string
    title: string
    body: string
    cta: string
    join: string
  }
  footer: {
    made: string
    privacy: string
    terms: string
    whatsapp: string
  }
}

export const COPY: Record<Lang, LandingCopy> = {
  en: {
    nav: {
      story: 'The story',
      features: 'The loot',
      how: 'Quest log',
      pricing: 'Pricing',
      signIn: 'Sign in',
      start: 'Start your mess',
      startShort: 'Start',
      join: 'Join with a code',
      menu: 'Menu',
    },
    hero: {
      eyebrow: 'HOSTEL 7 · DHAKA · 2:00 AM',
      titleA: 'Hostel life is a co-op game.',
      titleB: 'Month-end is the final boss.',
      intro:
        'Meals, bazar, deposits and the month-end settlement — one shared book your whole squad can actually agree on. Built for Bangladeshi messes, in English and Bangla.',
      cta: 'Start your mess',
      join: 'Join with a code',
      demo: 'Try the demo',
      note: 'Free for the whole mess · No card · Works offline',
      scroll: 'Scroll to start',
      badges: ['CO-OP', '6–20 PLAYERS', 'MONTH-END BOSS'],
      imageAlt:
        'Comic illustration of a group of hostel students in a teal corridor, facing the shadow of a giant calculator and receipt.',
      ledger: {
        label: 'DEMO LEDGER',
        mess: 'Hostel 7 · Room 302',
        live: 'LIVE',
        rate: 'Meal rate',
        rateValue: '৳49.58',
        perMeal: 'per meal',
        meals: 'Meals',
        mealsValue: '353',
        bazar: 'Bazar',
        bazarValue: '৳17,500',
        settled: 'Settled',
        settledValue: '100%',
        balance: 'Your balance',
        balanceValue: '৳1,159.06',
        balanceNote: 'Refundable at settlement',
        formula: 'Approved bazar ÷ 353 meals',
      },
    },
    intro: {
      label: 'THE CAMPAIGN',
      title: 'Seven levels. Two wings. One shared ledger.',
      body:
        'This is Hostel 7. The wifi is bad, the bazar is expensive, and everyone remembers paying. Follow one month from the first receipt to the last transfer.',
      stats: [
        { value: '07', label: 'LEVELS' },
        { value: '02', label: 'WINGS' },
        { value: '01', label: 'LEDGER' },
      ],
    },
    bazar: {
      id: 'bazar',
      level: 'LEVEL 01',
      kicker: "BOYS' WING · 7:00 AM",
      title: 'The Bazar Run',
      body:
        'Tanvir comes back from Karwan Bazar with three bags, two receipts and one very strong opinion about tomato prices. The mess needs to know what was approved before the meal rate moves.',
      quote: '“Approved bazar counts. Pending waits.”',
      image: '/landing/bazar.jpg',
      alt: 'A young Bangladeshi man with headphones carrying a huge jute bag of vegetables through a busy market.',
      card: {
        label: 'BAZAR · THIS CYCLE',
        title: 'Approve the receipt. Move the rate.',
        hint: 'Tap a pending receipt to approve it. Watch the meal rate recalculate.',
        approved: 'Approved',
        pending: 'Pending',
        approve: 'Approve',
        undo: 'Undo',
        mealRate: 'Meal rate',
        meals: 'meals',
        perMeal: 'per meal',
        rateNote: 'Approved bazar ÷ 30 meals',
        receipts: [
          { id: 'vegetables', name: 'Vegetables', amount: 420, initial: true },
          { id: 'rice', name: 'Rice & oil', amount: 780, initial: true },
          { id: 'eggs', name: 'Eggs & onions', amount: 240, initial: false },
        ],
      },
    },
    meals: {
      id: 'meals',
      level: 'LEVEL 02',
      kicker: "GIRLS' WING · 2:00 AM",
      title: 'The 2 AM Meal Raid',
      body:
        'Mim, Jui and Nusrat open the fridge with the confidence of a heist crew. Then someone remembers the guest meal nobody logged. If it entered the pot, it enters the grid.',
      quote: '“If it entered the pot, it enters the grid.”',
      image: '/landing/meals.jpg',
      alt: 'Three young Bangladeshi women in a hostel room at night, sharing biryani around a rice cooker.',
      card: {
        label: 'MEALS · THIS WEEK',
        title: 'Tap a cell. Log the meal.',
        hint: 'A guest meal is still a meal. The total updates as you tap.',
        total: 'Meals logged',
        guest: 'Guest meal',
        guestHint: 'One extra plate, one extra entry.',
        days: ['Mon', 'Tue', 'Wed', 'Thu'],
        meals: [
          { short: 'B', long: 'Breakfast' },
          { short: 'L', long: 'Lunch' },
          { short: 'D', long: 'Dinner' },
        ],
        initial: [
          [1, 1, 1],
          [1, 0, 1],
          [1, 1, 0],
          [0, 1, 1],
        ],
      },
    },
    deposit: {
      id: 'deposit',
      level: 'LEVEL 03',
      kicker: 'BOTH WINGS · 11:40 PM',
      title: 'The Deposit Heist',
      body:
        'One group chat says the money was sent. The ledger says it never arrived. This is the chapter where memory meets a timestamp — and the manager cannot approve their own deposit.',
      quote: '“Memory is not a ledger.”',
      image: '/landing/deposit.jpg',
      alt: 'Two young men in a dark hostel room arguing over a glowing phone with a ledger on the screen.',
      card: {
        label: 'DEPOSITS · NOVEMBER',
        title: 'Open the trail.',
        hint: 'Tap a name to see what the ledger actually recorded.',
        deposit: 'Deposit',
        bazarPaid: 'Bazar paid',
        balance: 'Balance',
        trail: 'Audit trail',
        recorded: 'Deposit recorded',
        missing: 'No deposit found',
        voidNote: 'A mistake is voided with a reason — never silently deleted.',
        members: [
          {
            name: 'Rafi',
            role: 'Member',
            deposit: 0,
            bazar: 0,
            balance: -480,
            recorded: false,
            status: 'No deposit found',
            trail: 'Nov 18 · “Sent bKash” · no receipt attached',
          },
          {
            name: 'Tanvir',
            role: 'Bazar duty',
            deposit: 2000,
            bazar: 1440,
            balance: 560,
            recorded: true,
            status: 'Deposit recorded',
            trail: 'Nov 04 · bKash · approved by Sajid',
          },
          {
            name: 'Sajid',
            role: 'Manager',
            deposit: 2000,
            bazar: 0,
            balance: -80,
            recorded: true,
            status: 'Deposit recorded',
            trail: 'Nov 02 · Cash · approved by Tanvir',
          },
        ],
      },
    },
    boss: {
      id: 'boss',
      level: 'LEVEL 04',
      kicker: 'ROOFTOP · 11:59 PM',
      title: 'The Final Boss: Month-End',
      body:
        'The 30th arrives like a raid boss made of receipts, due dates and calculator tape. Your squad has one weapon that actually works: a ledger everyone can see. Drain the bar, settle the month, print the proof.',
      quote: '“Every taka has a trail. Every month has an ending.”',
      image: '/landing/boss.jpg',
      alt: 'Four hostel students on a Dhaka rooftop facing a giant orange receipt monster under a teal night sky.',
      card: {
        hp: 'MONTH-END HP',
        hint: 'Scroll to weaken it, or tap to finish.',
        settle: 'Settle the month',
        finalBlow: 'Final blow ready',
        closed: 'MONTH CLOSED',
        rows: [
          { from: 'Rafi', to: 'Tanvir', amount: 480 },
          { from: 'Jui', to: 'Nusrat', amount: 320 },
        ],
        total: '2 transfers clear the month',
        note: 'Closed months stay frozen. Late money is recorded beside them.',
        cta: 'See how settlement works',
      },
    },
    guild: {
      id: 'guild',
      level: 'LEVEL 05',
      kicker: 'ROOFTOP · AFTER SETTLEMENT',
      title: 'Guild Night',
      body:
        'The books are closed, so the rooftop opens. Poll the Friday menu, roll the dice, open a chess board, and see where your mess sits on the guild leaderboard. This is the part that keeps the squad opening the app on a Tuesday.',
      quote: '“Close the books. Open the arena.”',
      image: '/landing/guild.jpg',
      alt: 'Four hostel students laughing around a chessboard, dice and tea on a rooftop at night.',
      card: {
        label: 'THE ARENA · SAMPLE',
        title: 'A tiny taste of guild night.',
        hint: 'Vote, roll, and see the kind of board your mess can climb.',
        pollQuestion: 'Friday special?',
        options: ['Biryani', 'Khichuri'],
        initialVotes: [7, 4],
        vote: 'Vote',
        voted: 'Voted',
        dice: 'Guild dice',
        roll: 'Roll the dice',
        rolled: 'You rolled',
        leaderboard: 'Sample guild league',
        sample: 'Sample board — not live data.',
        rows: [
          { name: 'Green View Boys', points: 2140 },
          { name: 'Hostel 7', points: 1840 },
          { name: 'Mirpur Warriors', points: 1675 },
        ],
      },
    },
    squad: {
      id: 'squad',
      level: 'LEVEL 06',
      kicker: 'CHARACTER SELECT',
      title: 'Choose Your Squad',
      body:
        'Every mess has a manager, a bazar person, a meal tracker and a guild captain. Pick the character who runs your next month — or bring your own squad and write a better story.',
      quote: '“Your mess. Your squad. Your rules.”',
      image: '/landing/hero.jpg',
      alt: 'The Hostel 7 squad standing together in a comic-book corridor.',
      card: {
        hint: 'Pick a guide. Your mess will still need all four roles.',
        characters: [
          {
            name: 'Rafi',
            role: 'The night owl',
            line: 'I log dinner at 2 AM. Judge me after the settlement.',
            icon: 'gamepad',
          },
          {
            name: 'Tanvir',
            role: 'The bazar strategist',
            line: 'If the tomatoes are overpriced, we walk.',
            icon: 'basket',
          },
          {
            name: 'Sajid',
            role: 'The mess manager',
            line: "I don't remember. I have the ledger.",
            icon: 'clipboard',
          },
          {
            name: 'Nabil',
            role: 'The 2 AM chef',
            line: 'Guest meal? That was a test. It failed.',
            icon: 'chef',
          },
          {
            name: 'Mim',
            role: 'The guild captain',
            line: 'Close the month, then meet me on the board.',
            icon: 'trophy',
          },
          {
            name: 'Nusrat',
            role: 'The meal tracker',
            line: "If it's not in the grid, it didn't happen.",
            icon: 'stethoscope',
          },
          {
            name: 'Jui',
            role: 'The negotiator',
            line: 'I can settle a bazar argument in four messages.',
            icon: 'megaphone',
          },
          {
            name: 'Tania',
            role: 'The builder',
            line: 'I made the banner. The leaderboard did the rest.',
            icon: 'code',
          },
        ],
      },
    },
    features: {
      label: 'THE LOOT',
      title: 'Built for the way a mess actually runs',
      intro:
        'Not a spreadsheet with a login. Every screen answers a question a mess manager asks at 11pm.',
      items: [
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
    },
    how: {
      label: 'THE QUEST LOG',
      title: 'From first invite to a closed month',
      steps: [
        {
          title: 'Create the mess',
          body: 'Name it, pick a currency, share the six-character code. Members request to join; you approve.',
        },
        {
          title: 'Log the ordinary days',
          body: 'Meals, bazar with a receipt, fixed utilities and deposits. Managers approve what needs checking.',
        },
        {
          title: 'Close and settle',
          body: 'Review the month, see every balance and the transfer plan, then export the statement for the group.',
        },
      ],
    },
    trust: {
      label: 'PARTY RULES',
      title: 'A shared book, not a black box',
      body:
        'Each mess is isolated in the database, not just hidden in the interface. Members see their own mess, their own ledger and nothing else.',
      points: [
        'Every money row can be traced to a person, a date and a reason',
        'A closed month keeps its figures, even when late money arrives',
        'Managers cannot approve their own deposit request',
        'Export the whole workspace as JSON, or the month as CSV or PDF',
      ],
    },
    pricing: {
      label: 'PICK YOUR MODE',
      title: 'Simple pricing, arranged on WhatsApp',
      intro: 'No card is needed to start, and the free plan is not a trial.',
      freeName: 'Free',
      freePrice: '৳0',
      freeBadge: 'FOREVER',
      freeBody: 'For a mess that wants its books straight.',
      freePoints: [
        'Unlimited members and months',
        'Meals, bazar, utilities and deposits',
        'Settlement, exports and the ledger',
        'Bangla and dark mode',
      ],
      proName: 'Pro',
      proPrice: '৳199 / month',
      proBadge: 'OPTIONAL',
      proBody: 'For the mess that wants the extra polish.',
      proPoints: [
        'Everything in Free',
        'Pro badge on the guild card',
        'Priority help on WhatsApp',
        'Cancel any month — it is manual billing',
      ],
      proCta: 'Arrange Pro on WhatsApp',
      freeCta: 'Start free',
    },
    faq: {
      label: 'STRATEGY GUIDE',
      title: 'Questions a mess manager asks',
      items: [
        {
          q: 'Who can see our books?',
          a: 'Only active members of your mess. Row-Level Security is enforced in Postgres, so another mess cannot read your rows even with the API key.',
        },
        {
          q: 'What if two people share a phone?',
          a: 'Sign out from Mess Hub → Account. The next person signs in with their own Google account or email; the books stay with the mess, not the device.',
        },
        {
          q: 'Can a manager change an old month?',
          a: 'No. A closed month is frozen. A late payment is recorded beside it as a settlement, so history and the outstanding balance both stay correct.',
        },
        {
          q: 'Do you take payments inside the app?',
          a: 'Not yet. Deposits are recorded, not charged. Pro is arranged on WhatsApp and marked by the team, which keeps the app out of payment gateways.',
        },
      ],
    },
    final: {
      label: 'POST-CREDITS',
      title: 'Your squad is already in the group chat.',
      body: 'Start the ledger before the next bazar run. Free for the whole mess, and the group can join with one code.',
      cta: 'Start your mess',
      join: 'Join with a code',
    },
    footer: {
      made: 'Made for messes in Bangladesh.',
      privacy: 'Privacy',
      terms: 'Terms',
      whatsapp: 'WhatsApp 01797989412',
    },
  },
  bn: {
    nav: {
      story: 'গল্প',
      features: 'যা পাবেন',
      how: 'কোয়েস্ট লগ',
      pricing: 'মূল্য',
      signIn: 'সাইন ইন',
      start: 'মেস শুরু করুন',
      startShort: 'শুরু',
      join: 'কোড দিয়ে যোগ দিন',
      menu: 'মেনু',
    },
    hero: {
      eyebrow: 'হোস্টেল ৭ · ঢাকা · রাত ২টা',
      titleA: 'হোস্টেল জীবন এক কো-অপ গেম।',
      titleB: 'মাসের শেষটা ফাইনাল বস।',
      intro:
        'মিল, বাজার, জমা আর মাসের হিসাব — পুরো দলের জন্য এক খাতা, যেটা নিয়ে আর ঝগড়া লাগবে না। বাংলাদেশের মেসের জন্য, বাংলা ও ইংরেজিতে।',
      cta: 'মেস শুরু করুন',
      join: 'কোড দিয়ে যোগ দিন',
      demo: 'ডেমো দেখুন',
      note: 'পুরো মেসের জন্য ফ্রি · কার্ড লাগবে না · অফলাইনেও চলে',
      scroll: 'শুরু করতে স্ক্রল করুন',
      badges: ['কো-অপ', '৬–২০ জন', 'মাস-শেষ বস'],
      imageAlt:
        'কমিক ছবি: টিল রঙের করিডোরে একদল হোস্টেল শিক্ষার্থী, দেয়ালে বিশাল ক্যালকুলেটর আর রসিদের ছায়া।',
      ledger: {
        label: 'ডেমো খাতা',
        mess: 'হোস্টেল ৭ · রুম ৩০২',
        live: 'লাইভ',
        rate: 'মিল রেট',
        rateValue: '৳৪৯.৫৮',
        perMeal: 'প্রতি মিল',
        meals: 'মিল',
        mealsValue: '৩৫৩',
        bazar: 'বাজার',
        bazarValue: '৳১৭,৫০০',
        settled: 'নিষ্পত্তি',
        settledValue: '১০০%',
        balance: 'আপনার ব্যালেন্স',
        balanceValue: '৳১,১৫৯.০৬',
        balanceNote: 'নিষ্পত্তিতে ফেরতযোগ্য',
        formula: 'অনুমোদিত বাজার ÷ ৩৫৩ মিল',
      },
    },
    intro: {
      label: 'ক্যাম্পেইন',
      title: 'সাত লেভেল। দুই উইং। এক খাতা।',
      body:
        'এটা হোস্টেল ৭। ওয়াইফাই খারাপ, বাজার দামি, আর সবাই মনে করে টাকা দিয়ে দিয়েছে। প্রথম রসিদ থেকে শেষ ট্রান্সফার — এক মাসের গল্প।',
      stats: [
        { value: '০৭', label: 'লেভেল' },
        { value: '০২', label: 'উইং' },
        { value: '০১', label: 'খাতা' },
      ],
    },
    bazar: {
      id: 'bazar',
      level: 'লেভেল ০১',
      kicker: 'ছেলেদের উইং · সকাল ৭টা',
      title: 'বাজারের মিশন',
      body:
        'তানভীর কারওয়ান বাজার থেকে তিন ব্যাগ, দুই রসিদ আর টমেটোর দাম নিয়ে খুব জোরালো মতামত নিয়ে ফিরেছে। মিল রেট নড়ার আগে মেসকে জানতে হবে কোনটা অনুমোদিত।',
      quote: '“অনুমোদিত বাজার হিসাবে আসে। পেন্ডিং অপেক্ষা করে।”',
      image: '/landing/bazar.jpg',
      alt: 'হেডফোন পরা এক তরুণ, বিশাল পাটের ব্যাগে সবজি নিয়ে ব্যস্ত বাজারে দাঁড়িয়ে।',
      card: {
        label: 'বাজার · এই সাইকেল',
        title: 'রসিদ অনুমোদন করুন। রেট নড়ুক।',
        hint: 'পেন্ডিং রসিদে ট্যাপ করুন। মিল রেট নিজেই বদলে যাবে।',
        approved: 'অনুমোদিত',
        pending: 'পেন্ডিং',
        approve: 'অনুমোদন',
        undo: 'ফিরিয়ে নিন',
        mealRate: 'মিল রেট',
        meals: 'মিল',
        perMeal: 'প্রতি মিল',
        rateNote: 'অনুমোদিত বাজার ÷ ৩০ মিল',
        receipts: [
          { id: 'vegetables', name: 'সবজি', amount: 420, initial: true },
          { id: 'rice', name: 'চাল ও তেল', amount: 780, initial: true },
          { id: 'eggs', name: 'ডিম ও পেঁয়াজ', amount: 240, initial: false },
        ],
      },
    },
    meals: {
      id: 'meals',
      level: 'লেভেল ০২',
      kicker: 'মেয়েদের উইং · রাত ২টা',
      title: 'রাত ২টার মিল রেইড',
      body:
        'মিম, জুই আর নুসরাত হিলের দলের আত্মবিশ্বাস নিয়ে ফ্রিজ খোলে। তারপর মনে পড়ে — অতিথির মিলটা কেউ লিখেনি। পাতিলে ঢুকলে গ্রিডেও ঢুকবে।',
      quote: '“পাতিলে ঢুকলে গ্রিডেও ঢুকবে।”',
      image: '/landing/meals.jpg',
      alt: 'রাতের হোস্টেল রুমে তিন তরুণী, রাইস কুকার আর বিরিয়ানির পাশে মজা করছে।',
      card: {
        label: 'মিল · এই সপ্তাহ',
        title: 'সেল ট্যাপ করুন। মিল লিখুন।',
        hint: 'অতিথির মিলও মিল। ট্যাপ করলেই মোট বদলাবে।',
        total: 'মোট মিল',
        guest: 'অতিথির মিল',
        guestHint: 'একটা বাড়তি প্লেট, একটা বাড়তি এন্ট্রি।',
        days: ['সোম', 'মঙ্গল', 'বুধ', 'বৃহ'],
        meals: [
          { short: 'স', long: 'সকাল' },
          { short: 'দ', long: 'দুপুর' },
          { short: 'রা', long: 'রাত' },
        ],
        initial: [
          [1, 1, 1],
          [1, 0, 1],
          [1, 1, 0],
          [0, 1, 1],
        ],
      },
    },
    deposit: {
      id: 'deposit',
      level: 'লেভেল ০৩',
      kicker: 'দুই উইং · রাত ১১:৪০',
      title: 'জমার রহস্য',
      body:
        'গ্রুপ চ্যাট বলছে টাকা পাঠানো হয়েছে। খাতা বলছে আসেনি। এখানেই মুখস্থ আর টাইমস্ট্যাম্পের লড়াই — আর ম্যানেজার নিজের জমা নিজে অনুমোদন করতে পারে না।',
      quote: '“মুখস্থ নয়, খাতা।”',
      image: '/landing/deposit.jpg',
      alt: 'অন্ধকার হোস্টেল রুমে দুই তরুণ, জ্বলন্ত ফোনের খাতা নিয়ে তর্ক করছে।',
      card: {
        label: 'জমা · নভেম্বর',
        title: 'ট্রেইল খুলুন।',
        hint: 'নামে ট্যাপ করুন — খাতা আসলে কী লিখেছে দেখুন।',
        deposit: 'জমা',
        bazarPaid: 'বাজার দিয়েছে',
        balance: 'ব্যালেন্স',
        trail: 'অডিট ট্রেইল',
        recorded: 'জমা লেখা আছে',
        missing: 'কোনো জমা নেই',
        voidNote: 'ভুল হলে কারণসহ বাতিল হয় — চুপচাপ মোছে না।',
        members: [
          {
            name: 'রাফি',
            role: 'সদস্য',
            deposit: 0,
            bazar: 0,
            balance: -480,
            recorded: false,
            status: 'কোনো জমা নেই',
            trail: '১৮ নভে · “বিকাশে পাঠিয়েছি” · কোনো রসিদ নেই',
          },
          {
            name: 'তানভীর',
            role: 'বাজার ডিউটি',
            deposit: 2000,
            bazar: 1440,
            balance: 560,
            recorded: true,
            status: 'জমা লেখা আছে',
            trail: '০৪ নভে · বিকাশ · সাজিদ অনুমোদন করেছে',
          },
          {
            name: 'সাজিদ',
            role: 'ম্যানেজার',
            deposit: 2000,
            bazar: 0,
            balance: -80,
            recorded: true,
            status: 'জমা লেখা আছে',
            trail: '০২ নভে · নগদ · তানভীর অনুমোদন করেছে',
          },
        ],
      },
    },
    boss: {
      id: 'boss',
      level: 'লেভেল ০৪',
      kicker: 'ছাদ · রাত ১১:৫৯',
      title: 'ফাইনাল বস: মাসের শেষ',
      body:
        '৩০ তারিখ আসে রসিদ, ডিউ ডেট আর ক্যালকুলেটর টেপ দিয়ে বানানো রেইড বসের মতো। দলের একটাই কাজের অস্ত্র — সবার দেখার মতো এক খাতা। বার খালি করুন, মাস মিটান, প্রমাণ রাখুন।',
      quote: '“প্রতিটি টাকার হিসাব, প্রতি মাসের সমাপ্তি।”',
      image: '/landing/boss.jpg',
      alt: 'ঢাকার ছাদে চার হোস্টেল শিক্ষার্থী, টিল রাতের আকাশে বিশাল কমলা রসিদ-দানবের মুখোমুখি।',
      card: {
        hp: 'মাস-শেষ HP',
        hint: 'দুর্বল করতে স্ক্রল করুন, বা শেষ করতে ট্যাপ করুন।',
        settle: 'মাস মিটিয়ে ফেলুন',
        finalBlow: 'শেষ আঘাত প্রস্তুত',
        closed: 'মাস বন্ধ',
        rows: [
          { from: 'রাফি', to: 'তানভীর', amount: 480 },
          { from: 'জুই', to: 'নুসরাত', amount: 320 },
        ],
        total: '২টি ট্রান্সফারে মাস শেষ',
        note: 'বন্ধ মাস জমে থাকে। দেরির টাকা পাশে নিষ্পত্তি হিসেবে লেখা হয়।',
        cta: 'নিষ্পত্তি যেভাবে কাজ করে',
      },
    },
    guild: {
      id: 'guild',
      level: 'লেভেল ০৫',
      kicker: 'ছাদ · হিসাব শেষে',
      title: 'গিল্ড নাইট',
      body:
        'খাতা বন্ধ, তাই ছাদ খোলা। শুক্রবারের মেনু নিয়ে ভোট, ডাইস, দাবা বোর্ড, আর গিল্ড লিডারবোর্ডে আপনার মেসের জায়গা। এই অংশটাই মঙ্গলবারেও দলকে অ্যাপ খোলায়।',
      quote: '“হিসাব বন্ধ, অ্যারিনা খোলা।”',
      image: '/landing/guild.jpg',
      alt: 'ছাদে দাবা, ডাইস আর চায়ের পাশে চার বন্ধু হাসছে।',
      card: {
        label: 'অ্যারিনা · নমুনা',
        title: 'গিল্ড নাইটের একটু ঝলক।',
        hint: 'ভোট দিন, ডাইস ঘোরান, আর দেখুন আপনার মেস কেমন বোর্ডে উঠতে পারে।',
        pollQuestion: 'শুক্রবারের স্পেশাল?',
        options: ['বিরিয়ানি', 'খিচুড়ি'],
        initialVotes: [7, 4],
        vote: 'ভোট',
        voted: 'ভোট দিয়েছেন',
        dice: 'গিল্ড ডাইস',
        roll: 'ডাইস ঘোরান',
        rolled: 'আপনি পেয়েছেন',
        leaderboard: 'নমুনা গিল্ড লিগ',
        sample: 'নমুনা বোর্ড — লাইভ ডেটা নয়।',
        rows: [
          { name: 'গ্রিন ভিউ বয়েজ', points: 2140 },
          { name: 'হোস্টেল ৭', points: 1840 },
          { name: 'মিরপুর ওয়ারিয়র্স', points: 1675 },
        ],
      },
    },
    squad: {
      id: 'squad',
      level: 'লেভেল ০৬',
      kicker: 'ক্যারেক্টার সিলেক্ট',
      title: 'আপনার দল বাছুন',
      body:
        'প্রতিটি মেসে একজন ম্যানেজার, একজন বাজার-ব্যক্তি, একজন মিল-ট্র্যাকার আর একজন গিল্ড ক্যাপ্টেন থাকে। পরের মাস কে চালাবে বাছুন — বা নিজের দল নিয়ে আরও ভালো গল্প লিখুন।',
      quote: '“তোমার মেস। তোমার দল। তোমার নিয়ম।”',
      image: '/landing/hero.jpg',
      alt: 'কমিক করিডোরে হোস্টেল ৭-এর দল একসাথে দাঁড়িয়ে।',
      card: {
        hint: 'একজন গাইড বাছুন। মেসে অবশ্য চারটি ভূমিকাই লাগবে।',
        characters: [
          {
            name: 'রাফি',
            role: 'রাতজাগা গেমার',
            line: 'রাত ২টায় ডিনার লিখি। হিসাবের পরে বিচার করো।',
            icon: 'gamepad',
          },
          {
            name: 'তানভীর',
            role: 'বাজার স্ট্র্যাটেজিস্ট',
            line: 'টমেটোর দাম বেশি হলে হাঁটা শুরু।',
            icon: 'basket',
          },
          {
            name: 'সাজিদ',
            role: 'মেস ম্যানেজার',
            line: 'আমার মনে নেই। খাতায় আছে।',
            icon: 'clipboard',
          },
          {
            name: 'নাবিল',
            role: 'রাত ২টার শেফ',
            line: 'অতিথির মিল? পরীক্ষা ছিল। ফেল করেছে।',
            icon: 'chef',
          },
          {
            name: 'মিম',
            role: 'গিল্ড ক্যাপ্টেন',
            line: 'মাস বন্ধ করো, তারপর বোর্ডে দেখা হবে।',
            icon: 'trophy',
          },
          {
            name: 'নুসরাত',
            role: 'মিল ট্র্যাকার',
            line: 'গ্রিডে না থাকলে ঘটেনি।',
            icon: 'stethoscope',
          },
          {
            name: 'জুই',
            role: 'দর-কষাকষি',
            line: 'চার মেসেজে বাজারের ঝগড়া মিটিয়ে দিতে পারি।',
            icon: 'megaphone',
          },
          {
            name: 'তানিয়া',
            role: 'বিল্ডার',
            line: 'ব্যানার আমি বানিয়েছি। বাকিটা লিডারবোর্ড করেছে।',
            icon: 'code',
          },
        ],
      },
    },
    features: {
      label: 'যা পাবেন',
      title: 'মেস যেভাবে চলে, সেভাবেই বানানো',
      intro: 'শুধু লগইন দেওয়া স্প্রেডশিট নয়। প্রতিটি স্ক্রিন রাত ১১টার প্রশ্নের উত্তর দেয়।',
      items: [
        {
          title: 'এক মিল রেট, ঝগড়া নেই',
          body: 'অনুমোদিত বাজার ÷ মোট মিল। পেন্ডিং বাজার অনুমোদনের আগে হিসাবে আসে না।',
        },
        {
          title: 'প্রতিটি টাকার হিসাব থাকে',
          body: 'জমা, বাজার বা ইউটিলিটি চুপচাপ মুছে যায় না। ভুল হলে কারণসহ বাতিল হয়, আসলটা থেকে যায়।',
        },
        {
          title: 'নিষ্পত্তি নিজেই বুঝিয়ে দেয়',
          body: 'পুরনো ক্রেডিট, দেরিতে দেওয়া টাকা আর এ মাসের বাকি — লাইন ধরে। সাথে সবচেয়ে কম লেনদেনের প্ল্যান।',
        },
        {
          title: 'কোড দিলেই ঢোকা যায় না',
          body: 'কোড দিয়ে অনুরোধ যায়, অ্যাডমিন অনুমোদন দেন। বাদ পড়া সদস্য আবার ঢুকতে পারেন না।',
        },
        {
          title: 'ইন্টারনেট ছাড়াও কাজ করে',
          body: 'লেখা অপেক্ষায় থাকে, অ্যাপ ইনস্টল করা যায়, খাতা ক্যাশে থাকে। বাসে লাঞ্চ লিখুন, ফিরে সিঙ্ক হবে।',
        },
        {
          title: 'বাংলা, বাংলা অঙ্কে',
          body: 'বাংলা মাস, বাংলা সংখ্যা, ৳ ফরম্যাট আর বাংলা নামসহ বিবরণীর PDF।',
        },
      ],
    },
    how: {
      label: 'কোয়েস্ট লগ',
      title: 'প্রথম ইনভাইট থেকে মাস বন্ধ',
      steps: [
        {
          title: 'মেস তৈরি করুন',
          body: 'নাম ও মুদ্রা দিন, ছয় অক্ষরের কোড শেয়ার করুন। সদস্য অনুরোধ করবে, আপনি অনুমোদন দেবেন।',
        },
        {
          title: 'প্রতিদিনের হিসাব লিখুন',
          body: 'মিল, রসিদসহ বাজার, ফিক্সড ইউটিলিটি আর জমা। যেটা যাচাই দরকার, ম্যানেজার অনুমোদন দেন।',
        },
        {
          title: 'মাস বন্ধ করে নিষ্পত্তি',
          body: 'মাস রিভিউ করুন, সবার ব্যালেন্স আর ট্রান্সফার প্ল্যান দেখুন, তারপর বিবরণী এক্সপোর্ট করুন।',
        },
      ],
    },
    trust: {
      label: 'পার্টি রুলস',
      title: 'ভাগের খাতা, বন্ধ বাক্স নয়',
      body:
        'প্রতিটি মেস ডাটাবেসেই আলাদা — শুধু ইন্টারফেসে লুকানো নয়। সদস্য নিজের মেস আর নিজের খাতা ছাড়া কিছু দেখেন না।',
      points: [
        'প্রতিটি টাকার পেছনে মানুষ, তারিখ আর কারণ থাকে',
        'মাস বন্ধ হলে হিসাব জমে থাকে, দেরির টাকা এলেও',
        'ম্যানেজার নিজের জমার অনুরোধ নিজে অনুমোদন করতে পারেন না',
        'পুরো ওয়ার্কস্পেস JSON, মাসের হিসাব CSV বা PDF-এ',
      ],
    },
    pricing: {
      label: 'মোড বাছুন',
      title: 'সহজ মূল্য, হোয়াটসঅ্যাপে',
      intro: 'শুরু করতে কার্ড লাগে না, ফ্রি প্ল্যান কোনো ট্রায়ালও নয়।',
      freeName: 'ফ্রি',
      freePrice: '৳০',
      freeBadge: 'চিরকাল',
      freeBody: 'যে মেস শুধু হিসাব ঠিক চায়।',
      freePoints: [
        'সদস্য ও মাস Unlimited',
        'মিল, বাজার, ইউটিলিটি, জমা',
        'নিষ্পত্তি, এক্সপোর্ট, খাতা',
        'বাংলা ও ডার্ক মোড',
      ],
      proName: 'প্রো',
      proPrice: '৳১৯৯ / মাস',
      proBadge: 'ঐচ্ছিক',
      proBody: 'যে মেস একটু বাড়তি যত্ন চায়।',
      proPoints: [
        'ফ্রি-র সবকিছু',
        'গিল্ড কার্ডে প্রো ব্যাজ',
        'হোয়াটসঅ্যাপে অগ্রাধিকার সহায়তা',
        'যেকোনো মাসে বন্ধ — ম্যানুয়াল বিলিং',
      ],
      proCta: 'হোয়াটসঅ্যাপে প্রো নিন',
      freeCta: 'ফ্রি শুরু করুন',
    },
    faq: {
      label: 'স্ট্র্যাটেজি গাইড',
      title: 'মেস ম্যানেজারের প্রশ্ন',
      items: [
        {
          q: 'আমাদের খাতা কে দেখতে পারে?',
          a: 'শুধু আপনার মেসের সক্রিয় সদস্যরা। Postgres-এ Row-Level Security থাকে, তাই API key দিয়েও অন্য মেসের তথ্য পড়া যায় না।',
        },
        {
          q: 'এক ফোনে দুইজন ব্যবহার করলে?',
          a: 'Mess Hub → Account থেকে সাইন আউট করুন। পরেরজন নিজের Google বা ইমেইলে ঢুকবে; খাতা ডিভাইসে নয়, মেসের সাথে থাকে।',
        },
        {
          q: 'ম্যানেজার পুরনো মাস বদলাতে পারেন?',
          a: 'না। বন্ধ মাস জমে যায়। দেরির টাকা পাশে নিষ্পত্তি হিসেবে লেখা হয়, তাই ইতিহাস আর বাকি দুটোই ঠিক থাকে।',
        },
        {
          q: 'অ্যাপে টাকা নেওয়া হয়?',
          a: 'এখন না। জমা শুধু লেখা হয়, চার্জ নয়। প্রো হোয়াটসঅ্যাপে ঠিক হয়, যাতে অ্যাপ পেমেন্ট গেটওয়ের বাইরে থাকে।',
        },
      ],
    },
    final: {
      label: 'পোস্ট-ক্রেডিটস',
      title: 'আপনার দল তো গ্রুপ চ্যাটেই আছে।',
      body: 'পরের বাজার শুরুর আগে খাতা খুলুন। পুরো মেসের জন্য ফ্রি, আর এক কোডেই দল যোগ দিতে পারবে।',
      cta: 'মেস শুরু করুন',
      join: 'কোড দিয়ে যোগ দিন',
    },
    footer: {
      made: 'বাংলাদেশের মেসের জন্য বানানো।',
      privacy: 'গোপনীয়তা',
      terms: 'শর্তাবলি',
      whatsapp: 'হোয়াটসঅ্যাপ ০১৭৯৭৯৮৯৪১২',
    },
  },
}
