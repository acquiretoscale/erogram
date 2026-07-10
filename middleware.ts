import { NextRequest, NextResponse } from 'next/server';
import { resolveBestOfSlugFromPublicSegment } from '@/lib/bestOfPageContent/slugTranslations';
import { resolveBestTgSlugFromPublicSegment } from '@/lib/bestTelegramGroups/slugTranslations';
import { resolveOfCategorySlugFromPublicSegment } from '@/lib/bestOnlyfansAccounts/slugTranslations';
import { resolveListingSlugFromPublicSegment } from '@/lib/i18n/listingSlugTranslations';
import { getLocalizedHubSegment } from '@/lib/i18n/hubSlugTranslations';
import { OF_SEARCH_HUB } from '@/lib/i18n/config';

/**
 * Locale-aware middleware for Erogram.
 *
 * Behavior:
 * - /de/...  → rewrite to /... with x-locale: de
 * - /es/...  → rewrite to /... with x-locale: es
 * - /pt/...  → rewrite to /... with x-locale: pt
 * - /...     → pass through with x-locale: en  (UNCHANGED — zero impact on English)
 *
 * English URLs are NEVER modified or redirected. This guarantees
 * existing Google rankings are 100% preserved.
 *
 * OnlyFans SEO rewrites:
 * - /{cat}onlyfans               → /onlyfanssearch/{cat}
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

const LOCALE_PREFIXES = ['de', 'es', 'pt'] as const;

export function middleware(request: NextRequest) {
  // ── Block Turkish Yandex referral traffic (Google-safe, Russian Yandex untouched) ──
  if (isBlockedTraffic(request)) {
    return new NextResponse(null, { status: 403 });
  }

  const { pathname } = request.nextUrl;

  // If locale was already resolved by a previous middleware pass (rewrite), keep it
  const existingLocale = request.headers.get('x-locale');
  if (existingLocale && (existingLocale === 'de' || existingLocale === 'es' || existingLocale === 'pt')) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  // Helper: create a rewrite that forwards locale info via REQUEST headers
  // so that headers() in server components can read them.
  function rewriteWithLocale(dest: string, locale: string, originalPath: string) {
    const reqHeaders = new Headers(request.headers);
    reqHeaders.set('x-locale', locale);
    reqHeaders.set('x-pathname', originalPath);
    const url = request.nextUrl.clone();
    url.pathname = dest;
    return NextResponse.rewrite(url, { request: { headers: reqHeaders } });
  }

  function nextWithLocale(locale: string, originalPath: string) {
    const reqHeaders = new Headers(request.headers);
    reqHeaders.set('x-locale', locale);
    reqHeaders.set('x-pathname', originalPath);
    return NextResponse.next({ request: { headers: reqHeaders } });
  }

  // ── Localized OnlyFans search paths ─────────────────────────────────────────
  // /de/onlyfans-suche* → rewrite to /onlyfanssearch*, x-locale: de
  // /es/onlyfans-busca* → rewrite to /onlyfanssearch*, x-locale: es
  const OF_LOCALE_SEGMENTS: Record<string, string> = {
    de: OF_SEARCH_HUB.de,
    es: OF_SEARCH_HUB.es,
    pt: OF_SEARCH_HUB.pt,
  };

  for (const [loc, seg] of Object.entries(OF_LOCALE_SEGMENTS)) {
    const prefix = `/${loc}/${seg}`;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      const rest = pathname.slice(prefix.length);
      let dest = `/onlyfanssearch${rest}`;
      const catMatch = rest.match(/^\/([^/]+)(\/.*)?$/);
      if (catMatch) {
        const enSlug = resolveBestOfSlugFromPublicSegment(catMatch[1]);
        if (enSlug) {
          dest = `/onlyfanssearch/top-10-${enSlug}-onlyfans-models${catMatch[2] || ''}`;
        }
      }
      return rewriteWithLocale(dest, loc, pathname);
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

  // ── Localized Best Telegram Groups ranking slugs (new URLs, EN unchanged) ──
  for (const loc of LOCALE_PREFIXES) {
    const hubSeg = getLocalizedHubSegment('best-telegram-groups', loc) || 'best-telegram-groups';
    for (const hub of [hubSeg, 'best-telegram-groups']) {
      const prefix = `/${loc}/${hub}`;
      const m = pathname.match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/([^/]+)$`));
      if (!m) continue;
      const enCat = resolveBestTgSlugFromPublicSegment(m[1]);
      if (enCat) {
        return rewriteWithLocale(`/best-telegram-groups/${enCat}`, loc, pathname);
      }
    }
  }

  // ── Localized Best OF category ranking slugs ──
  for (const loc of LOCALE_PREFIXES) {
    const hubSeg = getLocalizedHubSegment('best-onlyfans-accounts', loc) || 'best-onlyfans-accounts';
    for (const hub of [hubSeg, 'best-onlyfans-accounts']) {
      const prefix = `/${loc}/${hub}`;
      const m = pathname.match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/([^/]+)$`));
      if (!m) continue;
      const enCat = resolveOfCategorySlugFromPublicSegment(m[1]);
      if (enCat) {
        return rewriteWithLocale(`/best-onlyfans-accounts/${enCat}`, loc, pathname);
      }
    }
  }

  // ── Localized listing slugs (/de/geile-amateur-gruppe → /amateur-group) ──
  const RESERVED_LOCALE_SEGMENTS = new Set([
    'groups', 'bots', 'onlyfanssearch',
    'best-telegram-groups', 'best-onlyfans-accounts', 'add', 'about', 'terms',
    'privacy', 'contact', 'blog', 'ainsfw', 'advertise', 'advertisers', 'trending',
    'top100', 'premium', 'premium10', 'premium15',
  ]);
  const hubDe = getLocalizedHubSegment('best-telegram-groups', 'de');
  const hubEs = getLocalizedHubSegment('best-telegram-groups', 'es');
  const hubPt = getLocalizedHubSegment('best-telegram-groups', 'pt');
  const boaDe = getLocalizedHubSegment('best-onlyfans-accounts', 'de');
  const boaEs = getLocalizedHubSegment('best-onlyfans-accounts', 'es');
  const boaPt = getLocalizedHubSegment('best-onlyfans-accounts', 'pt');
  if (hubDe) RESERVED_LOCALE_SEGMENTS.add(hubDe);
  if (hubEs) RESERVED_LOCALE_SEGMENTS.add(hubEs);
  if (hubPt) RESERVED_LOCALE_SEGMENTS.add(hubPt);
  if (boaDe) RESERVED_LOCALE_SEGMENTS.add(boaDe);
  if (boaEs) RESERVED_LOCALE_SEGMENTS.add(boaEs);
  if (boaPt) RESERVED_LOCALE_SEGMENTS.add(boaPt);
  for (const loc of LOCALE_PREFIXES) {
    const m = pathname.match(new RegExp(`^/${loc}/([^/]+)$`));
    if (!m) continue;
    const seg = m[1];
    if (RESERVED_LOCALE_SEGMENTS.has(seg)) continue;
    const hit = resolveListingSlugFromPublicSegment(seg);
    if (hit) {
      return rewriteWithLocale(`/${hit.enSlug}`, loc, pathname);
    }
  }

  // ── Best Telegram Groups slug normalization ────────────────────────────────
  // Old category URLs used spaces / %20 (e.g. /best-telegram-groups/big%20ass,
  // /best-telegram-groups/goth%20&%20alt). 301 them to the hyphenated canonical
  // (/best-telegram-groups/big-ass). Preserves any locale prefix + country paths.
  {
    const btgMatch = pathname.match(/^(\/(?:de|es|pt))?\/best-telegram-groups\/(?!country\/)([^/]+)$/);
    if (btgMatch) {
      const rawSeg = btgMatch[2];
      const decoded = decodeURIComponent(rawSeg);
      const normalized = decoded
        .toLowerCase()
        .replace(/&/g, ' ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      if (rawSeg !== normalized) {
        const url = request.nextUrl.clone();
        url.pathname = `${btgMatch[1] || ''}/best-telegram-groups/${normalized}`;
        return NextResponse.redirect(url, 301);
      }
    }
  }

  // English-only URL slugs (articles) — 301 strip locale prefix. ainsfw/blog rewrite normally.
  const englishOnlySections = ['articles'];
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
      const strippedPath = pathname.replace(`/${locale}`, '') || '/';
      return rewriteWithLocale(strippedPath, locale, pathname);
    }
  }

  // English: no rewrite, just tag the locale header
  return nextWithLocale('en', pathname);
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
   * - /OF/...           (OF admin panel — stays English only)
   * - /advert/...       (advertiser panel — stays English only)
   */
  matcher: [
    '/((?!api|_next|assets|icons|fonts|favicon|manifest|robots|sitemap|admin|OF|advert).*)',
  ],
};