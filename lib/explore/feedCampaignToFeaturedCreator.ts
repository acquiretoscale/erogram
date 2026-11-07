import type { FeedCampaign } from '@/app/groups/types';
import {
  HOME_FEATURED_OF_USERNAME,
  HOME_FEATURED_OF_HASHTAGS,
  HOME_FEATURED_OF_SHOW_NEW_BADGE,
  type HomeFeaturedOfCreator,
} from '@/lib/explore/homeFeaturedOfCreator';

/** Map feed / top-slot OF-creator campaigns → homepage-standard featured card props. */
export function feedCampaignToFeaturedCreator(campaign: FeedCampaign): HomeFeaturedOfCreator {
  const username = (campaign.ofUsername || campaign.name || '').replace(/^@/, '').trim();
  const album =
    campaign.ofAlbum && campaign.ofAlbum.length > 0
      ? campaign.ofAlbum
      : campaign.creative
        ? [campaign.creative]
        : [];
  const isHomePin = username.toLowerCase() === HOME_FEATURED_OF_USERNAME.toLowerCase();
  const isRealCampaign = /^[0-9a-fA-F]{24}$/.test(String(campaign._id || ''));

  return {
    name: campaign.name || username,
    username: username || 'creator',
    avatar: album[0] || campaign.creative || '',
    album,
    albumIdx: campaign.ofAlbumIdx,
    trendingId: campaign.ofTrendingId,
    campaignId: isRealCampaign ? campaign._id : undefined,
    onlyfansUrl: campaign.destinationUrl,
    liveHourStart: campaign.ofLiveHourStart ?? -1,
    liveHourEnd: campaign.ofLiveHourEnd ?? -1,
    hashtags: isHomePin ? [...HOME_FEATURED_OF_HASHTAGS] : undefined,
    subscriberCount: campaign.ofSubscriberCount ?? 0,
    likesCount: campaign.ofLikesCount ?? 0,
    showNewToOfBadge: isHomePin ? HOME_FEATURED_OF_SHOW_NEW_BADGE : false,
  };
}
