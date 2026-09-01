import { OF_CATEGORY_SLUGS } from '@/app/ofsearch/constants';
import { bestOfSlugFromPublicPath } from '@/lib/bestOfPageContent/hottestUrls';

/** Segments reserved for categories, top-10 rankings, etc. — not creator profiles. */
export function isReservedOnlyfanssearchSegment(segment: string): boolean {
  const s = (segment || '').trim().toLowerCase();
  if (!s) return true;
  if (OF_CATEGORY_SLUGS.has(s)) return true;
  if (bestOfSlugFromPublicPath(s)) return true;
  if (s.endsWith('2026')) return true;
  if (s.startsWith('top-10-') || s.startsWith('top-25-') || s.startsWith('top-50-')) return true;
  if (/^(top|best)-(25|50)-onlyfans-models$/.test(s)) return true;
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

/** Public creator profile path: /ofsearch/{username} */
export function ofCreatorProfileUrl(usernameOrSlug: string): string {
  const name = normalizeCreatorProfileSegment(usernameOrSlug);
  return `/ofsearch/${name}`;
}

/** OnlyFans.com outbound URL — ignore legacy Erogram /{user}-onlyfans values stored in DB. */
export function onlyFansExternalUrl(usernameOrSlug: string, storedUrl?: string): string {
  const raw = (storedUrl || '').trim();
  if (/^https?:\/\/(www\.)?onlyfans\.com\//i.test(raw)) return raw;
  const name = normalizeCreatorProfileSegment(usernameOrSlug);
  return `https://onlyfans.com/${name}`;
}

/** Naked OnlyFans.com link (no /go hop, no UTM). Public anchors must use OF_GO_REL. */
export function ofOutboundUrl(usernameOrSlug: string, storedUrl?: string): string {
  return onlyFansExternalUrl(usernameOrSlug, storedUrl);
}

/** OnlyFans.com link tagged as traffic from Erogram. */
export function ofOutboundUrlFromErogram(usernameOrSlug: string, storedUrl?: string): string {
  const base = onlyFansExternalUrl(usernameOrSlug, storedUrl);
  try {
    const u = new URL(base);
    u.searchParams.set('utm_source', 'erogram');
    return u.toString();
  } catch {
    return base;
  }
}

/** rel for public outbound anchors — nofollow so Google does not treat them as graph edges. */
export const OF_GO_REL = 'nofollow noopener noreferrer';

/** Static /profile/* routes — not creator usernames. */
const RESERVED_PROFILE_SEGMENTS = new Set(['leaderboard']);

export function isReservedProfileSegment(segment: string): boolean {
  const s = (segment || '').trim().toLowerCase();
  if (!s) return true;
  return RESERVED_PROFILE_SEGMENTS.has(s);
}
