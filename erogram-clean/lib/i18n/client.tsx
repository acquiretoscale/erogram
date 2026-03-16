'use client';

import { createContext, useContext, useCallback, ReactNode } from 'react';
import type { Locale } from './config';
import { DEFAULT_LOCALE } from './config';

interface LocaleContextValue {
  locale: Locale;
  dict: Record<string, any>;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  dict: {},
});

export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Record<string, any>;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={{ locale, dict }}>
      {children}
    </LocaleContext.Provider>
  );
}

/** Access the current locale and full dictionary from any client component. */
export function useLocale() {
  return useContext(LocaleContext);
}

/**
 * Get a translated string by dot-separated key.
 * Falls back to the key itself if not found.
 *
 * Usage: const { t } = useTranslation();
 *        t('nav.groups') → "Gruppen" (de)
 */
export function useTranslation() {
  const { locale, dict } = useContext(LocaleContext);

  function t(key: string, fallback?: string): string {
    const keys = key.split('.');
    let result: any = dict;
    for (const k of keys) {
      if (result == null) break;
      result = result[k];
    }
    return typeof result === 'string' ? result : (fallback ?? key);
  }

  return { t, locale, dict };
}

/**
 * Returns a function that prepends the current locale prefix to paths.
 * English paths stay unprefixed. /de/... and /es/... for other locales.
 *
 * Usage: const lp = useLocalePath();
 *        <Link href={lp('/groups')}>  → "/de/groups" when locale=de
 */
export function useLocalePath() {
  const { locale } = useContext(LocaleContext);
  return useCallback(
    (path: string) => {
      if (locale === DEFAULT_LOCALE) return path;
      return `/${locale}${path.startsWith('/') ? path : `/${path}`}`;
    },
    [locale],
  );
}
