/**
 * Locale-aware metadata helpers for all OnlyFans Search pages.
 *
 * Rules:
 * - Category/country slugs NEVER change — only display text in metadata.
 * - UI strings stay English; only title, description, OG, Twitter are localized.
 * - EN uses SEO vanity URLs (/blondeonlyfans).
 * - DE uses /de/onlyfans-suche/... (localized URL segment).
 * - ES uses /es/onlyfans-busca/... (localized URL segment).
 */
import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n/config';
import { ofCategoryUrl, ofCountryUrl, ofCountryCategoryUrl } from './constants';

const BASE = 'https://erogram.pro';
const robots = { index: true, follow: true } as const;

// ── Localized URL segment for "onlyfans-search" per locale ───────────────────
function ofSeg(locale: Locale): string {
  if (locale === 'de') return 'onlyfans-suche';
  if (locale === 'es') return 'onlyfans-busca';
  return 'onlyfanssearch';
}

// ── Canonical URL per locale for each page type ─────────────────────────────

function mainPath(locale: Locale) {
  return locale === 'en' ? '/onlyfanssearch' : `/${locale}/${ofSeg(locale)}`;
}
function catPath(catSlug: string, locale: Locale) {
  return locale === 'en' ? ofCategoryUrl(catSlug) : `/${locale}/${ofSeg(locale)}/${catSlug}`;
}
function countryPath(countrySlug: string, locale: Locale) {
  // Countries are category tags in the DB — DE/ES paths follow the same flat structure as categories.
  return locale === 'en' ? ofCountryUrl(countrySlug) : `/${locale}/${ofSeg(locale)}/${countrySlug}`;
}
function countryCatPath(countrySlug: string, catSlug: string, locale: Locale) {
  return locale === 'en'
    ? ofCountryCategoryUrl(countrySlug, catSlug)
    : `/${locale}/${ofSeg(locale)}/${countrySlug}/${catSlug}`;
}
function topPath(locale: Locale) {
  return locale === 'en'
    ? '/onlyfanssearch/top-creators-2026'
    : `/${locale}/${ofSeg(locale)}/top-creators-2026`;
}

// ── Alternates: all 3 locales + x-default pointing at EN ────────────────────

function alt(enPath: string, dePath: string, esPath: string, currentPath: string) {
  return {
    canonical: `${BASE}${currentPath}`,
    languages: {
      en: `${BASE}${enPath}`,
      de: `${BASE}${dePath}`,
      es: `${BASE}${esPath}`,
      'x-default': `${BASE}${enPath}`,
    },
  };
}

// ── Main search page (/onlyfans-search) ─────────────────────────────────────

export function mainOfMeta(locale: Locale): Metadata {
  const current = mainPath(locale);

  const title: Record<Locale, string> = {
    en: 'OnlyFans Search Tool — Find the Best OnlyFans Creators by Category & Country',
    de: 'OnlyFans Suchtool — Die besten OnlyFans Creator nach Kategorie & Land finden',
    es: 'Buscador de OnlyFans — Encuentra las Mejores Creadoras por Categoría y País',
  };
  const desc: Record<Locale, string> = {
    en: 'The best OnlyFans search tool. Find top OnlyFans creators by category, country, or name. Browse verified profiles and discover trending accounts — updated daily.',
    de: 'Das beste OnlyFans Suchtool. Finde top OnlyFans Creator nach Kategorie, Land oder Name. Verifizierte Profile entdecken und Trends folgen — täglich aktualisiert.',
    es: 'El mejor buscador de OnlyFans. Encuentra las mejores creadoras por categoría, país o nombre. Explora perfiles verificados y descubre tendencias — actualizado diariamente.',
  };
  const ogTitle: Record<Locale, string> = {
    en: 'OnlyFans Search Tool — Find the Best OnlyFans Creators',
    de: 'OnlyFans Suchtool — Die besten OnlyFans Creator finden',
    es: 'Buscador de OnlyFans — Las Mejores Creadoras',
  };
  const twTitle: Record<Locale, string> = {
    en: 'OnlyFans Search Tool — Find the Best Creators | Erogram',
    de: 'OnlyFans Suchtool — Die besten Creator finden | Erogram',
    es: 'Buscador de OnlyFans — Las Mejores Creadoras | Erogram',
  };
  const twDesc: Record<Locale, string> = {
    en: 'The best OnlyFans search tool. Find top creators by category, country, or name — updated daily.',
    de: 'Das beste OnlyFans Suchtool. Creator nach Kategorie, Land oder Name finden — täglich aktualisiert.',
    es: 'El mejor buscador de OnlyFans. Encuentra creadoras por categoría, país o nombre — actualizado diariamente.',
  };

  return {
    title: title[locale],
    description: desc[locale],
    alternates: alt('/onlyfanssearch', '/de/onlyfans-suche', '/es/onlyfans-busca', current),
    robots,
    openGraph: {
      title: ogTitle[locale],
      description: desc[locale],
      type: 'website',
      url: `${BASE}${current}`,
      siteName: 'Erogram',
    },
    twitter: {
      card: 'summary_large_image',
      title: twTitle[locale],
      description: twDesc[locale],
    },
  };
}

