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
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { switchLocalePath } from '@/lib/i18n/switchLocalePath';

const robots = { index: true, follow: true } as const;

function mainPath(locale: Locale) {
  return locale === 'en' ? '/ofsearch' : `/${locale}/${OF_SEARCH_HUB[locale]}`;
}
function catPath(catSlug: string, locale: Locale) {
  return locale === 'en' ? ofCategoryUrl(catSlug) : `/${locale}/${OF_SEARCH_HUB[locale]}/${catSlug}`;
}
function topPath(_locale: Locale) {
  return '/Toponlyfanscreators';
}

function alt(pathname: string, locale: Locale) {
  return {
    canonical: `${CANONICAL_BASE}${switchLocalePath(pathname, locale, locale)}`,
    languages: {
      ...Object.fromEntries(
        LOCALES.map((loc) => [
          LOCALE_HREFLANG[loc],
          `${CANONICAL_BASE}${switchLocalePath(pathname, locale, loc)}`,
        ])
      ),
      'x-default': `${CANONICAL_BASE}${switchLocalePath(pathname, locale, 'en')}`,
    },
  };
}

export function mainOfMeta(locale: Locale): Metadata {
  const current = mainPath(locale);

  const title: Record<Locale, string> = {
    en: 'OFsearch - Explore the Best OnlyFans Creators',
    de: 'OFsearch — Die besten OnlyFans Creator nach Kategorie & Land finden',
    es: 'OFsearch — Encuentra las Mejores Creadoras por Categoría y País',
    pt: 'OFsearch — Encontre as Melhores Criadoras por Categoria e País',
  };
  const desc: Record<Locale, string> = {
    en: 'The best OFsearch tool. Find top OnlyFans creators by category, country, or name. Browse verified profiles and discover trending accounts — updated daily.',
    de: 'Das beste OFsearch-Tool. Finde top OnlyFans Creator nach Kategorie, Land oder Name. Verifizierte Profile entdecken und Trends folgen — täglich aktualisiert.',
    es: 'La mejor herramienta OFsearch. Encuentra las mejores creadoras por categoría, país o nombre. Explora perfiles verificados y descubre tendencias — actualizado diariamente.',
    pt: 'A melhor ferramenta OFsearch. Encontre as top criadoras por categoria, país ou nome. Perfis verificados e tendências — atualizado diariamente.',
  };
  const ogTitle: Record<Locale, string> = {
    en: 'OFsearch — Find the Best OnlyFans Creators',
    de: 'OFsearch — Die besten OnlyFans Creator finden',
    es: 'OFsearch — Las Mejores Creadoras',
    pt: 'OFsearch — As Melhores Criadoras',
  };

  return {
    title: title[locale],
    description: desc[locale],
    alternates: alt(current, locale),
    robots,
    ...buildSocialMeta({
      title: ogTitle[locale],
      description: desc[locale],
      url: `${CANONICAL_BASE}${current}`,
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
      ? `Nutze OFsearch für die besten ${label} Creator. Verifizierte ${l} OnlyFans Profile durchsuchen, Preise vergleichen — täglich aktualisiert.`
      : locale === 'es'
      ? `Usa OFsearch para las mejores creadoras ${label}. Explora perfiles verificados, compara precios — actualizado diariamente.`
      : locale === 'pt'
      ? `Use OFsearch para as melhores criadoras ${label}. Perfis verificados, compare preços — atualizado diariamente.`
      : `Use OFsearch to find the best ${l} creators. Browse verified ${l} OnlyFans profiles, compare prices, and discover top accounts — updated daily.`;

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
    alternates: alt(current, locale),
    robots,
    ...buildSocialMeta({
      title: ogTitle,
      description: desc,
      url: `${CANONICAL_BASE}${current}`,
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
    en: 'Discover the most popular OnlyFans creators in 2026. Ranked by likes and subscriber count on OFsearch — updated daily.',
    de: 'Entdecke die beliebtesten OnlyFans Creator 2026. Gerankt nach Likes und Abonnenten mit OFsearch — täglich aktualisiert.',
    es: 'Descubre las creadoras de OnlyFans más populares en 2026. Clasificadas por likes y suscriptores en OFsearch — actualizado diariamente.',
    pt: 'Descubra as criadoras de OnlyFans mais populares em 2026. Classificadas por likes e assinantes no OFsearch — atualizado diariamente.',
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
    alternates: alt(current, locale),
    robots,
    ...buildSocialMeta({
      title: ogTitle[locale],
      description: desc[locale],
      url: `${CANONICAL_BASE}${current}`,
      type: 'website',
    }),
  };
}
