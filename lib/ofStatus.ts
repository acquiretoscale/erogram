/**
 * Unified status for an OnlyFans-creator promotion (brain: ad-engine-unify).
 *
 * ONE definition of "is this live?" shared by the Ad Network (Campaign) and OFadmin
 * (TrendingOFCreator). This is what kills the old "ended here / running there" mismatch.
 * Pure module (no 'use server') so it can be imported anywhere.
 */
export type OFStatus = 'running' | 'paused' | 'ended' | 'scheduled';

/** Far-future sentinel used to represent "no end date" for OFadmin-launched promotions. */
export const OF_NO_END_DATE = new Date('2099-12-31T00:00:00.000Z');

/** Status of an Ad Network campaign, honoring start/end dates + status + visibility. */
export function campaignOFStatus(c: {
  status?: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  isVisible?: boolean;
}): OFStatus {
  const now = Date.now();
  const start = c.startDate ? new Date(c.startDate).getTime() : null;
  const end = c.endDate ? new Date(c.endDate).getTime() : null;
  if (c.status === 'ended') return 'ended';
  if (c.status === 'paused') return 'paused';
  if (end != null && end < now) return 'ended';
  if (start != null && start > now) return 'scheduled';
  if (c.status === 'active' && c.isVisible !== false) return 'running';
  return 'paused';
}

/** Status of an OFadmin featured slot, honoring the active flag + click budget. */
export function trendingOFStatus(t: {
  active?: boolean;
  clicks?: number;
  clickBudget?: number;
}): OFStatus {
  if (!t.active) return 'paused';
  if (t.clickBudget && t.clickBudget > 0 && (t.clicks ?? 0) >= t.clickBudget) return 'ended';
  return 'running';
}
