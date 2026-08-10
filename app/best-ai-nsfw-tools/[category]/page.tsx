import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildSocialMeta, buildMetadataAlternates, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { getLocale, getPathname } from '@/lib/i18n/server';
import type { Locale } from '@/lib/i18n';
import { getBestAiToolMetaDescription } from '@/lib/bestAiNsfwTools/metaDescriptions';
import {
  BEST_AI_NSFW_TOOL_PAGES,
  BEST_AI_CRYPTO_TOOL_PAGES,
  BEST_AI_NSFW_TOOLS_HUB,
  bestAiToolPageFromSlug,
  cryptoPageFromSlug,
  getCryptoPageHeroTitle,
  getCryptoPageMetaTitle,
  getToolsForBestAiPage,
  getToolsForCryptoPage,
} from '@/lib/bestAiNsfwTools/pages';
import { buildBestAiToolTop10, buildBestAiToolTop20Crypto } from '@/lib/bestAiNsfwTools/top10List';
import { getBestAiToolsHeroIntro } from '@/lib/bestAiNsfwTools/heroIntros';
import BestAiToolsCategoryClient from '@/app/best-ai-nsfw-tools/BestAiToolsCategoryClient';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ category: string }>;
}

const MAX_TITLE_LENGTH = 68;
const BRAND_SUFFIX_LENGTH = 10;

export async function generateStaticParams() {
  return [
    ...BEST_AI_NSFW_TOOL_PAGES.map((page) => ({ category: page.slug })),
    ...BEST_AI_CRYPTO_TOOL_PAGES.map((page) => ({ category: page.slug })),
  ];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await getLocale();
  const pathname = await getPathname();
  const { category } = await params;
  const cryptoPage = cryptoPageFromSlug(category);
  if (cryptoPage) {
    const alternates = buildMetadataAlternates(pathname, locale);
    const canonical = alternates?.canonical?.toString() || `${CANONICAL_BASE}${pathname}`;
    const title = getCryptoPageMetaTitle(cryptoPage);
    const description =
      getBestAiToolMetaDescription(cryptoPage.slug, locale) ||
      `Ranked list of the top 20 ${cryptoPage.titleLabel} tools that accept cryptocurrency. Curated by Erogram.`;
    const count = getToolsForCryptoPage(cryptoPage).length;
    const meta = {
      title,
      description,
      alternates,
      other: { rating: 'adult' as const },
      ...buildSocialMeta({
        title,
        description,
        url: canonical,
        type: 'website',
      }),
    };
    if (count === 0) {
      return { ...meta, robots: { index: false, follow: true } };
    }
    return meta;
  }

  const page = bestAiToolPageFromSlug(category);
  if (!page) return {};

  const year = new Date().getFullYear();
  const count = getToolsForBestAiPage(page).length;
  const alternates = buildMetadataAlternates(pathname, locale);
  const canonical = alternates?.canonical?.toString() || `${CANONICAL_BASE}${pathname}`;
  const variant = [...page.slug].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 3;

  const titleVariants: Record<Locale, { full: [string, string, string]; compact: [string, string, string] }> = {
    en: {
      full: [
        `Top 10 Best ${page.label} AI Tools Ranked in ${year}`,
        `Best ${page.label} AI NSFW Tools to Try in ${year}`,
        `${page.label} AI Tools Top 10 List for ${year}`,
      ],
      compact: [
        `Top 10 ${page.label} AI Tools in ${year}`,
        `Best ${page.label} AI Tools in ${year}`,
        `${page.label} AI Tools Top 10 in ${year}`,
      ],
    },
    de: {
      full: [
        `Top 10 beste ${page.label} KI-Tools ${year}`,
        `Beste ${page.label} NSFW KI-Tools ${year}`,
        `${page.label} KI-Tools Top-10-Liste ${year}`,
      ],
      compact: [
        `Top 10 ${page.label} KI-Tools ${year}`,
        `Beste ${page.label} KI-Tools ${year}`,
        `${page.label} Top 10 ${year}`,
      ],
    },
    es: {
      full: [
        `Top 10 mejores herramientas IA de ${page.label} en ${year}`,
        `Mejores herramientas IA NSFW de ${page.label} en ${year}`,
        `Lista top 10 de ${page.label} IA en ${year}`,
      ],
      compact: [
        `Top 10 ${page.label} IA en ${year}`,
        `Mejores ${page.label} IA en ${year}`,
        `Top 10 ${page.label} en ${year}`,
      ],
    },
    pt: {
      full: [
        `Top 10 melhores ferramentas IA de ${page.label} em ${year}`,
        `Melhores ferramentas IA NSFW de ${page.label} em ${year}`,
        `Lista top 10 de ${page.label} IA em ${year}`,
      ],
      compact: [
        `Top 10 ${page.label} IA em ${year}`,
        `Melhores ${page.label} IA em ${year}`,
        `Top 10 ${page.label} em ${year}`,
      ],
    },
  };

  const set = titleVariants[locale] || titleVariants.en;
  const fullTitle = set.full[variant];
  const title =
    fullTitle.length + BRAND_SUFFIX_LENGTH > MAX_TITLE_LENGTH ? set.compact[variant] : fullTitle;

  const descFallback = `Discover the top 10 best ${page.label.toLowerCase()} AI tools in ${year}. Curated, ranked list of the most popular adult AI apps reviewed by Erogram.`;
  const description = getBestAiToolMetaDescription(page.slug, locale) || descFallback;

  const meta = {
    title,
    description,
    alternates,
    other: { rating: 'adult' as const },
    ...buildSocialMeta({
      title,
      description,
      url: canonical,
      type: 'website',
    }),
  };

  if (count === 0) {
    return {
      ...meta,
      robots: { index: false, follow: true },
    };
  }

  return meta;
}

