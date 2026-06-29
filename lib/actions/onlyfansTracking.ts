'use server';

import connectDB from '@/lib/db/mongodb';
import { TrendingOFCreator, OnlyFansCreator, Campaign, CampaignClick } from '@/lib/models';

/**
 * UNIFIED CLICK TRACKING — OnlyFans creators are just ONE ad category in the Erogram
 * ad-network. Every OF click is written to the SAME store as every other ad:
 *   Campaign.clicks (lifetime) + CampaignClick (per-click row, for period stats).
 *
 * There is exactly ONE creator type. Each promoted creator has a linked Campaign
 * (TrendingOFCreator.linkedCampaignId). These functions keep their old signatures so
 * no client needs to change — they just resolve the linked campaign and call the
 * shared tracker. The old TrendingClickDaily / TrendingOFCreator.clicks /
 * OnlyFansCreator.clicks stores are FROZEN (never written again).
 */

/** Shared write: one click → Campaign.clicks + CampaignClick. */
async function logCampaignClick(campaignId: any, placement: string) {
  await Promise.all([
    Campaign.findByIdAndUpdate(campaignId, { $inc: { clicks: 1 } }),
    CampaignClick.create({ campaignId, clickedAt: new Date(), placement }),
  ]);
}

/**
 * Build the A/B placement tag. When the caller knows WHICH album image was shown
 * (albumIdx >= 0), we stamp 'of-cat:v{idx}' so the per-image split-test breakdown can
 * attribute the click to that exact image. Otherwise plain 'of-cat' (counts toward the
 * creator's total, NOT credited to any image).
 */
function ofPlacement(albumIdx?: number): string {
  return typeof albumIdx === 'number' && albumIdx >= 0 ? `of-cat:v${albumIdx}` : 'of-cat';
}

/**
 * Click on a creator from /onlyfanssearch profile/grid. Receives the OnlyFansCreator _id
 * OR slug. Resolves the linked OF campaign (by username) and logs to the unified store.
 */
export async function trackCreatorClick(idOrSlug: string) {
  if (!idOrSlug || typeof idOrSlug !== 'string') return;
  try {
    await connectDB();
    // Resolve the creator's username from OnlyFansCreator (by _id or slug).
    const isId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
    const doc = await OnlyFansCreator.findOne(
      isId ? { _id: idOrSlug } : { slug: idOrSlug },
      'username',
    ).lean() as any;
    const username = doc?.username;
    if (!username) return;
    const slot = await TrendingOFCreator.findOne(
      { username: new RegExp(`^${String(username).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      'linkedCampaignId',
    ).lean() as any;
    if (!slot?.linkedCampaignId) return;
    await logCampaignClick(slot.linkedCampaignId, 'of-cat');
  } catch {}
}

/**
 * Click on a promoted creator (the TrendingOFCreator slot id). Resolves its linked
 * campaign and logs to the unified store. Same id callers already pass.
 */
export async function trackTrendingClick(id: string, albumIdx?: number) {
  if (!id) return;
  try {
    await connectDB();
    const slot = await TrendingOFCreator.findById(id, 'linkedCampaignId active').lean() as any;
    if (!slot || !slot.linkedCampaignId) return;
    await logCampaignClick(slot.linkedCampaignId, ofPlacement(albumIdx));
  } catch {}
}

/**
 * Per-username click stats for the Ad Network admin (OF-creator ad rows), read from the
 * ONE unified store (CampaignClick). Keyed by lowercase username.
 */
export async function getTrendingCreatorStats(): Promise<Record<string, {
  total: number; last24h: number; last7d: number; last30d: number;
}>> {
  await connectDB();
  const now = Date.now();
  const d24 = new Date(now - 24 * 3600e3);
  const d7 = new Date(now - 7 * 86400e3);
  const d30 = new Date(now - 30 * 86400e3);

  // Map linked campaignId -> username.
  const slots = await TrendingOFCreator.find(
    { linkedCampaignId: { $ne: null } },
    'username linkedCampaignId',
  ).lean() as any[];
  const campToUser = new Map<string, string>();
  const out: Record<string, { total: number; last24h: number; last7d: number; last30d: number }> = {};
  for (const s of slots) {
    if (!s.username || !s.linkedCampaignId) continue;
    campToUser.set(String(s.linkedCampaignId), String(s.username).toLowerCase());
    out[String(s.username).toLowerCase()] = { total: 0, last24h: 0, last7d: 0, last30d: 0 };
  }
  const campaignIds = slots.map((s) => s.linkedCampaignId).filter(Boolean);
  if (!campaignIds.length) return out;

  const rows = await CampaignClick.aggregate([
    { $match: { campaignId: { $in: campaignIds } } },
    {
      $group: {
        _id: '$campaignId',
        total: { $sum: 1 },
        last24h: { $sum: { $cond: [{ $gte: ['$clickedAt', d24] }, 1, 0] } },
        last7d: { $sum: { $cond: [{ $gte: ['$clickedAt', d7] }, 1, 0] } },
        last30d: { $sum: { $cond: [{ $gte: ['$clickedAt', d30] }, 1, 0] } },
      },
    },
  ]);
  for (const r of rows as any[]) {
    const u = campToUser.get(String(r._id));
    if (!u || !out[u]) continue;
    out[u] = { total: r.total || 0, last24h: r.last24h || 0, last7d: r.last7d || 0, last30d: r.last30d || 0 };
  }
  return out;
}
