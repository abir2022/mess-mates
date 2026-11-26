import { useEffect, useState } from 'react'

/**
 * Light / dark theme.
 *
 * The preference is stored on the device and applied as a class on <html>,
 * which is what Tailwind's `darkMode: 'class'` and the CSS overrides in
 * index.css key off. "System" follows the OS until the user picks a side.
 */

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'mm_theme_v1'
const CHANGE_EVENT = 'mm-theme-change'

function prefersDark(): boolean {
  try {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

export function readTheme(): Theme {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 'system'
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function resolveTheme(theme: Theme = readTheme()): ResolvedTheme {
  if (theme === 'system') return prefersDark() ? 'dark' : 'light'
  return theme
}

export function applyTheme(theme: Theme = readTheme()): ResolvedTheme {
  const resolved = resolveTheme(theme)
  try {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', resolved === 'dark')
      document.documentElement.style.colorScheme = resolved
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', resolved === 'dark' ? '#081c27' : '#0d6963')
    }
  } catch {
    // The class is cosmetic; a locked-down browser can skip it.
  }
  return resolved
}

export function setTheme(theme: Theme): void {
  try {
    if (typeof window !== 'undefined') {
      if (theme === 'system') window.localStorage?.removeItem(STORAGE_KEY)
      else window.localStorage?.setItem(STORAGE_KEY, theme)
    }
  } catch {
    // Private mode still gets the in-memory switch.
  }
  applyTheme(theme)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Apply the stored preference before the first paint. */
export function initTheme(): void {
  applyTheme(readTheme())
}

export function useTheme(): {
  theme: Theme
  resolved: ResolvedTheme
  setTheme: (theme: Theme) => void
  toggle: () => void
} {
  const [theme, setThemeState] = useState<Theme>(() => readTheme())
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme())

  useEffect(() => {
    const sync = () => {
      const next = readTheme()
      setThemeState(next)
      setResolved(applyTheme(next))
    }
    window.addEventListener(CHANGE_EVENT, sync)
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystem = () => {
      if (readTheme() === 'system') sync()
    }
    media.addEventListener?.('change', onSystem)
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      media.removeEventListener?.('change', onSystem)
    }
  }, [])

  return {
    theme,
    resolved,
    setTheme: (next) => {
      setTheme(next)
      setThemeState(next)
      setResolved(resolveTheme(next))
    },
    toggle: () => {
      const next: Theme = resolveTheme() === 'dark' ? 'light' : 'dark'
      setTheme(next)
      setThemeState(next)
      setResolved(next)
    },
  }
}
