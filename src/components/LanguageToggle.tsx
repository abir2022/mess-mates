import { Languages } from 'lucide-react'
import { useI18n } from '../lib/i18n'

/** Switches the whole app between English and Bangla, remembered on the device. */
export function LanguageToggle({ className = '', compactOnMobile = false }: { className?: string; compactOnMobile?: boolean }) {
  const { lang, toggle, t } = useI18n()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t('lang.label')}
      title={t('lang.label')}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-ink-600 transition hover:border-brand-300 hover:text-brand-700 sm:min-h-0 ${
        compactOnMobile ? 'max-sm:justify-center max-sm:px-2' : ''
      } ${className}`}
    >
      <Languages className="h-3.5 w-3.5" />
      <span className={compactOnMobile ? 'max-sm:hidden' : ''}>{lang === 'en' ? 'বাংলা' : 'English'}</span>
    </button>
  )
}
