import { getLang, type Lang } from './i18n'

/**
 * Formatting for money, dates and relative time.
 *
 * The language is read from the same store as the UI dictionary, so switching
 * to Bangla changes digits, month names and "today" without every call site
 * passing a language down. Dates that mean "today" are pinned to Asia/Dhaka:
 * the mess is in Bangladesh, but the phone (or the server) may not be.
 */

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']

export function toBengaliDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => BN_DIGITS[Number(digit)] ?? digit)
}

/** Digits in the active language. */
export function localDigits(value: string | number): string {
  return getLang() === 'bn' ? toBengaliDigits(value) : String(value)
}

const BN_MONTHS = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
]

const BN_MONTHS_SHORT = [
  'জানু',
  'ফেব্রু',
  'মার্চ',
  'এপ্রি',
  'মে',
  'জুন',
  'জুলা',
  'আগ',
  'সেপ্টে',
  'অক্টো',
  'নভে',
  'ডিসে',
]

const BN_WEEKDAYS_SHORT = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি']

const EN_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const EN_WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function money(value: number, symbol = '৳', lang: Lang = getLang()): string {
  const safe = Number.isFinite(value) ? value : 0
  const sign = safe < 0 ? '-' : ''
  const formatted = Math.abs(safe).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${sign}${symbol}${lang === 'bn' ? toBengaliDigits(formatted) : formatted}`
}

export function compactMoney(value: number, symbol = '৳'): string {
  const safe = Math.abs(value)
  if (safe >= 100000) return `${symbol}${localDigits((value / 100000).toFixed(1))}L`
  if (safe >= 1000) return `${symbol}${localDigits((value / 1000).toFixed(1))}k`
  return money(value, symbol)
}

// ---- Dates --------------------------------------------------------------

const DHAKA = 'Asia/Dhaka'

/**
 * The calendar date in Dhaka, as YYYY-MM-DD. A payment made at 00:30 in Dhaka
 * must land on that day even if the device is set to another time zone, and a
 * UTC server default would put it on the previous one.
 */
export function dhakaDate(now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: DHAKA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now)
    const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
    const year = pick('year')
    const month = pick('month')
    const day = pick('day')
    if (year && month && day) return `${year}-${month}-${day}`
  } catch {
    // Very old browsers without Intl time zones fall back to local time.
  }
  return isoDate(now)
}

/** Hour of day (0-23) in Dhaka, used for the meal cut-off. */
export function dhakaHour(now: Date = new Date()): number {
  try {
    const value = new Intl.DateTimeFormat('en-GB', {
      timeZone: DHAKA,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(now)
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return Math.min(23, Math.max(0, parsed))
  } catch {
    // Fall through.
  }
  return now.getHours()
}

export function todayISO(): string {
  return dhakaDate()
}

export function isoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() + days)
  return isoDate(date)
}

export function monthLabelFor(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function monthTitle(label: string): string {
  const [year, month] = label.split('-').map(Number)
  if (!year || !month) return label
  const lang = getLang()
  const months = lang === 'bn' ? BN_MONTHS : EN_MONTHS
  const name = months[month - 1] ?? label
  return lang === 'bn' ? `${name} ${toBengaliDigits(year)}` : `${name} ${year}`
}

export function shortDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  if (getLang() === 'bn') {
    return `${toBengaliDigits(date.getDate())} ${BN_MONTHS_SHORT[date.getMonth()]}`
  }
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

export function weekdayShort(iso: string): string {
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  const names = getLang() === 'bn' ? BN_WEEKDAYS_SHORT : EN_WEEKDAYS_SHORT
  return names[date.getDay()] ?? ''
}

export function relativeDay(iso: string): string {
  const today = todayISO()
  const bn = getLang() === 'bn'
  if (iso === today) return bn ? 'আজ' : 'Today'
  if (iso === addDays(today, 1)) return bn ? 'আগামীকাল' : 'Tomorrow'
  if (iso === addDays(today, -1)) return bn ? 'গতকাল' : 'Yesterday'
  return shortDate(iso)
}

export function timeAgo(isoTimestamp: string): string {
  const then = new Date(isoTimestamp).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const minutes = Math.round(diff / 60000)
  const bn = getLang() === 'bn'
  if (minutes < 1) return bn ? 'এইমাত্র' : 'just now'
  if (minutes < 60) return bn ? `${toBengaliDigits(minutes)} মিনিট আগে` : `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return bn ? `${toBengaliDigits(hours)} ঘণ্টা আগে` : `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return bn ? `${toBengaliDigits(days)} দিন আগে` : `${days}d ago`
  return shortDate(isoTimestamp.slice(0, 10))
}

export function clockTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp)
  if (Number.isNaN(date.getTime())) return ''
  if (getLang() === 'bn') {
    const hour = date.getHours()
    const label = hour < 6 ? 'রাত' : hour < 12 ? 'সকাল' : hour < 16 ? 'দুপুর' : hour < 19 ? 'বিকাল' : 'রাত'
    const hour12 = hour % 12 || 12
    return `${label} ${toBengaliDigits(hour12)}:${toBengaliDigits(String(date.getMinutes()).padStart(2, '0'))}`
  }
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function formatMeals(value: number): string {
  return localDigits(Number.isInteger(value) ? String(value) : value.toFixed(1))
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function monthOptions(count = 6): { label: string; title: string }[] {
  const options: { label: string; title: string }[] = []
  const [year, month] = todayISO().split('-').map(Number)
  for (let index = 0; index < count; index += 1) {
    const date = new Date(year, (month ?? 1) - 1 - index, 1)
    const label = monthLabelFor(date)
    options.push({ label, title: monthTitle(label) })
  }
  return options
}
