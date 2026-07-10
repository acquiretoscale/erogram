import { Metadata } from 'next';
import { headers } from 'next/headers';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import OnlyFansClient from './OnlyFansClient';
import { getLocale } from '@/lib/i18n/server';
import { mainOfMeta } from './ofMeta';
import { getActiveCampaigns } from '@/lib/actions/campaigns';
import { getBestOfPreviewAvatars } from '@/lib/actions/bestOfCreators';
import { OF_CATEGORIES } from '@/app/onlyfanssearch/constants';
import { getTopBestOfByType, BEST_OF_PAGE_MAP } from '@/app/best-onlyfans-accounts/bestOfPages';
import { detectDeviceFromUserAgent } from '@/lib/utils/device';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return mainOfMeta(locale);
}

export const revalidate = 300;

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function OnlyFansPage({ searchParams }: PageProps) {
  const ua = (await headers()).get('user-agent');
  const { isMobile } = detectDeviceFromUserAgent(ua);
  const { q } = await searchParams;
  let initialCreators: any[] = [];
  let totalCreators = 0;
  let recentlyAdded: any[] = [];
  let top10Lists: { category: string; label: string; creators: any[] }[] = [];

  try {
    await connectDB();

    const baseMatch = { avatar: { $ne: '' }, gender: 'female', categories: { $exists: true, $ne: [] }, deleted: { $ne: true }, submissionStatus: { $ne: 'pending' } };

    const [count, recentRaw] = await Promise.all([
      OnlyFansCreator.countDocuments(baseMatch),
      // Bucket of the 60 most recently added; client shows a shuffled 8.
      OnlyFansCreator.find(baseMatch)
        .sort({ createdAt: -1 })
        .limit(60)
        .select('name username slug avatar header categories subscriberCount likesCount photosCount videosCount price isFree url clicks')
        .lean(),
    ]);

    initialCreators = [];
    totalCreators = count;
    recentlyAdded = (recentRaw as any[]).map((c) => ({ ...c, _id: c._id.toString() }));
  } catch (e) {
    console.error('Failed to fetch OF creators:', e);
  }

  const topBannerCampaigns = await getActiveCampaigns('top-banner', { page: 'onlyfanssearch', device: isMobile ? 'mobile' : 'desktop' }).catch(() => []);

  const top10Pages = [
    ...getTopBestOfByType('niche'),
    ...getTopBestOfByType('country'),
    ...getTopBestOfByType('state'),
  ];
  const bestAccountPages = OF_CATEGORIES.filter((c) => BEST_OF_PAGE_MAP.has(c.slug)).map((c) => ({
    slug: c.slug,
    label: c.name,
    type: 'niche' as const,
    match: 'category' as const,
    categorySlug: c.slug,
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
      top10Lists={top10Lists}
      recentlyAdded={recentlyAdded}
      topBannerCampaigns={topBannerCampaigns}
      trendingOnErogram={[]}
      top10PreviewAvatars={top10PreviewAvatars}
      bestAccountsPreviewAvatars={bestAccountsPreviewAvatars}
    />
  );
}
