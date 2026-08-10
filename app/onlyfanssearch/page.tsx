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
import {
  getNewestOnlyFansCreators,
  getTopCommunityLikedCreators,
} from '@/lib/actions/ofCreatorsBrowse';
import { getTopLikedCreatorPhotos } from '@/lib/actions/profileFeed';

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
  try {
    await connectDB();

    const baseMatch = { avatar: { $ne: '' }, gender: 'female', categories: { $exists: true, $ne: [] }, deleted: { $ne: true }, submissionStatus: { $ne: 'pending' }, ...whaleBrowseLikesFilter };

    const count = await OnlyFansCreator.countDocuments(baseMatch);

    initialCreators = [];
    totalCreators = count;
  } catch (e) {
    console.error('Failed to fetch OF creators:', e);
  }

  const [topBannerCampaigns, ofSearchFeaturedRaw, trendingOnErogram, communityCreators, topBookmarkedRecent, topLikedCreators, topLikedPhotos] = await Promise.all([
    getActiveCampaigns('top-banner', { page: 'onlyfans', device: isMobile ? 'mobile' : 'desktop' }).catch(() => []),
    getPlacementFeedCampaigns('of-search-featured', 8).catch(() => []),
    getTrendingOnErogram().catch(() => []),
    getNewestOnlyFansCreators(40).catch(() => []),
    getTopCommunityLikedCreators(20).catch(() => []),
    getTopCommunityLikedCreators(20).catch(() => []),
    getTopLikedCreatorPhotos(20).catch(() => []),
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

  return (
    <OnlyFansClient
      initialCreators={initialCreators}
      totalCreators={totalCreators}
      initialQuery={q || ''}
      topBannerCampaigns={topBannerCampaigns}
      paidFeatured={paidFeatured}
      trendingOnErogram={trendingOnErogram}
      communityCreators={communityCreators as any}
      topBookmarkedRecent={topBookmarkedRecent as any}
      topLikedCreators={topLikedCreators as any}
      topLikedPhotos={topLikedPhotos}
    />
  );
}
