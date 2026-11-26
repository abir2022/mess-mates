import { afterAll, describe, expect, test } from 'bun:test'
import { getLang, setLang } from '../src/lib/i18n'
import {
  dhakaDate,
  formatMeals,
  money,
  monthTitle,
  relativeDay,
  shortDate,
  toBengaliDigits,
  todayISO,
  weekdayShort,
} from '../src/lib/format'

const original = getLang()

afterAll(() => setLang(original))

describe('Bangla formatting', () => {
  test('digits change without changing the value', () => {
    expect(toBengaliDigits('0123456789')).toBe('০১২৩৪৫৬৭৮৯')
    expect(toBengaliDigits('৳1,234.50')).toBe('৳১,২৩৪.৫০')
  })

  test('money uses Bengali digits in Bangla', () => {
    setLang('bn')
    expect(money(1234.5)).toBe('৳১,২৩৪.৫০')
    expect(money(-98.08)).toBe('-৳৯৮.০৮')
    setLang('en')
    expect(money(1234.5)).toBe('৳1,234.50')
  })

  test('month and weekday names are Bangla', () => {
    setLang('bn')
    expect(monthTitle('2026-11')).toBe('নভেম্বর ২০২৬')
    expect(shortDate('2026-11-25')).toBe('২৫ নভে')
    expect(weekdayShort('2026-11-25')).toBe('বুধ')
    setLang('en')
    expect(monthTitle('2026-11')).toBe('November 2026')
  })

  test('relative days are Bangla', () => {
    setLang('bn')
    expect(relativeDay(todayISO())).toBe('আজ')
    setLang('en')
    expect(relativeDay(todayISO())).toBe('Today')
  })

  test('meal counts keep a half meal visible', () => {
    setLang('bn')
    expect(formatMeals(7.5)).toBe('৭.৫')
    setLang('en')
    expect(formatMeals(7)).toBe('7')
  })
})

describe('Dhaka dates', () => {
  test('today is a real Dhaka calendar date', () => {
    expect(todayISO()).toBe(dhakaDate())
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('the date does not depend on the device time zone', () => {
    // 31 Dec 2026 20:00 UTC is already 1 Jan 2027 in Dhaka (UTC+6).
    expect(dhakaDate(new Date('2026-12-31T20:00:00Z'))).toBe('2027-01-01')
  })
})
