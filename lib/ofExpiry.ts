// Plain helpers (NOT server actions) for OF agency-deal expiry filtering.
// Kept out of 'use server' files so they can be sync + tree-shaken.

export type ExpiredOFAgencyTargets = { usernames: Set<string>; campaignIds: Set<string> };

function isHiddenVictoriaAd(c: { adType?: string; ofUsername?: string; name?: string }): boolean {
  const uname = String(c.ofUsername || '').toLowerCase();
  if (uname === 'victoriakovaks') return true;
  return String(c.name || '').toLowerCase().includes('victoria kovak');
}

/** Remove onlyfans-creator ads on expired agency deals. Other ad types pass through untouched. */
export function dropExpiredOFAgencyAds<T extends { adType?: string; ofUsername?: string; name?: string; _id?: unknown }>(
  items: T[],
  expired: ExpiredOFAgencyTargets,
): T[] {
  const visible = items.filter((c) => !isHiddenVictoriaAd(c));
  if (!expired.usernames.size && !expired.campaignIds.size) return visible;
  return visible.filter((c) => {
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
