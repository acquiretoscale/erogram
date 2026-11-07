/** Homepage spotlight — change username here to swap the featured OF creator. */
export const HOME_FEATURED_OF_USERNAME = 'victoriakovaks';

/** Shown as hashtags on the home OF card (under @handle). */
export const HOME_FEATURED_OF_HASHTAGS = ['Big Ass', 'Booty', 'Girlfriend', 'Submissive'] as const;

/** Home promo — “New to OF” chip on the featured card. */
export const HOME_FEATURED_OF_SHOW_NEW_BADGE = true;

export type HomeFeaturedOfCreator = {
  name: string;
  username: string;
  /** Profile avatar (fallback + SSR placeholder before client rotation). */
  avatar: string;
  /** Ad rotation pool: avatar + adRotationPhotos minus paused — not profile feed extras. */
  album?: string[];
  /** Stable full-album index per `album` entry (for split-test ":v{n}" tracking). */
  albumIdx?: number[];
  trendingId?: string;
  campaignId?: string;
  /** Outbound click target (campaign / trending tracking URL or OnlyFans). */
  onlyfansUrl: string;
  liveHourStart?: number;
  liveHourEnd?: number;
  categories?: string[];
  hashtags?: string[];
  subscriberCount?: number;
  likesCount?: number;
  showNewToOfBadge?: boolean;
  /** Erogram profile banner (`header` on /ofsearch/{username}). */
  header?: string;
};
