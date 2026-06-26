'use server';

import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator, TrendingOFCreator, TrendingClickDaily } from '@/lib/models';

const CLICK_CAP = 10_000;

function todayStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export async function trackCreatorClick(slug: string) {
  if (!slug || typeof slug !== 'string') return;
  try {
    await connectDB();
    await OnlyFansCreator.findOneAndUpdate(
      { slug, clicks: { $lt: CLICK_CAP } },
      { $inc: { clicks: 1 } },
    );
  } catch {}
}

/**
 * Per-username trending-creator click stats (lifetime / 30d / 7d / 24h).
 * Used by the Ad Network Feed Ads view to enrich OF-creator campaign rows with
 * the real clicks logged on the /OF trending grid (TrendingClickDaily), since
 * those live in a different store than CampaignClick. READ-ONLY, additive.
 * Returns a map keyed by lowercase username.
 */
export async function getTrendingCreatorStats(): Promise<Record<string, {
  total: number; last24h: number; last7d: number; last30d: number;
}>> {
  await connectDB();
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const key = (d: Date) => d.toISOString().slice(0, 10);
  const k24 = key(new Date(now.getTime() - dayMs));
  const k7 = key(new Date(now.getTime() - 7 * dayMs));
  const k30 = key(new Date(now.getTime() - 30 * dayMs));

  const creators = await TrendingOFCreator.find({}, 'username clicks').lean() as any[];
  const idToUser = new Map<string, string>();
  const out: Record<string, { total: number; last24h: number; last7d: number; last30d: number }> = {};
  for (const c of creators) {
    if (!c.username) continue;
    const u = String(c.username).toLowerCase();
    idToUser.set(String(c._id), u);
    out[u] = { total: c.clicks || 0, last24h: 0, last7d: 0, last30d: 0 };
  }

  const rows = await TrendingClickDaily.find({ date: { $gte: k30 } }, 'creatorId date clicks').lean() as any[];
  for (const r of rows) {
    const u = idToUser.get(String(r.creatorId));
    if (!u || !out[u]) continue;
    const n = r.clicks || 0;
    out[u].last30d += n;
    if (r.date >= k7) out[u].last7d += n;
    if (r.date >= k24) out[u].last24h += n;
  }
  return out;
}

export async function trackTrendingClick(id: string) {
  if (!id) return;
  try {
    await connectDB();
    const creator = await TrendingOFCreator.findById(id, 'clicks clickBudget dailyClickCap active').lean() as any;
    if (!creator || !creator.active) return;

    // Budget exhausted → auto-pause
    if (creator.clickBudget > 0 && creator.clicks >= creator.clickBudget) {
      await TrendingOFCreator.findByIdAndUpdate(id, { $set: { active: false } });
      return;
    }

    // Daily cap check
    const date = todayStr();
    if (creator.dailyClickCap > 0) {
      const daily = await TrendingClickDaily.findOne({ creatorId: id, date }).lean() as any;
      if (daily && daily.clicks >= creator.dailyClickCap) return;
    }

    // Increment lifetime total
    const updated = await TrendingOFCreator.findByIdAndUpdate(id, { $inc: { clicks: 1 } }, { new: true }).lean() as any;

    // Log daily click
    await TrendingClickDaily.findOneAndUpdate(
      { creatorId: id, date },
      { $inc: { clicks: 1 } },
      { upsert: true },
    );

    // Auto-pause if budget just hit
    if (updated && updated.clickBudget > 0 && updated.clicks >= updated.clickBudget) {
      await TrendingOFCreator.findByIdAndUpdate(id, { $set: { active: false } });
    }
  } catch {}
}
