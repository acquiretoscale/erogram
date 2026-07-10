export const LOCALES = ['en', 'de', 'es', 'pt'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

/** Non-English content locales (translations in body/meta/slug stores). */
export type ContentLocale = Exclude<Locale, 'en'>;

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  pt: 'Português',
};

export const LOCALE_HREFLANG: Record<Locale, string> = {
  en: 'en',
  de: 'de',
  es: 'es',
  pt: 'pt-BR',
};

/** OnlyFans Search hub path segment per locale (same framework as DE/ES). */
export const OF_SEARCH_HUB: Record<Locale, string> = {
  en: 'onlyfanssearch',
  de: 'onlyfanssearch',
  es: 'onlyfanssearch',
  pt: 'onlyfanssearch',
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  en: '🇺🇸',
  de: '🇩🇪',
  es: '🇪🇸',
  pt: '🇧🇷',
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
  if (path === '/' || path === '') return `/${locale}`;
  return `/${locale}${path.startsWith('/') ? path : `/${path}`}`;
}
