import type { MealField } from './types'

/**
 * A standing meal plan: the meals a member eats on an ordinary day.
 *
 * It is stored per person per mess in the browser, and it only ever writes the
 * signed-in member's own meals for today — never a mate's, and never a day that
 * already has figures. That keeps it safe: the worst it can do is save someone
 * the four taps they make every morning.
 */

export interface StandingPlan {
  breakfast: number
  lunch: number
  dinner: number
}

export interface StandingSettings {
  enabled: boolean
  plan: StandingPlan
  /** The last day the plan was applied, so one day is filled exactly once. */
  lastApplied: string
}

const KEY = 'mm.standing.v1'

/** What a mess usually eats: lunch and dinner, no breakfast. */
export const SUGGESTED_PLAN: StandingPlan = { breakfast: 0, lunch: 1, dinner: 1 }

const DEFAULT_SETTINGS: StandingSettings = {
  enabled: false,
  plan: { breakfast: 0, lunch: 0, dinner: 0 },
  lastApplied: '',
}

function safeParse(raw: string | null): Record<string, StandingSettings> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, StandingSettings>) : {}
  } catch {
    return {}
  }
}

export function standingKey(userId: string, messId: string): string {
  return `${userId}:${messId}`
}

function normalize(value: Partial<StandingSettings> | undefined): StandingSettings {
  return {
    enabled: Boolean(value?.enabled),
    plan: {
      breakfast: Math.max(0, Number(value?.plan?.breakfast) || 0),
      lunch: Math.max(0, Number(value?.plan?.lunch) || 0),
      dinner: Math.max(0, Number(value?.plan?.dinner) || 0),
    },
    lastApplied: typeof value?.lastApplied === 'string' ? value.lastApplied : '',
  }
}

export function loadStanding(userId: string, messId: string): StandingSettings {
  try {
    const all = safeParse(localStorage.getItem(KEY))
    return normalize(all[standingKey(userId, messId)])
  } catch {
    return normalize(DEFAULT_SETTINGS)
  }
}

export function saveStanding(userId: string, messId: string, settings: StandingSettings): void {
  try {
    const all = safeParse(localStorage.getItem(KEY))
    all[standingKey(userId, messId)] = normalize(settings)
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // A blocked localStorage only costs the convenience, never the meal log.
  }
}

export function hasPlan(plan: StandingPlan): boolean {
  return plan.breakfast + plan.lunch + plan.dinner > 0
}

/** The fields the plan actually sets, so a zero is never written over an edit. */
export function planFields(plan: StandingPlan): { field: MealField; value: number }[] {
  const fields: { field: MealField; value: number }[] = [
    { field: 'breakfast', value: plan.breakfast },
    { field: 'lunch', value: plan.lunch },
    { field: 'dinner', value: plan.dinner },
  ]
  return fields.filter((entry) => entry.value > 0)
}

export function shouldFill(input: {
  settings: StandingSettings
  today: string
  logged: boolean
}): boolean {
  const { settings, today, logged } = input
  if (!settings.enabled) return false
  if (!hasPlan(settings.plan)) return false
  if (settings.lastApplied === today) return false
  return !logged
}