export default async function BestAiToolsCategoryPage({ params }: PageProps) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const b = dict.bestAiTools ?? {};
  const { category } = await params;
  const cryptoPage = cryptoPageFromSlug(category);
  if (cryptoPage) {
    const year = new Date().getFullYear();
    const localeMap: Record<string, string> = { en: 'en-US', de: 'de-DE', es: 'es-ES', pt: 'pt-BR' };
    const month = new Date().toLocaleString(localeMap[locale] || 'en-US', { month: 'long' });
    const ranking = await buildBestAiToolTop20Crypto(cryptoPage);

    return (
      <BestAiToolsCategoryClient
        pageLabel={cryptoPage.titleLabel}
        ranking={ranking}
        month={month}
        year={year}
        updatedLabel={b.updated || 'Updated {month} {year}'}
        theBestTemplate={b.theBest || 'The {count} Best {category} AI Tools'}
        theBestFallback={b.theBestFallback || 'The Best {category} AI Tools'}
        heroTitle={getCryptoPageHeroTitle(cryptoPage, year)}
        heroIntro={getBestAiToolsHeroIntro(`crypto:${cryptoPage.titleLabel}`)}
        moreDetailsLabel={b.moreDetails || 'More details'}
        userReviewsLabel={b.userReviews || 'Users reviews'}
        curatingMsg={b.curatingMsg || 'We are currently curating the best tools for this category. Check back soon!'}
        wantMore={b.wantMore || 'Want to see more?'}
        wantMoreDesc={b.wantMoreDesc || 'Browse the full AI NSFW directory with filters, reviews, and ratings.'}
        browseAll={b.browseAll || 'Browse All AI Tools'}
      />
    );
  }

  const page = bestAiToolPageFromSlug(category);
  if (!page) notFound();

  const year = new Date().getFullYear();
  const localeMap: Record<string, string> = { en: 'en-US', de: 'de-DE', es: 'es-ES', pt: 'pt-BR' };
  const month = new Date().toLocaleString(localeMap[locale] || 'en-US', { month: 'long' });
  const ranking = await buildBestAiToolTop10(page);

  return (
    <BestAiToolsCategoryClient
      pageLabel={page.label}
      ranking={ranking}
      month={month}
      year={year}
      updatedLabel={b.updated || 'Updated {month} {year}'}
      theBestTemplate={b.theBest || 'The {count} Best {category} AI Tools'}
      theBestFallback={b.theBestFallback || 'The Best {category} AI Tools'}
      heroIntro={getBestAiToolsHeroIntro(page.label)}
      moreDetailsLabel={b.moreDetails || 'More details'}
      userReviewsLabel={b.userReviews || 'Users reviews'}
      curatingMsg={b.curatingMsg || 'We are currently curating the best tools for this category. Check back soon!'}
      wantMore={b.wantMore || 'Want to see more?'}
      wantMoreDesc={b.wantMoreDesc || 'Browse the full AI NSFW directory with filters, reviews, and ratings.'}
      browseAll={b.browseAll || 'Browse All AI Tools'}
    />
  );
}
