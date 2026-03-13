import type { Locale } from './config';

const LOCALE_MAP: Record<Locale, string> = {
  en: 'en-US',
  de: 'de-DE',
  es: 'es-ES',
};

/**
 * Format a date string/Date for display, using the correct locale.
 * Defaults to short format: "Mar 11, 2026" (en) / "11. März 2026" (de) / "11 mar 2026" (es)
 */
export function formatDate(
  date: string | Date,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const opts: Intl.DateTimeFormatOptions = options ?? {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  };
  return d.toLocaleDateString(LOCALE_MAP[locale], opts);
}
