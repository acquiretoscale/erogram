// Pure helpers for OF agency-deal expiry. NOT a 'use server' file — these are sync
// utilities imported by server actions (which can only export async functions).

export type ExpiredOFAgencyTargets = { usernames: Set<string>; campaignIds: Set<string> };

/** Remove onlyfans-creator ads on expired agency deals. Other ad types pass through untouched. */
export function dropExpiredOFAgencyAds<T extends { adType?: string; ofUsername?: string; _id?: unknown }>(
  items: T[],
  expired: ExpiredOFAgencyTargets,
): T[] {
  if (!expired.usernames.size && !expired.campaignIds.size) return items;
  return items.filter((c) => {
    if (c.adType !== 'onlyfans-creator') return true;
    const uname = String(c.ofUsername || '').toLowerCase();
    const id = String(c._id || '');
    if (uname && expired.usernames.has(uname)) return false;
    if (id && expired.campaignIds.has(id)) return false;
    return true;
  });
}

export function isOFUsernameOnExpiredAgencyDeal(username: string, expired: ExpiredOFAgencyTargets): boolean {
  return expired.usernames.has(String(username || '').toLowerCase());
}
