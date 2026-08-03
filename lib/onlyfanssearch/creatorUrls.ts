import { OF_CATEGORY_SLUGS } from '@/app/onlyfanssearch/constants';
import { bestOfSlugFromPublicPath } from '@/lib/bestOfPageContent/hottestUrls';

/** Segments reserved for categories, top-10 rankings, etc. — not creator profiles. */
export function isReservedOnlyfanssearchSegment(segment: string): boolean {
  const s = (segment || '').trim().toLowerCase();
  if (!s) return true;
  if (OF_CATEGORY_SLUGS.has(s)) return true;
  if (bestOfSlugFromPublicPath(s)) return true;
  if (s.endsWith('2026')) return true;
  if (s.startsWith('top-10-')) return true;
  return false;
}

/** Strip @ and legacy -onlyfans suffix for profile URL segments. */
export function normalizeCreatorProfileSegment(segment: string): string {
  let s = (segment || '').replace(/^@/, '').trim();
  if (s.toLowerCase().endsWith('-onlyfans')) {
    s = s.slice(0, -'-onlyfans'.length);
  }
  return s;
}

/** Public creator profile path: /onlyfanssearch/{username} */
export function ofCreatorProfileUrl(usernameOrSlug: string): string {
  const name = normalizeCreatorProfileSegment(usernameOrSlug);
  return `/onlyfanssearch/${name}`;
}

/** Static /profile/* routes — not creator usernames. */
const RESERVED_PROFILE_SEGMENTS = new Set(['leaderboard']);

export function isReservedProfileSegment(segment: string): boolean {
  const s = (segment || '').trim().toLowerCase();
  if (!s) return true;
  return RESERVED_PROFILE_SEGMENTS.has(s);
}
