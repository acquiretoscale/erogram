'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, CampaignClick, Group, Bot, AINsfwSubmission, TrendingClickDaily } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function isAdmin(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    if (!decoded?.id) return false;
    await connectDB();
    const user = await User.findById(decoded.id).select('isAdmin').lean();
    return Boolean(user && (user as { isAdmin?: boolean }).isAdmin);
  } catch {
    return false;
  }
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

export interface NetworkClicksByType {
  sponsors: number; // CampaignClick (sponsor + OF-creator ads + boosts that became campaigns)
  boosts: number; // entity clickCountByDay on Group/Bot/AINSFW
  ofCreators: number; // TrendingClickDaily
}

export interface NetworkClicksResult {
  total: number;
  byType: NetworkClicksByType;
  /** Per-day series: [{ date: 'YYYY-MM-DD', sponsors, boosts, ofCreators, total }] sorted ascending. */
  series: Array<{ date: string; sponsors: number; boosts: number; ofCreators: number; total: number }>;
  rangeDays: number;
}

/**
 * UNIFIED NETWORK CLICKS — rolls up the three separate stat stores into one total.
 * READ-ONLY. Does not touch/migrate any data. Brain: ad-engine-unify.
 *   1. Sponsor ads  → CampaignClick (clickedAt)
 *   2. Boosts       → clickCountByDay Map on Group / Bot / AINsfwSubmission
 *   3. OF creators  → TrendingClickDaily (date + clicks)
 *
 * @param token admin JWT
 * @param days  lookback window (default 30)
 */
export async function getNetworkClicks(token: string, days = 30): Promise<NetworkClicksResult> {
  if (!(await isAdmin(token))) throw new Error('Unauthorized');
  await connectDB();

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  const startKey = dayKey(start);

  // Build the empty day buckets up front so the chart has every day.
  const buckets = new Map<string, { sponsors: number; boosts: number; ofCreators: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    buckets.set(dayKey(d), { sponsors: 0, boosts: 0, ofCreators: 0 });
  }
  const add = (key: string, kind: 'sponsors' | 'boosts' | 'ofCreators', n: number) => {
    const b = buckets.get(key);
    if (b) b[kind] += n;
  };

  // 1) Sponsor clicks — aggregate CampaignClick by day.
  const sponsorAgg = await CampaignClick.aggregate([
    { $match: { clickedAt: { $gte: start } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$clickedAt' } }, n: { $sum: 1 } } },
  ]);
  for (const row of sponsorAgg as Array<{ _id: string; n: number }>) {
    add(row._id, 'sponsors', row.n);
  }

  // 2) Boost clicks — Group/Bot have a per-day clickCountByDay Map; AINSFW only has a lifetime clickCount.
  const boostQuery = { 'clickCountByDay': { $exists: true } } as Record<string, unknown>;
  const [groups, bots] = await Promise.all([
    Group.find(boostQuery).select('clickCountByDay').lean(),
    Bot.find(boostQuery).select('clickCountByDay').lean(),
  ]);
  const collectBoosts = (docs: any[]) => {
    for (const doc of docs) {
      const map = doc.clickCountByDay;
      if (!map) continue;
      // lean() returns plain object for Map fields
      const entries = map instanceof Map ? Array.from(map.entries()) : Object.entries(map);
      for (const [k, v] of entries as Array<[string, number]>) {
        if (k >= startKey) add(k, 'boosts', Number(v) || 0);
      }
    }
  };
  collectBoosts(groups as any[]);
  collectBoosts(bots as any[]);

  // AINSFW has no per-day breakdown — add its lifetime clickCount to today's bucket so the total stays correct.
  const ainsfwAgg = await AINsfwSubmission.aggregate([
    { $match: { clickCount: { $gt: 0 } } },
    { $group: { _id: null, n: { $sum: '$clickCount' } } },
  ]);
  const ainsfwTotal = (ainsfwAgg[0]?.n as number) || 0;
  if (ainsfwTotal > 0) add(dayKey(now), 'boosts', ainsfwTotal);

  // 3) OF creator clicks — TrendingClickDaily.
  const ofRows = await TrendingClickDaily.find({ date: { $gte: startKey } }).select('date clicks').lean();
  for (const r of ofRows as unknown as Array<{ date: string; clicks: number }>) {
    add(r.date, 'ofCreators', r.clicks || 0);
  }

  const series = Array.from(buckets.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, b]) => ({
      date,
      sponsors: b.sponsors,
      boosts: b.boosts,
      ofCreators: b.ofCreators,
      total: b.sponsors + b.boosts + b.ofCreators,
    }));

  const byType: NetworkClicksByType = {
    sponsors: series.reduce((s, r) => s + r.sponsors, 0),
    boosts: series.reduce((s, r) => s + r.boosts, 0),
    ofCreators: series.reduce((s, r) => s + r.ofCreators, 0),
  };

  return {
    total: byType.sponsors + byType.boosts + byType.ofCreators,
    byType,
    series,
    rangeDays: days,
  };
}
