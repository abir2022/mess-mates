import { describe, expect, test } from 'bun:test'
import { findLikelyDuplicates, nameKey } from '../src/lib/identity'
import type { MessMember, Profile } from '../src/lib/types'

function member(id: string, name: string, email: string): MessMember {
  const profile: Profile = {
    id,
    full_name: name,
    email,
    avatar_url: null,
    is_pro: false,
    xp_points: 0,
    avatar_frame: 'ring',
    frame_unlocked_until: null,
  }
  return {
    id: `m-${id}`,
    mess_id: 'mess-1',
    user_id: id,
    role: 'member',
    status: 'active',
    joined_at: '2026-11-01T00:00:00Z',
    display_name: '',
    avatar_url: null,
    profile,
  }
}

describe('duplicate accounts', () => {
  test('honorifics do not hide the same name', () => {
    expect(nameKey('Md. Abir Ul Islam')).toBe(nameKey('Abir  Ul Islam'))
    expect(nameKey('Mohammad Rahim')).toBe(nameKey('Rahim'))
  })

  test('one human on two accounts is reported once', () => {
    const pairs = findLikelyDuplicates([
      member('u1', 'Abir Ul Islam', 'abir@example.com'),
      member('u2', 'Md. Abir Ul Islam', 'abir.work@example.com'),
    ])
    expect(pairs).toHaveLength(1)
    expect(pairs[0].reason).toBe('name')
  })

  test('different people are left alone', () => {
    const pairs = findLikelyDuplicates([
      member('u1', 'Abir Ul Islam', 'abir@example.com'),
      member('u2', 'Tanvir Hasan', 'tanvir@example.com'),
    ])
    expect(pairs).toHaveLength(0)
  })

  test('a shared sign-in email is enough', () => {
    const pairs = findLikelyDuplicates([
      member('u1', 'Abir', 'same@example.com'),
      member('u2', 'A. Islam', 'same@example.com'),
    ])
    expect(pairs.some((pair) => pair.reason === 'email')).toBe(true)
  })
})
