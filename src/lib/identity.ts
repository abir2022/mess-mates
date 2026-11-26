import type { MessMember } from './types'

/**
 * Two accounts, one human.
 *
 * A member often signs in twice (Google + magic link, or a second Google
 * account) and the mess ends up with two ledgers for one person. Merging money
 * automatically would be worse than the duplicate, so the app only points out
 * the likely pair and leaves the decision to the admin.
 */

export interface IdentityPair {
  first: MessMember
  second: MessMember
  /** Why they look like one person, ready to show. */
  reason: 'name' | 'email' | 'photo'
}

const HONORIFICS = new Set([
  'md',
  'mohammad',
  'mohammed',
  'muhammad',
  'mst',
  'mr',
  'mrs',
  'ms',
  'sk',
  'sheikh',
  'shah',
  'syed',
  'sayed',
])

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09ff\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !HONORIFICS.has(token))
}

export function nameKey(value: string): string {
  return tokens(value).join(' ')
}

function sameName(a: string, b: string): boolean {
  const left = tokens(a)
  const right = tokens(b)
  if (!left.length || !right.length) return false
  if (left.join(' ') === right.join(' ')) return true
  // "Abir Ul Islam" vs "Abir Islam": every token of the shorter name appears
  // in the longer one, and at least two tokens are shared.
  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left]
  if (shorter.length < 2) return false
  const pool = new Set(longer)
  return shorter.every((token) => pool.has(token)) && new Set(left).size >= 2
}

function emailKey(email: string): string {
  return email.trim().toLowerCase()
}

export function findLikelyDuplicates(members: MessMember[]): IdentityPair[] {
  const active = members.filter((member) => member.status === 'active')
  const pairs: IdentityPair[] = []
  for (let first = 0; first < active.length; first += 1) {
    for (let second = first + 1; second < active.length; second += 1) {
      const a = active[first]
      const b = active[second]
      const nameA = a.display_name?.trim() || a.profile.full_name
      const nameB = b.display_name?.trim() || b.profile.full_name
      if (sameName(nameA, nameB)) {
        pairs.push({ first: a, second: b, reason: 'name' })
        continue
      }
      const emailA = emailKey(a.profile.email ?? '')
      const emailB = emailKey(b.profile.email ?? '')
      if (emailA && emailA === emailB) {
        pairs.push({ first: a, second: b, reason: 'email' })
        continue
      }
      if (a.profile.avatar_url && a.profile.avatar_url === b.profile.avatar_url) {
        pairs.push({ first: a, second: b, reason: 'photo' })
      }
    }
  }
  return pairs
}
