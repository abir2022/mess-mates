import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../lib/theme'
import { useI18n } from '../lib/i18n'

/** One tap between light and dark; the choice is remembered on the device. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolved, toggle } = useTheme()
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t('theme.label')}
      title={t('theme.label')}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-ink-200 bg-white p-2 text-ink-600 transition hover:border-brand-300 hover:text-brand-700 sm:min-h-9 sm:min-w-9 ${className}`}
    >
      {resolved === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
