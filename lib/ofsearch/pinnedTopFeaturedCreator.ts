'use server';

import connectDB from '@/lib/db/mongodb';
import { Campaign, OnlyFansCreator, TrendingOFCreator } from '@/lib/models';
import { getExpiredOFAgencyTargets } from '@/lib/actions/onlyfansTracking';
import { isOFUsernameOnExpiredAgencyDeal } from '@/lib/ofExpiry';
import { HOME_FEATURED_OF_USERNAME } from '@/lib/explore/homeFeaturedOfCreator';
import { buildFullAdRotationAlbum } from '@/lib/ofsearch/adRotationAlbum';
import { ofOutboundUrlFromErogram } from '@/lib/ofsearch/creatorUrls';

/** Featured-creator card shape used on /ofsearch category grids + hub search feed. */
export type TopOfFeaturedCreator = {
  _id: string;
  campaignId?: string;
  trendingId?: string;
  name: string;
  username: string;
  avatar: string;
  album: string[];
  albumIdx: number[];
  url: string;
  bio: string;
  likesCount: number;
  liveHourStart: number;
  liveHourEnd: number;
  isPaidCampaign: boolean;
};

function resolveOutboundUrl(
  username: string,
  trendingUrl?: string,
  campaignDest?: string,
): string {
  const campaign = (campaignDest || '').trim();
  if (campaign && /^https?:\/\//i.test(campaign)) return campaign;
  const trending = (trendingUrl || '').trim();
  if (trending && /^https?:\/\//i.test(trending)) return trending;
  return ofOutboundUrlFromErogram(username);
}

/** Victoria (HOME_FEATURED_OF_USERNAME) — single source for top-slot OF featured ads. */
export async function getPinnedTopFeaturedOfCreator(): Promise<TopOfFeaturedCreator | null> {
  try {
    await connectDB();
    const username = HOME_FEATURED_OF_USERNAME;
    const expiredOF = await getExpiredOFAgencyTargets();
    if (isOFUsernameOnExpiredAgencyDeal(username, expiredOF)) return null;

    const [trending, ofDoc] = await Promise.all([
      TrendingOFCreator.findOne({ username, active: { $ne: false } })
        .select('_id name username url bio liveHourStart liveHourEnd pausedImageUrls linkedCampaignId')
        .lean() as Promise<{
          _id?: { toString(): string };
          name?: string;
          username?: string;
          url?: string;
          bio?: string;
          liveHourStart?: number;
          liveHourEnd?: number;
          pausedImageUrls?: string[];
          linkedCampaignId?: { toString(): string };
        } | null>,
      OnlyFansCreator.findOne({
        username,
        deleted: { $ne: true },
        publicPage: true,
      })
        .select('name username avatar adRotationPhotos likesCount')
        .lean() as Promise<{
          name?: string;
          username?: string;
          avatar?: string;
          adRotationPhotos?: string[];
          likesCount?: number;
        } | null>,
    ]);

    if (!trending && !ofDoc?.avatar) return null;

    let campaignDest = '';
    const linkedId = trending?.linkedCampaignId?.toString();
    if (linkedId) {
      const camp = await Campaign.findById(linkedId).select('destinationUrl').lean() as { destinationUrl?: string } | null;
      campaignDest = (camp?.destinationUrl || '').trim();
    }

    const paused = new Set<string>((trending?.pausedImageUrls as string[]) || []);
    const full = buildFullAdRotationAlbum(ofDoc?.avatar, ofDoc?.adRotationPhotos);
    const album: string[] = [];
    const albumIdx: number[] = [];
    full.forEach((url, i) => {
      if (!paused.has(url)) {
        album.push(url);
        albumIdx.push(i);
      }
    });
    const avatar = album[0] || ofDoc?.avatar || trending?.username || '';
    if (!avatar) return null;

    const campaignId = linkedId;
    const trendingId = trending?._id?.toString() || '';

    return {
      _id: campaignId || trendingId || username,
      campaignId,
      trendingId: trendingId || undefined,
      name: ofDoc?.name || trending?.name || username,
      username,
      avatar,
      album: album.length > 0 ? album : [avatar],
      albumIdx: albumIdx.length > 0 ? albumIdx : [0],
      url: resolveOutboundUrl(username, trending?.url, campaignDest),
      bio: trending?.bio || '',
      likesCount: ofDoc?.likesCount || 0,
      liveHourStart: trending?.liveHourStart ?? -1,
      liveHourEnd: trending?.liveHourEnd ?? -1,
      isPaidCampaign: Boolean(campaignId),
    };
  } catch {
    return null;
  }
}

/** Top OF surfaces: featured rotation is ONLY the pinned creator (overrides placement pool). */
export async function getTopOfPagesFeaturedCreators(): Promise<TopOfFeaturedCreator[]> {
  const pinned = await getPinnedTopFeaturedOfCreator();
  return pinned ? [pinned] : [];
}
