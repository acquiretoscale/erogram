export const LOCALES = ['en', 'de', 'es'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
};

export const LOCALE_HREFLANG: Record<Locale, string> = {
  en: 'en',
  de: 'de',
  es: 'es',
};

export function isLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}

/** Returns locale prefix for URLs. English = no prefix (root). */
export function localePrefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '' : `/${locale}`;
}

/** Prepend locale to a path. English stays unprefixed. */
export function localePath(path: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return path;
  return `/${locale}${path.startsWith('/') ? path : `/${path}`}`;
}
