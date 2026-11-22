export function money(value: number, symbol = '৳'): string {
  const safe = Number.isFinite(value) ? value : 0
  const sign = safe < 0 ? '-' : ''
  const formatted = Math.abs(safe).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${sign}${symbol}${formatted}`
}

export function compactMoney(value: number, symbol = '৳'): string {
  const safe = Math.abs(value)
  if (safe >= 100000) return `${symbol}${(value / 100000).toFixed(1)}L`
  if (safe >= 1000) return `${symbol}${(value / 1000).toFixed(1)}k`
  return money(value, symbol)
}

export function todayISO(): string {
  const now = new Date()
  return isoDate(now)
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
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function shortDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

export function weekdayShort(iso: string): string {
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

export function relativeDay(iso: string): string {
  if (iso === todayISO()) return 'Today'
  if (iso === addDays(todayISO(), 1)) return 'Tomorrow'
  if (iso === addDays(todayISO(), -1)) return 'Yesterday'
  return shortDate(iso)
}

export function timeAgo(isoTimestamp: string): string {
  const then = new Date(isoTimestamp).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return shortDate(isoTimestamp.slice(0, 10))
}

export function clockTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function formatMeals(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
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
  const now = new Date()
  for (let index = 0; index < count; index += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
    const label = monthLabelFor(date)
    options.push({ label, title: monthTitle(label) })
  }
  return options
}
