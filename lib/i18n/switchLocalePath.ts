/**
 * Build the correct public URL when switching locale — handles localized hub
 * segments (onlyfans-suche, gruppen, …) and translated slugs (hottest OF, etc.).
 */
import type { Locale } from './config';
import { DEFAULT_LOCALE, OF_SEARCH_HUB, localePath } from './config';
import { getLocalizedHubSegment, resolveHubKeyFromPublicSegment } from './hubSlugTranslations';
import {
  getLocalizedListingSlug,
  resolveListingSlugFromPublicSegment,
  type ListingSlugType,
} from './listingSlugTranslations';
import {
  bestOfSlugFromPublicPath,
  hottestRankingPublicPath,
} from '@/lib/bestOfPageContent/hottestUrls';
import { bestTgCategoryPublicPath, bestTgCategoryFromPublicSegment } from '@/lib/bestTelegramGroups/btgUrls';
import { ofCategoryPublicPath, ofCategoryFromPublicSegment } from '@/lib/bestOnlyfansAccounts/boaUrls';

const LOCALE_PREFIX_RE = /^\/(de|es|pt)(?=\/|$)/;
const ENGLISH_ONLY_HUBS = new Set(['blog', 'articles', 'ainsfw']);

const LISTING_TYPES: ListingSlugType[] = ['group', 'bot', 'ainsfw', 'blog'];

function stripLocalePrefix(pathname: string): { locale: Locale | null; rest: string } {
  const m = pathname.match(LOCALE_PREFIX_RE);
  if (!m) return { locale: null, rest: pathname || '/' };
  const locale = m[1] as Locale;
  const rest = pathname.slice(m[0].length) || '/';
  return { locale, rest: rest.startsWith('/') ? rest : `/${rest}` };
}

function hubKeyFromSegment(seg: string): string | null {
  return resolveHubKeyFromPublicSegment(seg);
}

/** Public path (no locale prefix) → internal canonical path. */
export function internalPathFromPublicRest(rest: string): string {
  const normalized = rest.startsWith('/') ? rest : `/${rest}`;
  if (normalized === '/') return '/';

  const parts = normalized.split('/').filter(Boolean);
  const first = parts[0];

  // Root-level localized listing: /de/geile-amateur-gruppe
  if (parts.length === 1) {
    const hit = resolveListingSlugFromPublicSegment(first);
    if (hit) return `/${hit.enSlug}`;
    return normalized;
  }

  const hubKey = hubKeyFromSegment(first);
  if (!hubKey) return normalized;

  if (ENGLISH_ONLY_HUBS.has(hubKey)) return `/${hubKey}${parts.length > 1 ? `/${parts.slice(1).join('/')}` : ''}`;

  if (hubKey === 'onlyfanssearch') {
    if (parts.length === 1) return '/onlyfanssearch';
    const seg = parts[1];
    const bestOf = bestOfSlugFromPublicPath(seg);
    if (bestOf) return `/onlyfanssearch/top-10-${bestOf}-onlyfans-models`;
    return `/onlyfanssearch/${parts.slice(1).join('/')}`;
  }

  if (hubKey === 'best-telegram-groups') {
    if (parts.length === 1) return '/best-telegram-groups';
    if (parts[1] === 'country') return `/best-telegram-groups/country/${parts.slice(2).join('/')}`;
    const enCat = bestTgCategoryFromPublicSegment(parts[1]) || parts[1];
    return `/best-telegram-groups/${enCat}`;
  }

  if (hubKey === 'best-onlyfans-accounts') {
    if (parts.length === 1) return '/best-onlyfans-accounts';
    const enCat = ofCategoryFromPublicSegment(parts[1]) || parts[1];
    return `/best-onlyfans-accounts/${enCat}`;
  }

  return `/${hubKey}/${parts.slice(1).join('/')}`;
}

