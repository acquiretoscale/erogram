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
 *
 * OnlyFans SEO rewrites:
 * - /{cat}onlyfans               → /onlyfanssearch/{cat}
 * - /onlyfans{country}           → /onlyfanssearch/country/{country}
 * - /onlyfans{country}/{cat}onlyfans → /onlyfanssearch/country/{country}/{cat}
 */

// Block referral traffic from Turkish Yandex only. Russian Yandex (.ru) is kept.
// YandexBot UA is NOT blocked — the crawler is shared across all Yandex regions.
const BLOCKED_REFERER_PATTERNS = [
  /yandex\.tr/i,
  /yandex\.com\.tr/i,
];

function isBlockedTraffic(request: NextRequest): boolean {
  const referer = request.headers.get('referer') || '';
  for (const pattern of BLOCKED_REFERER_PATTERNS) {
    if (pattern.test(referer)) return true;
  }
  return false;
}

const LOCALE_PREFIXES = ['de', 'es'] as const;

// OnlyFans SEO slug sets (lowercase, no spaces)
const OF_CAT_SLUGS = new Set([
  'asian','blonde','teen','milf','amateur','redhead','fitness','joi',
  'lesbian','streamer','petite','big-ass','big-boobs','brunette',
  'ahegao','alt','cosplay','goth','latina','tattoo','curvy','ebony',
  'feet','lingerie','thick','twerk','squirt','piercing',
]);
const OF_COUNTRY_SLUGS = new Set([
  'france','germany','spain','italy','uk','usa','brazil','colombia',
  'mexico','argentina','japan','philippines','australia','canada',
  'russia','ukraine','poland','romania','czech','netherlands',
]);

export function middleware(request: NextRequest) {
  // ── Block Turkish Yandex referral traffic (Google-safe, Russian Yandex untouched) ──
  if (isBlockedTraffic(request)) {
    return new NextResponse(null, { status: 403 });
  }

  const { pathname } = request.nextUrl;

  // ── OnlyFans SEO rewrites (before locale logic) ──
  // Pattern: /onlyfans{country}/{cat}onlyfans → /onlyfans-search/country/{country}/{cat}
  const combo = pathname.match(/^\/onlyfans([a-z]+)\/([a-z]+(?:-[a-z]+)*)onlyfans$/);
  if (combo) {
    const [, country, cat] = combo;
    if (OF_COUNTRY_SLUGS.has(country) && OF_CAT_SLUGS.has(cat)) {
      const url = request.nextUrl.clone();
      url.pathname = `/onlyfanssearch/country/${country}/${cat}`;
      const res = NextResponse.rewrite(url);
      res.headers.set('x-locale', 'en');
      res.headers.set('x-pathname', pathname);
      return res;
    }
  }

  // Pattern: /{cat}onlyfans → /onlyfanssearch/{cat}
  const catMatch = pathname.match(/^\/([a-z]+(?:-[a-z]+)*)onlyfans$/);
  if (catMatch) {
    const cat = catMatch[1];
    if (OF_CAT_SLUGS.has(cat)) {
      const url = request.nextUrl.clone();
      url.pathname = `/onlyfanssearch/${cat}`;
      const res = NextResponse.rewrite(url);
      res.headers.set('x-locale', 'en');
      res.headers.set('x-pathname', pathname);
      return res;
    }
  }

  // Pattern: /onlyfans{country} → /onlyfanssearch/country/{country}
  const countryMatch = pathname.match(/^\/onlyfans([a-z]+)$/);
  if (countryMatch) {
    const country = countryMatch[1];
    if (OF_COUNTRY_SLUGS.has(country)) {
      const url = request.nextUrl.clone();
      url.pathname = `/onlyfanssearch/country/${country}`;
      const res = NextResponse.rewrite(url);
      res.headers.set('x-locale', 'en');
      res.headers.set('x-pathname', pathname);
      return res;
    }
  }

  // Article slug year fix: redirect 2026 → 2025
  if (pathname.startsWith('/articles/') && pathname.includes('2026')) {
    const corrected = pathname.replace(/2026/g, '2025');
    if (corrected !== pathname) {
      const url = request.nextUrl.clone();
      url.pathname = corrected;
      return NextResponse.redirect(url, 301);
    }
  }

  // ── Localized OnlyFans search paths ─────────────────────────────────────────
  // /de/onlyfans-suche* → rewrite to /onlyfanssearch*, x-locale: de
  // /es/onlyfans-busca* → rewrite to /onlyfanssearch*, x-locale: es
  const OF_LOCALE_SEGMENTS: Record<string, string> = {
    de: 'onlyfans-suche',
    es: 'onlyfans-busca',
  };

  for (const [loc, seg] of Object.entries(OF_LOCALE_SEGMENTS)) {
    const prefix = `/${loc}/${seg}`;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      const rest = pathname.slice(prefix.length);
      const url = request.nextUrl.clone();
      url.pathname = `/onlyfanssearch${rest}`;
      const res = NextResponse.rewrite(url);
      res.headers.set('x-locale', loc);
      res.headers.set('x-pathname', pathname);
      return res;
    }
  }

  // 301: /de/onlyfanssearch* → /de/onlyfans-suche* (and ES equivalent)
  for (const [loc, seg] of Object.entries(OF_LOCALE_SEGMENTS)) {
    const oldPrefix = `/${loc}/onlyfanssearch`;
    if (pathname === oldPrefix || pathname.startsWith(`${oldPrefix}/`)) {
      const rest = pathname.slice(oldPrefix.length);
      const url = request.nextUrl.clone();
      url.pathname = `/${loc}/${seg}${rest}`;
      return NextResponse.redirect(url, 301);
    }
  }

  // 301: old /onlyfans-search* → /onlyfanssearch* (preserve old links)
  if (pathname === '/onlyfans-search' || pathname.startsWith('/onlyfans-search/')) {
    const rest = pathname.slice('/onlyfans-search'.length);
    const url = request.nextUrl.clone();
    url.pathname = `/onlyfanssearch${rest}`;
    return NextResponse.redirect(url, 301);
  }

  // English-only sections: articles and AI NSFW are never translated.
  // 301 redirect /de/... and /es/... → /... for these paths.
  const englishOnlySections = ['articles', 'ainsfw'];
  for (const locale of LOCALE_PREFIXES) {
    for (const section of englishOnlySections) {
      if (pathname === `/${locale}/${section}` || pathname.startsWith(`/${locale}/${section}/`)) {
        const englishPath = pathname.replace(`/${locale}`, '');
        const url = request.nextUrl.clone();
        url.pathname = englishPath;
        return NextResponse.redirect(url, 301);
      }
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
   * - /OFM/...          (OFM admin panel — stays English only)
   * - /advert/...       (advertiser panel — stays English only)
   */
  matcher: [
    '/((?!api|_next|assets|icons|fonts|favicon|manifest|robots|sitemap|admin|OFM|advert).*)',
  ],
};