// ── Category page (/blondeonlyfans, /de/onlyfans-search/blonde) ──────────────
// `label` = English display name from constants (e.g. "Blonde") — never translated,
// only the surrounding sentence structure changes per locale.

export function categoryOfMeta(locale: Locale, catSlug: string, label: string): Metadata {
  const current = catPath(catSlug, locale);
  const l = label.toLowerCase();

  const title =
    locale === 'de'
      ? `Beste ${label} OnlyFans Creator (2026) — Top ${label} Accounts & Profile`
      : locale === 'es'
      ? `Mejores Creadoras ${label} de OnlyFans (2026) — Top Cuentas ${label}`
      : `Best ${label} OnlyFans Creators (2026) — Top ${label} Accounts & Profiles`;

  const desc =
    locale === 'de'
      ? `Nutze unser OnlyFans Suchtool für die besten ${label} Creator. Verifizierte ${l} OnlyFans Profile durchsuchen, Preise vergleichen — täglich aktualisiert.`
      : locale === 'es'
      ? `Usa nuestro buscador de OnlyFans para las mejores creadoras ${label}. Explora perfiles verificados, compara precios — actualizado diariamente.`
      : `Use our OnlyFans search tool to find the best ${l} creators. Browse verified ${l} OnlyFans profiles, compare prices, and discover top accounts — updated daily.`;

  const ogTitle =
    locale === 'de'
      ? `Beste ${label} OnlyFans Creator (2026) | Erogram`
      : locale === 'es'
      ? `Mejores Creadoras ${label} de OnlyFans (2026) | Erogram`
      : `Best ${label} OnlyFans Creators (2026) | Erogram`;

  const twTitle =
    locale === 'de'
      ? `Beste ${label} OnlyFans Creator (2026)`
      : locale === 'es'
      ? `Mejores Creadoras ${label} de OnlyFans (2026)`
      : `Best ${label} OnlyFans Creators (2026)`;

  const twDesc =
    locale === 'de'
      ? `Top ${l} OnlyFans Accounts — verifizierte Profile vergleichen auf Erogram.`
      : locale === 'es'
      ? `Top cuentas ${l} de OnlyFans — explora perfiles verificados en Erogram.`
      : `Top ${l} OnlyFans accounts — browse verified profiles and compare prices on Erogram.`;

  return {
    title,
    description: desc,
    alternates: alt(
      ofCategoryUrl(catSlug),
      `/de/onlyfans-suche/${catSlug}`,
      `/es/onlyfans-busca/${catSlug}`,
      current,
    ),
    robots,
    openGraph: {
      title: ogTitle,
      description: desc,
      type: 'website',
      url: `${BASE}${current}`,
      siteName: 'Erogram',
    },
    twitter: {
      card: 'summary_large_image',
      title: twTitle,
      description: twDesc,
    },
  };
}

// ── Country page (/onlyfansfrance, /de/onlyfans-search/country/france) ────────
// `countryName` = English name from constants (e.g. "France") — kept as-is across locales.