function localizedListingPath(enSlug: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return `/${enSlug}`;
  const loc = locale as 'de' | 'es' | 'pt';
  for (const type of LISTING_TYPES) {
    const slug = getLocalizedListingSlug(type, enSlug, loc);
    if (slug?.trim()) return `/${locale}/${slug}`;
  }
  return `/${locale}/${enSlug}`;
}

function hubPublicPath(hubKey: string, locale: Locale, tail = ''): string {
  if (locale === DEFAULT_LOCALE) {
    return tail ? `/${hubKey}/${tail}` : `/${hubKey}`;
  }
  const seg = getLocalizedHubSegment(hubKey, locale as 'de' | 'es' | 'pt') || hubKey;
  return tail ? `/${locale}/${seg}/${tail}` : `/${locale}/${seg}`;
}

/** Internal canonical path → public URL for target locale. */
export function publicPathFromInternal(internal: string, locale: Locale): string {
  const normalized = internal.startsWith('/') ? internal : `/${internal}`;
  if (normalized === '/') return localePath('/', locale);

  const parts = normalized.split('/').filter(Boolean);
  const hub = parts[0];

  if (ENGLISH_ONLY_HUBS.has(hub)) {
    if (locale === DEFAULT_LOCALE) return parts.length > 1 ? `/${parts.join('/')}` : `/${hub}`;
    // URL stays English-shaped; locale prefix drives UI strings (same as live buildLocalePath).
    return localePath(normalized, locale);
  }

  if (hub === 'onlyfanssearch') {
    if (parts.length === 1) {
      return locale === DEFAULT_LOCALE ? '/onlyfanssearch' : `/${locale}/${OF_SEARCH_HUB[locale]}`;
    }
    const seg = parts[1];
    const top10 = seg.match(/^top-10-(.+)-onlyfans-models$/);
    if (top10) return hottestRankingPublicPath(top10[1], locale);
    const resolved = bestOfSlugFromPublicPath(seg);
    if (resolved) return hottestRankingPublicPath(resolved, locale);
    if (locale === DEFAULT_LOCALE) return `/onlyfanssearch/${parts.slice(1).join('/')}`;
    return `/${locale}/${OF_SEARCH_HUB[locale]}/${parts.slice(1).join('/')}`;
  }

  if (hub === 'best-telegram-groups') {
    if (parts.length === 1) return hubPublicPath('best-telegram-groups', locale);
    if (parts[1] === 'country') {
      return locale === DEFAULT_LOCALE
        ? `/best-telegram-groups/country/${parts.slice(2).join('/')}`
        : `${hubPublicPath('best-telegram-groups', locale)}/country/${parts.slice(2).join('/')}`;
    }
    return bestTgCategoryPublicPath(parts[1], locale);
  }

  if (hub === 'best-onlyfans-accounts') {
    if (parts.length === 1) return hubPublicPath('best-onlyfans-accounts', locale);
    return ofCategoryPublicPath(parts[1], locale);
  }

  if (hub === 'groups' || hub === 'bots') {
    return hubPublicPath(hub, locale, parts.slice(1).join('/'));
  }

  // Single-segment paths: group/bot listing pages
  if (parts.length === 1) {
    return localizedListingPath(parts[0], locale);
  }

  return localePath(normalized, locale);
}

/**
 * Switch the current page to another locale's public URL.
 * @param pathname — browser URL or Next.js pathname (may be internal when middleware rewrites)
 * @param currentLocale — active locale from x-locale / LocaleProvider
 */
export function switchLocalePath(pathname: string, currentLocale: Locale, targetLocale: Locale): string {
  const raw = pathname || '/';

  // Public URL with locale prefix (/de/onlyfans-suche/…)
  if (LOCALE_PREFIX_RE.test(raw)) {
    const { rest } = stripLocalePrefix(raw);
    const internal = internalPathFromPublicRest(rest);
    return publicPathFromInternal(internal, targetLocale);
  }

  // Internal rewritten path (middleware) — currentLocale is the real locale
  const internal = raw.startsWith('/') ? raw : `/${raw}`;
  return publicPathFromInternal(internal, targetLocale);
}
