import { headers } from 'next/headers';
import { Locale, DEFAULT_LOCALE, isLocale } from './config';

/**
 * Read the current locale from the request headers (set by middleware).
 * Server Components only — uses Next.js `headers()`.
 */
export async function getLocale(): Promise<Locale> {
  const headersList = await headers();
  const value = headersList.get('x-locale');
  return value && isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Read the current pathname from the request headers (set by middleware).
 * Useful for generating hreflang alternates.
 */
export async function getPathname(): Promise<string> {
  const headersList = await headers();
  return headersList.get('x-pathname') || '/';
}
