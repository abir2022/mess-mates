import { describe, expect, test } from 'bun:test'
import { hasPlan, planFields, shouldFill, standingKey, type StandingSettings } from '../src/lib/standingPlan'

const settings = (overrides: Partial<StandingSettings> = {}): StandingSettings => ({
  enabled: true,
  plan: { breakfast: 0, lunch: 1, dinner: 1 },
  lastApplied: '',
  ...overrides,
})

describe('standing meal plan', () => {
  test('separates one person in one mess from everyone else', () => {
    expect(standingKey('u-1', 'mess-1')).not.toBe(standingKey('u-2', 'mess-1'))
    expect(standingKey('u-1', 'mess-1')).not.toBe(standingKey('u-1', 'mess-2'))
  })

  test('an empty plan is not a plan', () => {
    expect(hasPlan({ breakfast: 0, lunch: 0, dinner: 0 })).toBe(false)
    expect(hasPlan({ breakfast: 1, lunch: 1, dinner: 0 })).toBe(true)
  })

  test('only the meals actually eaten are written', () => {
    expect(planFields({ breakfast: 0, lunch: 1, dinner: 1.5 })).toEqual([
      { field: 'lunch', value: 1 },
      { field: 'dinner', value: 1.5 },
    ])
  })

  test('fills once a day, and only when nothing is logged', () => {
    const today = '2026-11-25'
    expect(shouldFill({ settings: settings(), today, logged: false })).toBe(true)
    expect(shouldFill({ settings: settings(), today, logged: true })).toBe(false)
    expect(shouldFill({ settings: settings({ lastApplied: today }), today, logged: false })).toBe(false)
    expect(shouldFill({ settings: settings({ enabled: false }), today, logged: false })).toBe(false)
    expect(
      shouldFill({ settings: settings({ plan: { breakfast: 0, lunch: 0, dinner: 0 } }), today, logged: false }),
    ).toBe(false)
  })

  test('yesterday’s fill does not block today', () => {
    expect(shouldFill({ settings: settings({ lastApplied: '2026-11-24' }), today: '2026-11-25', logged: false })).toBe(
      true,
    )
  })
})
