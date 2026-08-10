import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AI_NSFW_TOOLS } from './data';
import AINsfwClient from './AINsfwClient';
import { AINSFW_PAGE_SIZE } from './constants';
import { pickRecentTools } from './recentCategoryTools';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n';
import { getAllToolStats, getFeaturedTools, getBoostFeaturedSlugs, getApprovedSubmissions } from '@/lib/actions/ainsfw';
import { getActiveCampaigns, getPlacementFeedCampaigns, getActiveFeedCampaigns } from '@/lib/actions/campaigns';
import { getAuthorBySlug } from '@/lib/actions/authors';
import { buildSocialMeta, buildMetadataAlternates, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { getVerifiedSlugs } from '@/app/ainsfw/fullReviews';
import { getFeaturedHubSlugs } from '@/lib/ainsfw/featuredHub';

const BASE_URL = CANONICAL_BASE;

// Pre-rendered server HTML like /best-telegram-groups, refreshed in the background
// every 5 minutes (ISR). Google sees stable static HTML; new tools/ads/stats appear
// within minutes without a deploy. (Was force-dynamic, which buried the hub.)
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const pathname = await getPathname();
  const dict = await getDictionary(locale);

  const alternates = buildMetadataAlternates(pathname, locale);
  const url = alternates?.canonical?.toString() || `${BASE_URL}/ainsfw`;

  return {
    title: dict.meta.ainsfwTitle,
    description: dict.meta.ainsfwDesc,
    keywords:
      'ai girlfriend, undress ai, ai chat nsfw, ai companion, ai nsfw tools, best ai girlfriend 2026, ai undress, ai chatbot nsfw, erogram',
    other: { rating: 'adult' },
    alternates,
    ...buildSocialMeta({
      title: dict.meta.ainsfwTitle,
      description: dict.meta.ainsfwDesc,
      url,
      type: 'website',
      imageAlt: 'Erogram — AI NSFW Tools',
    }),
  };
}

export async function AINsfwPageView({ page = 1 }: { page?: number }) {
  const currentPage = Math.max(1, page);
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const a = dict.ainsfw ?? {};
  const staticSlugs = new Set(AI_NSFW_TOOLS.map(t => t.slug));
  const [featuredInfos, boostFeaturedSlugs, topBannerCampaigns, paidSubmissions, topAdCampaigns, feedCampaigns, guideAuthor] = await Promise.all([
    getFeaturedTools(),
    getBoostFeaturedSlugs(),
    getActiveCampaigns('top-banner', { page: 'ainsfw' }).catch(() => []),
    getApprovedSubmissions(staticSlugs),
    getPlacementFeedCampaigns('ainsfw-featured', 4).catch(() => []),
    getActiveFeedCampaigns('ainsfw').catch(() => []),
    getAuthorBySlug('eros'),
  ]);
  const allTools = [...AI_NSFW_TOOLS, ...paidSubmissions];
  const paginationTotalPages = Math.max(1, Math.ceil(allTools.length / AINSFW_PAGE_SIZE));
  if (currentPage > paginationTotalPages) notFound();
  const allStats = await getAllToolStats(allTools.map(t => t.slug));
  const { mergeToolContent } = await import('@/lib/ainsfw/toolContent');
  const displayTools = allTools.map((t) => mergeToolContent(t, allStats[t.slug]));
  const toolsBySlug = new Map(allTools.map((t) => [t.slug, t]));
  const recentTools = currentPage === 1
    ? pickRecentTools(toolsBySlug, paidSubmissions as Array<(typeof paidSubmissions)[number] & { createdAt?: string }>)
        .map((t) => mergeToolContent(t, allStats[t.slug]))
    : [];
  const featuredSlugs = featuredInfos.map(f => f.slug);
  const featuredHubSlugs = getFeaturedHubSlugs();
  const verifiedSlugs = getVerifiedSlugs(paidSubmissions.map((t) => t.slug));
  const featuredCampaignMap: Record<string, string> = {};
  for (const f of featuredInfos) {
    if (f.campaignId) featuredCampaignMap[f.slug] = f.campaignId;
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: a.heroTitle || 'Best AI NSFW Tools 2026',
    description: a.guideSubtitle || 'Curated list of the best AI NSFW tools.',
    url: `${BASE_URL}/ainsfw`,
    numberOfItems: allTools.length,
    itemListElement: allTools.map((tool, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: tool.name,
      url: `${BASE_URL}/ainsfw/${tool.slug}`,
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'AI NSFW Tools', item: `${BASE_URL}/ainsfw` },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: Array.from({ length: 10 }, (_, i) => {
      const n = i + 1;
      const q = a[`faqQ${n}` as keyof typeof a] as string | undefined;
      const ans = a[`faqA${n}` as keyof typeof a] as string | undefined;
      return q
        ? {
            '@type': 'Question',
            name: q,
            acceptedAnswer: { '@type': 'Answer', text: ans || '' },
          }
        : null;
    }).filter(Boolean),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <nav aria-label="AI NSFW pagination" className="sr-only">
        <Link href="/ainsfw">AI NSFW page 1</Link>
        {Array.from({ length: paginationTotalPages - 1 }, (_, i) => i + 2).map((p) => (
          <Link key={p} href={`/ainsfw/page/${p}`}>{`AI NSFW page ${p}`}</Link>
        ))}
      </nav>
      <AINsfwClient tools={displayTools} allStats={allStats} featuredSlugs={featuredSlugs} boostFeaturedSlugs={boostFeaturedSlugs} featuredCampaignMap={featuredCampaignMap} topBannerCampaigns={topBannerCampaigns} topAdCampaigns={topAdCampaigns} feedCampaigns={feedCampaigns} paginationCurrentPage={currentPage} paginationTotalPages={paginationTotalPages} pageSize={AINSFW_PAGE_SIZE} guideAuthor={guideAuthor} recentTools={recentTools} verifiedSlugs={verifiedSlugs} featuredHubSlugs={featuredHubSlugs} />
    </>
  );
}

export default async function AINsfwPage() {
  return AINsfwPageView({ page: 1 });
}
