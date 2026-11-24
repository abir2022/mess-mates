import { describe, expect, test } from 'bun:test'
import { messageKeys, translate } from '../src/lib/i18n'

describe('i18n', () => {
  test('interpolates named values in both languages', () => {
    expect(translate('dash.greeting', { name: 'Abir' }, 'en')).toBe('Assalamu alaikum, Abir')
    expect(translate('dash.greeting', { name: 'Abir' }, 'bn')).toContain('আসসালামু')
    expect(translate('dash.greeting', { name: 'Abir' }, 'bn')).toContain('Abir')
  })

  test('leaves unknown placeholders visible instead of printing undefined', () => {
    expect(translate('rem.dutyItems', {}, 'en')).toBe('{count} items on the list')
  })

  test('every key resolves in Bangla too', () => {
    const missing = messageKeys.filter((key) => {
      const value = translate(key, undefined, 'bn')
      return !value || value === key
    })
    expect(missing).toEqual([])
  })

  test('the Bangla dictionary actually translates the app chrome', () => {
    const samples = ['nav.dashboard', 'dash.mealRate', 'rem.title', 'auth.signIn', 'layout.goPro'] as const
    for (const key of samples) {
      expect(translate(key, undefined, 'bn')).not.toBe(translate(key, undefined, 'en'))
    }
  })
})
