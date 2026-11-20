const EIGHT_DAYS_MS = 8 * 24 * 60 * 60 * 1000;

/** True when this AI NSFW listing was added within the last 8 days. */
export function ainsfwListingAddedRecently(createdAt?: string | null, now = Date.now()): boolean {
  if (!createdAt) return false;
  const added = Date.parse(createdAt);
  if (!Number.isFinite(added)) return false;
  const age = now - added;
  return age >= 0 && age <= EIGHT_DAYS_MS;
}

/** Links that open a listing. Dofollow only for listings added in the last 8 days. */
export function ainsfwListingLinkRel(createdAt?: string | null): string {
  return ainsfwListingAddedRecently(createdAt) ? 'noopener' : 'nofollow noopener noreferrer';
}
