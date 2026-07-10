'use client';

import { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { Locale } from './config';
import { DEFAULT_LOCALE } from './config';

interface LocaleContextValue {
  locale: Locale;
  dict: Record<string, any>;
  /** Public URL path from middleware (x-pathname) — use for locale switching. */
  publicPathname: string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  dict: {},
  publicPathname: '/',
});

export function LocaleProvider({
  locale,
  dict,
  publicPathname = '/',
  children,
}: {
  locale: Locale;
  dict: Record<string, any>;
  publicPathname?: string;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={{ locale, dict, publicPathname }}>
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

/** Real public URL — prefer server x-pathname, then window.location. */
export function usePublicPathname(): string {
  const { publicPathname } = useContext(LocaleContext);
  const rawPathname = usePathname();
  const [clientPath, setClientPath] = useState<string | null>(null);
  useEffect(() => {
    setClientPath(typeof window !== 'undefined' ? window.location.pathname : null);
  }, [rawPathname]);
  return clientPath ?? publicPathname ?? rawPathname ?? '/';
}
