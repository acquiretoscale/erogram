import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator, TrendingOFCreator, Campaign } from '@/lib/models';
import { buildFullAdRotationAlbum } from '@/lib/ofsearch/adRotationAlbum';
import { ofOutboundUrlFromErogram } from '@/lib/ofsearch/creatorUrls';
import {
  HOME_FEATURED_OF_USERNAME,
  HOME_FEATURED_OF_HASHTAGS,
  HOME_FEATURED_OF_SHOW_NEW_BADGE,
  type HomeFeaturedOfCreator,
} from '@/lib/explore/homeFeaturedOfCreator';

/** Shared loader for homepage + group join spotlight (same creator, same rotation pool). Server only. */
export async function getHomeFeaturedOfCreator(): Promise<HomeFeaturedOfCreator | null> {
  try {
    await connectDB();
    const [c, trending] = await Promise.all([
      OnlyFansCreator.findOne({
        username: HOME_FEATURED_OF_USERNAME,
        deleted: { $ne: true },
        publicPage: true,
        avatar: { $ne: '' },
      })
        .select('name username avatar header categories subscriberCount likesCount adRotationPhotos')
        .lean() as Promise<{
          name?: string;
          username?: string;
          avatar?: string;
          header?: string;
          categories?: string[];
          subscriberCount?: number;
          likesCount?: number;
          adRotationPhotos?: string[];
        } | null>,
      TrendingOFCreator.findOne({ username: HOME_FEATURED_OF_USERNAME })
        .select('pausedImageUrls linkedCampaignId url liveHourStart liveHourEnd')
        .lean() as Promise<{
          _id?: { toString(): string };
          pausedImageUrls?: string[];
          linkedCampaignId?: { toString(): string };
          url?: string;
          liveHourStart?: number;
          liveHourEnd?: number;
        } | null>,
    ]);
    if (!c?.username || !c.avatar) return null;

    let campaignDest = '';
    if (trending?.linkedCampaignId) {
      const camp = await Campaign.findById(trending.linkedCampaignId).select('destinationUrl').lean() as { destinationUrl?: string } | null;
      campaignDest = (camp?.destinationUrl || '').trim();
    }
    const trendingUrl = (trending?.url || '').trim();
    const onlyfansUrl =
      (campaignDest && /^https?:\/\//i.test(campaignDest) && campaignDest) ||
      (trendingUrl && /^https?:\/\//i.test(trendingUrl) && trendingUrl) ||
      ofOutboundUrlFromErogram(c.username);

    const paused = new Set<string>((trending?.pausedImageUrls as string[]) || []);
    const full = buildFullAdRotationAlbum(c.avatar, c.adRotationPhotos);
    const album: string[] = [];
    const albumIdx: number[] = [];
    full.forEach((url, i) => {
      if (!paused.has(url)) {
        album.push(url);
        albumIdx.push(i);
      }
    });

    return {
      name: c.name || c.username,
      username: c.username,
      avatar: c.avatar,
      album: album.length > 0 ? album : [c.avatar],
      albumIdx: albumIdx.length > 0 ? albumIdx : [0],
      trendingId: trending?._id?.toString(),
      campaignId: trending?.linkedCampaignId?.toString(),
      onlyfansUrl,
      liveHourStart: trending?.liveHourStart ?? -1,
      liveHourEnd: trending?.liveHourEnd ?? -1,
      categories: Array.isArray(c.categories) ? c.categories.slice(0, 4) : [],
      hashtags: [...HOME_FEATURED_OF_HASHTAGS],
      subscriberCount: c.subscriberCount || 0,
      likesCount: c.likesCount || 0,
      showNewToOfBadge: HOME_FEATURED_OF_SHOW_NEW_BADGE,
      header: (c.header || '').trim(),
    };
  } catch {
    return null;
  }
}