export function countryOfMeta(locale: Locale, countrySlug: string, countryName: string): Metadata {
  const current = countryPath(countrySlug, locale);

  const title =
    locale === 'de'
      ? `Beste ${countryName} OnlyFans Creator (2026) — Top ${countryName} Accounts & Profile`
      : locale === 'es'
      ? `Mejores Creadoras ${countryName} de OnlyFans (2026) — Top Cuentas ${countryName}`
      : `Best ${countryName} OnlyFans Creators (2026) — Top ${countryName} Accounts & Profiles`;

  const desc =
    locale === 'de'
      ? `Nutze unser OnlyFans Suchtool für die besten ${countryName} Creator. Verifizierte ${countryName} OnlyFans Profile durchsuchen, Preise vergleichen — täglich aktualisiert.`
      : locale === 'es'
      ? `Usa nuestro buscador de OnlyFans para las mejores creadoras ${countryName}. Explora perfiles verificados, compara precios — actualizado diariamente.`
      : `Use our OnlyFans search tool to find the best ${countryName} creators. Browse verified ${countryName} OnlyFans profiles, compare prices, and discover top accounts — updated daily.`;

  const ogTitle =
    locale === 'de'
      ? `Beste ${countryName} OnlyFans Creator (2026) | Erogram`
      : locale === 'es'
      ? `Mejores Creadoras ${countryName} de OnlyFans (2026) | Erogram`
      : `Best ${countryName} OnlyFans Creators (2026) | Erogram`;

  const twTitle =
    locale === 'de'
      ? `Beste ${countryName} OnlyFans Creator (2026)`
      : locale === 'es'
      ? `Mejores Creadoras ${countryName} de OnlyFans (2026)`
      : `Best ${countryName} OnlyFans Creators (2026)`;

  const twDesc =
    locale === 'de'
      ? `Top ${countryName} OnlyFans Accounts — verifizierte Profile vergleichen auf Erogram.`
      : locale === 'es'
      ? `Top cuentas ${countryName} de OnlyFans — explora perfiles verificados en Erogram.`
      : `Top ${countryName} OnlyFans accounts — browse verified profiles and compare prices on Erogram.`;

  return {
    title,
    description: desc,
    alternates: alt(
      ofCountryUrl(countrySlug),
      `/de/onlyfans-suche/${countrySlug}`,
      `/es/onlyfans-busca/${countrySlug}`,
      current,
    ),
    robots,
    openGraph: {
      title: ogTitle,
      description: desc,
      type: 'website',
      url: `${BASE}${current}`,
      siteName: 'Erogram',
    },
    twitter: {
      card: 'summary_large_image',
      title: twTitle,
      description: twDesc,
    },
  };
}

// ── Country + Category page (/onlyfansfrance/blondeonlyfans) ─────────────────

