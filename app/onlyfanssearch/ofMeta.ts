/**
 * Locale-aware metadata helpers for all OnlyFans Search pages.
 *
 * Rules:
 * - Category/country slugs NEVER change — only display text in metadata.
 * - UI strings stay English; only title, description, OG, Twitter are localized.
 * - EN uses SEO vanity URLs (/blondeonlyfans).
 * - DE uses /de/onlyfans-suche/... (localized URL segment).
 * - ES uses /es/onlyfans-busca/... (localized URL segment).
 * - PT uses /pt/onlyfans-pesquisa/... (localized URL segment).
 */
import type { Metadata } from 'next';
import { LOCALES, LOCALE_HREFLANG, OF_SEARCH_HUB, type Locale } from '@/lib/i18n/config';
import { ofCategoryUrl } from './constants';
import { buildSocialMeta } from '@/lib/seo/socialMeta';

const BASE = 'https://erogram.pro';
const robots = { index: true, follow: true } as const;

function mainPath(locale: Locale) {
  return locale === 'en' ? '/onlyfanssearch' : `/${locale}/${OF_SEARCH_HUB[locale]}`;
}
function catPath(catSlug: string, locale: Locale) {
  return locale === 'en' ? ofCategoryUrl(catSlug) : `/${locale}/${OF_SEARCH_HUB[locale]}/${catSlug}`;
}
function topPath(_locale: Locale) {
  return '/Toponlyfanscreators';
}

function alt(paths: Record<Locale, string>, currentPath: string) {
  return {
    canonical: `${BASE}${currentPath}`,
  };
}

export function mainOfMeta(locale: Locale): Metadata {
  const current = mainPath(locale);

  const title: Record<Locale, string> = {
    en: 'OnlyFans Search Tool - Explore the Best OnlyFans Creators',
    de: 'OnlyFans Suchtool — Die besten OnlyFans Creator nach Kategorie & Land finden',
    es: 'Buscador de OnlyFans — Encuentra las Mejores Creadoras por Categoría y País',
    pt: 'Busca OnlyFans — Encontre as Melhores Criadoras por Categoria e País',
  };
  const desc: Record<Locale, string> = {
    en: 'The best OnlyFans search tool. Find top OnlyFans creators by category, country, or name. Browse verified profiles and discover trending accounts — updated daily.',
    de: 'Das beste OnlyFans Suchtool. Finde top OnlyFans Creator nach Kategorie, Land oder Name. Verifizierte Profile entdecken und Trends folgen — täglich aktualisiert.',
    es: 'El mejor buscador de OnlyFans. Encuentra las mejores creadoras por categoría, país o nombre. Explora perfiles verificados y descubre tendencias — actualizado diariamente.',
    pt: 'A melhor ferramenta de busca OnlyFans. Encontre as top criadoras por categoria, país ou nome. Perfis verificados e tendências — atualizado diariamente.',
  };
  const ogTitle: Record<Locale, string> = {
    en: 'OnlyFans Search Tool — Find the Best OnlyFans Creators',
    de: 'OnlyFans Suchtool — Die besten OnlyFans Creator finden',
    es: 'Buscador de OnlyFans — Las Mejores Creadoras',
    pt: 'Busca OnlyFans — As Melhores Criadoras',
  };

  return {
    title: title[locale],
    description: desc[locale],
    alternates: alt(
      {
        en: '/onlyfanssearch',
        de: `/de/${OF_SEARCH_HUB.de}`,
        es: `/es/${OF_SEARCH_HUB.es}`,
        pt: `/pt/${OF_SEARCH_HUB.pt}`,
      },
      current,
    ),
    robots,
    ...buildSocialMeta({
      title: ogTitle[locale],
      description: desc[locale],
      url: `${BASE}${current}`,
      type: 'website',
    }),
  };
}

