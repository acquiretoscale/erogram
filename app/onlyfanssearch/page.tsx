import { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import OnlyFansClient from '@/app/onlyfanssearch/OnlyFansClient';
import { getLocale } from '@/lib/i18n/server';
import { mainOfMeta } from '@/app/onlyfanssearch/ofMeta';
import { getActiveCampaigns, getPlacementFeedCampaigns } from '@/lib/actions/campaigns';
import { whaleBrowseLikesFilter } from '@/lib/tags/creatorMatch';
import { detectDeviceFromUserAgent } from '@/lib/utils/device';
import { getTrendingOnErogram } from '@/lib/actions/publicData';
import { getVisitorCountryCode } from '@/lib/actions/nearMeCreators';
import { getBestOfPreviewAvatars } from '@/lib/actions/bestOfCreators';
import { OF_CATEGORY_MAP, OF_SEARCH_HUB_CATEGORY_SLUGS } from '@/app/onlyfanssearch/constants';
import { getTopBestOfByType, BEST_OF_PAGE_MAP } from '@/app/best-onlyfans-accounts/bestOfPages';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return mainOfMeta(locale);
}

export const revalidate = 300;

interface PageProps {
  searchParams: Promise<{ q?: string; cat?: string }>;
}

export default async function OnlyFansPage({ searchParams }: PageProps) {
  const ua = (await headers()).get('user-agent');
  const { isMobile } = detectDeviceFromUserAgent(ua);
  const { q, cat } = await searchParams;
  if (cat?.trim()) {
    redirect(`/onlyfanssearch/${encodeURIComponent(cat.trim())}`);
  }
  let initialCreators: any[] = [];
  let totalCreators = 0;
  let recentlyAdded: any[] = [];

  try {
    await connectDB();

    const baseMatch = { avatar: { $ne: '' }, gender: 'female', categories: { $exists: true, $ne: [] }, deleted: { $ne: true }, submissionStatus: { $ne: 'pending' }, ...whaleBrowseLikesFilter };

    const [count, recentRaw] = await Promise.all([
      OnlyFansCreator.countDocuments(baseMatch),
      OnlyFansCreator.find(baseMatch)
        .sort({ createdAt: -1 })
        .limit(20)
        .select('name username slug avatar header categories subscriberCount likesCount photosCount videosCount price isFree url clicks')
        .lean(),
    ]);

    initialCreators = [];
    totalCreators = count;
    recentlyAdded = (recentRaw as any[]).map((c) => ({ ...c, _id: c._id.toString() }));
  } catch (e) {
    console.error('Failed to fetch OF creators:', e);
  }

  const [topBannerCampaigns, ofSearchFeaturedRaw, trendingOnErogram, visitorCountryCode] = await Promise.all([
    getActiveCampaigns('top-banner', { page: 'onlyfans', device: isMobile ? 'mobile' : 'desktop' }).catch(() => []),
    getPlacementFeedCampaigns('of-search-featured', 8).catch(() => []),
    getTrendingOnErogram().catch(() => []),
    getVisitorCountryCode().catch(() => ''),
  ]);
  const paidFeatured = (ofSearchFeaturedRaw as any[])
    .filter((c) => c.adType === 'onlyfans-creator' && (c.creative || c.ofUsername))
    .map((c) => ({
      _id: c._id,
      campaignId: c._id,
      name: c.name || c.ofUsername || '',
      username: c.ofUsername || '',
      avatar: (c.ofAlbum && c.ofAlbum[0]) || c.creative || '',
      album: c.ofAlbum || [],
      albumIdx: c.ofAlbumIdx || [],
      url: c.destinationUrl || '',
      bio: c.description || '',
      likesCount: c.ofLikesCount || 0,
      liveHourStart: c.ofLiveHourStart ?? -1,
      liveHourEnd: c.ofLiveHourEnd ?? -1,
      isPaidCampaign: true,
    }));

  const top10Pages = [
    ...getTopBestOfByType('niche'),
    ...getTopBestOfByType('country'),
    ...getTopBestOfByType('state'),
  ];
  const bestAccountPages = OF_SEARCH_HUB_CATEGORY_SLUGS.filter((slug) => BEST_OF_PAGE_MAP.has(slug)).map((slug) => ({
    slug,
    label: OF_CATEGORY_MAP.get(slug)?.name || slug,
    type: 'niche' as const,
    match: 'category' as const,
    categorySlug: slug,
    count: 0,
  }));
  const [top10PreviewAvatars, bestAccountsPreviewAvatars] = await Promise.all([
    getBestOfPreviewAvatars(top10Pages, 4).catch(() => ({} as Record<string, string[]>)),
    getBestOfPreviewAvatars(bestAccountPages, 4).catch(() => ({} as Record<string, string[]>)),
  ]);

  return (
    <OnlyFansClient
      initialCreators={initialCreators}
      totalCreators={totalCreators}
      initialQuery={q || ''}
      recentlyAdded={recentlyAdded}
      topBannerCampaigns={topBannerCampaigns}
      paidFeatured={paidFeatured}
      trendingOnErogram={trendingOnErogram}
      visitorCountryCode={visitorCountryCode}
      top10PreviewAvatars={top10PreviewAvatars}
      bestAccountsPreviewAvatars={bestAccountsPreviewAvatars}
    />
  );
}
