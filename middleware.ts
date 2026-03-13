import { NextRequest, NextResponse } from 'next/server';

/**
 * Locale-aware middleware for Erogram.
 *
 * Behavior:
 * - /de/...  → rewrite to /... with x-locale: de
 * - /es/...  → rewrite to /... with x-locale: es
 * - /...     → pass through with x-locale: en  (UNCHANGED — zero impact on English)
 *
 * English URLs are NEVER modified or redirected. This guarantees
 * existing Google rankings are 100% preserved.
 */

const LOCALE_PREFIXES = ['de', 'es'] as const;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Article slug year fix: redirect 2026 → 2025
  if (pathname.startsWith('/articles/') && pathname.includes('2026')) {
    const corrected = pathname.replace(/2026/g, '2025');
    if (corrected !== pathname) {
      const url = request.nextUrl.clone();
      url.pathname = corrected;
      return NextResponse.redirect(url, 301);
    }
  }

  // English-only sections: articles are never translated.
  // 301 redirect /de/articles* and /es/articles* → /articles*
  for (const locale of LOCALE_PREFIXES) {
    if (pathname.startsWith(`/${locale}/articles`)) {
      const englishPath = pathname.replace(`/${locale}`, '');
      const url = request.nextUrl.clone();
      url.pathname = englishPath;
      return NextResponse.redirect(url, 301);
    }
  }

  // Check if the path starts with a supported locale prefix
  for (const locale of LOCALE_PREFIXES) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      // Strip locale prefix and rewrite to the real page
      const strippedPath = pathname.replace(`/${locale}`, '') || '/';
      const url = request.nextUrl.clone();
      url.pathname = strippedPath;

      const response = NextResponse.rewrite(url);
      response.headers.set('x-locale', locale);
      response.headers.set('x-pathname', pathname);
      return response;
    }
  }

  // English: no rewrite, just tag the locale header
  const response = NextResponse.next();
  response.headers.set('x-locale', 'en');
  response.headers.set('x-pathname', pathname);
  return response;
}

export const config = {
  /*
   * Match all request paths EXCEPT:
   * - /api/...          (API routes — never localized)
   * - /_next/...        (Next.js internals)
   * - /assets/...       (static files)
   * - /icons/...        (PWA icons)
   * - /fonts/...        (font files)
   * - /favicon.ico      (favicon)
   * - /manifest.json    (PWA manifest)
   * - /robots.txt       (SEO)
   * - /sitemap.xml      (SEO)
   * - /admin/...        (admin panel — stays English only)
   * - /advert/...       (advertiser panel — stays English only)
   */
  matcher: [
    '/((?!api|_next|assets|icons|fonts|favicon|manifest|robots|sitemap|admin|advert).*)',
  ],
};