export function categoryOfMeta(locale: Locale, catSlug: string, label: string): Metadata {
  const current = catPath(catSlug, locale);
  const l = label.toLowerCase();

  const title =
    locale === 'de'
      ? `Beste ${label} OnlyFans Creator (2026) — Top ${label} Accounts & Profile`
      : locale === 'es'
      ? `Mejores Creadoras ${label} de OnlyFans (2026) — Top Cuentas ${label}`
      : locale === 'pt'
      ? `Melhores Criadoras ${label} de OnlyFans (2026) — Top Contas ${label}`
      : `Best ${label} OnlyFans Creators (2026) — Top ${label} Accounts & Profiles`;

  const desc =
    locale === 'de'
      ? `Nutze unser OnlyFans Suchtool für die besten ${label} Creator. Verifizierte ${l} OnlyFans Profile durchsuchen, Preise vergleichen — täglich aktualisiert.`
      : locale === 'es'
      ? `Usa nuestro buscador de OnlyFans para las mejores creadoras ${label}. Explora perfiles verificados, compara precios — actualizado diariamente.`
      : locale === 'pt'
      ? `Use nossa busca OnlyFans para as melhores criadoras ${label}. Perfis verificados, compare preços — atualizado diariamente.`
      : `Use our OnlyFans search tool to find the best ${l} creators. Browse verified ${l} OnlyFans profiles, compare prices, and discover top accounts — updated daily.`;

  const ogTitle =
    locale === 'de'
      ? `Beste ${label} OnlyFans Creator (2026) | Erogram`
      : locale === 'es'
      ? `Mejores Creadoras ${label} de OnlyFans (2026) | Erogram`
      : locale === 'pt'
      ? `Melhores Criadoras ${label} de OnlyFans (2026) | Erogram`
      : `Best ${label} OnlyFans Creators (2026) | Erogram`;

  return {
    title,
    description: desc,
    alternates: alt(
      {
        en: ofCategoryUrl(catSlug),
        de: `/de/${OF_SEARCH_HUB.de}/${catSlug}`,
        es: `/es/${OF_SEARCH_HUB.es}/${catSlug}`,
        pt: `/pt/${OF_SEARCH_HUB.pt}/${catSlug}`,
      },
      current,
    ),
    robots,
    ...buildSocialMeta({
      title: ogTitle,
      description: desc,
      url: `${BASE}${current}`,
      type: 'website',
    }),
  };
}

export function topCreatorsOfMeta(locale: Locale): Metadata {
  const current = topPath(locale);

  const title: Record<Locale, string> = {
    en: 'Top OnlyFans Creators in 2026 — Most Popular Accounts Ranked | Erogram',
    de: 'Top OnlyFans Creator 2026 — Beliebteste Accounts im Ranking | Erogram',
    es: 'Top Creadoras de OnlyFans 2026 — Las Más Populares en el Ranking | Erogram',
    pt: 'Top Criadoras de OnlyFans 2026 — As Mais Populares no Ranking | Erogram',
  };
  const desc: Record<Locale, string> = {
    en: 'Discover the most popular OnlyFans creators in 2026. Ranked by likes and subscriber count on the best OnlyFans search tool — updated daily.',
    de: 'Entdecke die beliebtesten OnlyFans Creator 2026. Gerankt nach Likes und Abonnenten mit dem besten OnlyFans Suchtool — täglich aktualisiert.',
    es: 'Descubre las creadoras de OnlyFans más populares en 2026. Clasificadas por likes y suscriptores en el mejor buscador de OnlyFans — actualizado diariamente.',
    pt: 'Descubra as criadoras de OnlyFans mais populares em 2026. Classificadas por likes e assinantes na melhor busca OnlyFans — atualizado diariamente.',
  };
  const ogTitle: Record<Locale, string> = {
    en: 'Top OnlyFans Creators in 2026 | Erogram',
    de: 'Top OnlyFans Creator 2026 | Erogram',
    es: 'Top Creadoras de OnlyFans 2026 | Erogram',
    pt: 'Top Criadoras de OnlyFans 2026 | Erogram',
  };

  return {
    title: title[locale],
    description: desc[locale],
    alternates: alt(
      {
        en: '/Toponlyfanscreators',
        de: '/Toponlyfanscreators',
        es: '/Toponlyfanscreators',
        pt: '/Toponlyfanscreators',
      },
      current,
    ),
    robots,
    ...buildSocialMeta({
      title: ogTitle[locale],
      description: desc[locale],
      url: `${BASE}${current}`,
      type: 'website',
    }),
  };
}
