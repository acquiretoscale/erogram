import { isPresetAvatarUrl } from '@/lib/userAvatars';

export const PROFILE_FEED_EXPLORED_KEY = 'erogram_profile_feed_explored';

export function hasChosenProfileAvatar(photoUrl: string | null | undefined): boolean {
  if (!photoUrl) return false;
  if (isPresetAvatarUrl(photoUrl)) return true;
  return photoUrl.includes('avatars/users/');
}

export function hasCustomizedFeedCategories(interests: string[]): boolean {
  return interests.length > 0;
}

export function hasExploredProfileFeed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(PROFILE_FEED_EXPLORED_KEY) === '1';
}

export function markProfileFeedExplored() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROFILE_FEED_EXPLORED_KEY, '1');
}

export function profileHomeSetupComplete(
  photoUrl: string | null | undefined,
  interests: string[],
): boolean {
  return (
    hasChosenProfileAvatar(photoUrl) &&
    hasCustomizedFeedCategories(interests) &&
    hasExploredProfileFeed()
  );
}