export function countryCategoryOfMeta(
  locale: Locale,
  countrySlug: string,
  countryName: string,
  catSlug: string,
  catName: string,
): Metadata {
  const current = countryCatPath(countrySlug, catSlug, locale);
  const cl = catName.toLowerCase();

  const title =
    locale === 'de'
      ? `Beste ${catName} OnlyFans aus ${countryName} (2026) — Top ${catName} ${countryName} Creator`
      : locale === 'es'
      ? `Mejores Creadoras ${catName} de OnlyFans en ${countryName} (2026) — Top ${catName} ${countryName}`
      : `Best ${catName} OnlyFans from ${countryName} (2026) — Top ${catName} ${countryName} Creators`;

  const desc =
    locale === 'de'
      ? `Nutze unser OnlyFans Suchtool für die besten ${catName} Creator aus ${countryName}. Verifizierte ${cl} Profile aus ${countryName} vergleichen — täglich aktualisiert.`
      : locale === 'es'
      ? `Usa nuestro buscador de OnlyFans para las mejores creadoras ${catName} en ${countryName}. Explora perfiles verificados, compara precios — actualizado diariamente.`
      : `Find the best ${cl} OnlyFans creators from ${countryName} with our OnlyFans search tool. Browse verified ${cl} profiles from ${countryName}, compare prices — updated daily.`;

  const ogTitle =
    locale === 'de'
      ? `Beste ${catName} OnlyFans aus ${countryName} (2026) | Erogram`
      : locale === 'es'
      ? `Mejores Creadoras ${catName} de OnlyFans en ${countryName} (2026) | Erogram`
      : `Best ${catName} OnlyFans from ${countryName} (2026) | Erogram`;

  const twTitle =
    locale === 'de'
      ? `Beste ${catName} OnlyFans aus ${countryName} (2026)`
      : locale === 'es'
      ? `Mejores Creadoras ${catName} de OnlyFans en ${countryName} (2026)`
      : `Best ${catName} OnlyFans from ${countryName} (2026)`;

  const twDesc =
    locale === 'de'
      ? `Top ${cl} OnlyFans Accounts aus ${countryName} — verifizierte Profile auf Erogram.`
      : locale === 'es'
      ? `Top cuentas ${cl} OnlyFans en ${countryName} — perfiles verificados en Erogram.`
      : `Top ${cl} OnlyFans accounts from ${countryName} — browse verified profiles on Erogram.`;

  return {
    title,
    description: desc,
    alternates: alt(
      ofCountryCategoryUrl(countrySlug, catSlug),
      `/de/onlyfans-suche/${countrySlug}/${catSlug}`,
      `/es/onlyfans-busca/${countrySlug}/${catSlug}`,
      current,
    ),
    robots,
    openGraph: {
      title: ogTitle,
      description: desc,
      type: 'website',
      url: `${BASE}${current}`,
      siteName: 'Erogram',
    },
    twitter: {
      card: 'summary_large_image',
      title: twTitle,
      description: twDesc,
    },
  };
}

// ── Top creators page (/onlyfans-search/top-creators-2026) ───────────────────

export function topCreatorsOfMeta(locale: Locale): Metadata {
  const current = topPath(locale);

  const title: Record<Locale, string> = {
    en: 'Top OnlyFans Creators in 2026 — Most Popular Accounts Ranked | Erogram',
    de: 'Top OnlyFans Creator 2026 — Beliebteste Accounts im Ranking | Erogram',
    es: 'Top Creadoras de OnlyFans 2026 — Las Más Populares en el Ranking | Erogram',
  };
  const desc: Record<Locale, string> = {
    en: 'Discover the most popular OnlyFans creators in 2026. Ranked by likes and subscriber count on the best OnlyFans search tool — updated daily.',
    de: 'Entdecke die beliebtesten OnlyFans Creator 2026. Gerankt nach Likes und Abonnenten mit dem besten OnlyFans Suchtool — täglich aktualisiert.',
    es: 'Descubre las creadoras de OnlyFans más populares en 2026. Clasificadas por likes y suscriptores en el mejor buscador de OnlyFans — actualizado diariamente.',
  };
  const ogTitle: Record<Locale, string> = {
    en: 'Top OnlyFans Creators in 2026 | Erogram',
    de: 'Top OnlyFans Creator 2026 | Erogram',
    es: 'Top Creadoras de OnlyFans 2026 | Erogram',
  };
  const twDesc: Record<Locale, string> = {
    en: 'Most popular OnlyFans accounts in 2026, ranked by likes and subscribers — updated daily.',
    de: 'Beliebteste OnlyFans Accounts 2026, gerankt nach Likes und Abonnenten — täglich aktualisiert.',
    es: 'Las cuentas OnlyFans más populares en 2026, clasificadas por likes y suscriptores — actualizado diariamente.',
  };

  return {
    title: title[locale],
    description: desc[locale],
    alternates: alt(
      '/onlyfanssearch/top-creators-2026',
      '/de/onlyfans-suche/top-creators-2026',
      '/es/onlyfans-busca/top-creators-2026',
      current,
    ),
    robots,
    openGraph: {
      title: ogTitle[locale],
      description: desc[locale],
      type: 'website',
      url: `${BASE}${current}`,
      siteName: 'Erogram',
    },
    twitter: {
      card: 'summary_large_image',
      title: title[locale],
      description: twDesc[locale],
    },
  };
}
