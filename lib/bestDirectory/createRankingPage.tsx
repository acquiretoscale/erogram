import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n';
import { buildSocialMeta, buildMetadataAlternates, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import RankingPageView from './RankingPageView';
import { directoryMetaDescription, directoryPageFromSlug } from './config';
import { loadRankingItems } from './loadRankings';

const MAX_TITLE_LENGTH = 68;
const BRAND_SUFFIX_LENGTH = 10;

function titleSet(label: string, year: number, kind: 'ainsfw' | 'bots' | 'explore') {
  if (kind === 'ainsfw') {
    return {
      full: [
        `Top 30 Best ${label} AI Tools Ranked in ${year}`,
        `Best ${label} AI NSFW Tools to Try in ${year}`,
        `${label} AI Tools Top 30 List for ${year}`,
      ] as [string, string, string],
      compact: [
        `Top 30 ${label} AI Tools in ${year}`,
        `Best ${label} AI Tools in ${year}`,
        `${label} AI Tools Top 30 in ${year}`,
      ] as [string, string, string],
    };
  }
  if (kind === 'bots') {
    return {
      full: [
        `Join Active ${label} Telegram Bots in ${year}`,
        `Top Rated ${label} Telegram Bots to Join in ${year}`,
        `${label} NSFW Telegram Bots List in ${year}`,
      ] as [string, string, string],
      compact: [
        `Join Active ${label} Telegram Bots in ${year}`,
        `Top ${label} Telegram Bots to Join in ${year}`,
        `${label} NSFW Telegram Bots in ${year}`,
      ] as [string, string, string],
    };
  }
  return {
    full: [
      `Join Active ${label} in ${year}`,
      `Top Rated ${label} to Visit in ${year}`,
      `${label} NSFW List in ${year}`,
    ] as [string, string, string],
    compact: [
      `Join Active ${label} in ${year}`,
      `Top ${label} to Visit in ${year}`,
      `${label} NSFW List in ${year}`,
    ] as [string, string, string],
  };
}

export function createRankingPage(slug: string) {
  async function generateMetadata(): Promise<Metadata> {
    const page = directoryPageFromSlug(slug);
    if (!page) return {};

    const locale = await getLocale();
    const pathname = await getPathname();
    const year = new Date().getFullYear();
    const items = await loadRankingItems(slug);
    const alternates = buildMetadataAlternates(pathname, locale);
    const canonical = alternates?.canonical?.toString() || `${CANONICAL_BASE}/${slug}`;
    const variant = [...slug].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 3;
    const set = titleSet(page.label, year, page.kind);
    const fullTitle = set.full[variant];
    const title = fullTitle.length + BRAND_SUFFIX_LENGTH > MAX_TITLE_LENGTH ? set.compact[variant] : fullTitle;
    const description = directoryMetaDescription(page, year);
    const meta = {
      title,
      description,
      alternates,
      ...buildSocialMeta({
        title,
        description,
        url: canonical,
        type: 'website' as const,
      }),
    };

    if (items.length === 0) {
      return {
        ...meta,
        robots: { index: false, follow: true },
      };
    }

    return meta;
  }

  async function Page() {
    const page = directoryPageFromSlug(slug);
    if (!page) notFound();

    const locale = await getLocale();
    const dict = await getDictionary(locale);
    const year = new Date().getFullYear();
    const localeMap: Record<string, string> = { en: 'en-US', de: 'de-DE', es: 'es-ES' };
    const month = new Date().toLocaleString(localeMap[locale] || 'en-US', { month: 'long' });
    const items = await loadRankingItems(slug);

    const ai = dict.bestAiTools || {};
    const groups = dict.bestGroups || {};
    const lookingFor = (ai.lookingFor || groups.lookingFor || '')
      .replace('{category}', page.label)
      .replace('{year}', String(year));
    const groupsLooking = (groups.lookingFor || '')
      .replace('{category}', page.label)
      .replace('{year}', String(year));

    const heroIntro =
      page.kind === 'explore' && page.homeDescription
        ? page.homeDescription
        : page.kind === 'ainsfw'
          ? lookingFor
          : groupsLooking;

    const theBest =
      page.kind === 'ainsfw'
        ? (ai.theBest || groups.theBest)
        : page.kind === 'bots'
          ? (groups.theBest || '').replace('Telegram Groups', 'Telegram Bots')
          : (groups.theBest || '').replace('Telegram Groups', '');
    const theBestFallback =
      page.kind === 'ainsfw'
        ? (ai.theBestFallback || groups.theBestFallback)
        : page.kind === 'bots'
          ? (groups.theBestFallback || '').replace('Telegram Groups', 'Telegram Bots')
          : (groups.theBestFallback || '').replace('Telegram Groups', '');

    return (
      <RankingPageView
        page={page}
        items={items}
        month={month}
        year={year}
        updatedLabel={page.kind === 'ainsfw' ? (ai.updated || groups.updated) : groups.updated}
        theBestTemplate={theBest}
        theBestFallback={theBestFallback}
        heroIntro={heroIntro}
        ctaLabel={page.kind === 'ainsfw' ? (ai.moreDetails || groups.join) : groups.join}
        viewsLabel={dict.common.views}
        curatingMsg={page.kind === 'ainsfw' ? (ai.curatingMsg || groups.curatingMsg) : groups.curatingMsg}
        wantMore={page.kind === 'ainsfw' ? (ai.wantMore || groups.wantMore) : groups.wantMore}
        wantMoreDesc={
          page.kind === 'ainsfw'
            ? (ai.wantMoreDesc || groups.wantMoreDesc)
            : page.kind === 'bots'
              ? groups.wantMoreDesc
              : groups.wantMore
        }
        browseAll={
          page.kind === 'ainsfw'
            ? (ai.browseAll || groups.browseAll)
            : page.kind === 'bots'
              ? groups.browseAll
              : (dict.bestOnlyfans?.browseAll || groups.browseAll)
        }
      />
    );
  }

  return { generateMetadata, Page };
}
