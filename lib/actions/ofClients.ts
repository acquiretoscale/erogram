'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, OFClient, TrendingOFCreator, CampaignClick, CampaignImpressionDaily } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticateAdmin(token: string) {
  if (!token) return null;
  try {
    const d = jwt.verify(token, JWT_SECRET) as any;
    await connectDB();
    const u = await User.findById(d.id);
    if (u && u.isAdmin) return u;
  } catch {
    return null;
  }
  return null;
}

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** List all agency clients (id + name) for the dashboard switcher. */
export async function listOFClients(token: string) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');
  await connectDB();
  const clients = await OFClient.find({}, 'name goalClicks startDate endDate active').sort({ createdAt: -1 }).lean();
  return JSON.parse(JSON.stringify(clients.map((c: any) => ({ ...c, _id: c._id.toString() }))));
}

/**
 * Full tracking dashboard for ONE agency client:
 *  - combined total clicks since campaign start through TODAY (keeps counting after endDate
 *    while creators stay live — what clients need for "goal achieved to date" reports)
 *  - per-creator click totals (same window: launch → today)
 *  - per-hour (last 24h) and per-day (launch → today) click series
 * All from CampaignClick on linked campaigns. No new infra.
 */
export async function getOFClientDashboard(token: string, clientId?: string) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');
  await connectDB();

  // Default to the most recent active client (so /ofm "just works" out of the box).
  const client = clientId
    ? await OFClient.findById(clientId).lean()
    : await OFClient.findOne({ active: true }).sort({ createdAt: -1 }).lean();
  if (!client) return null;
  const c = client as any;

  const creators = await TrendingOFCreator.find({ ofClientId: c._id }, 'name username avatar url linkedCampaignId').lean();
  const campaignIds = (creators as any[]).map((cr) => cr.linkedCampaignId).filter(Boolean);

  const start = new Date(c.startDate);
  const end = new Date(c.endDate);
  const now = new Date();
  const startDay = ymd(start);
  const todayDay = ymd(now);
  const campaignEnded = now.getTime() > end.getTime();

  // Report window: from campaign launch through today. Never lifetime (pre-launch noise),
  // never capped at endDate (creators often stay live after the deal ends).
  const clickSinceLaunch = { $gte: start };

  const perCreator = await Promise.all(
    (creators as any[]).map(async (cr) => {
      let clicks = 0;
      if (cr.linkedCampaignId) {
        clicks = await CampaignClick.countDocuments({
          campaignId: cr.linkedCampaignId,
          clickedAt: clickSinceLaunch,
        });
      }
      return {
        name: cr.name || cr.username,
        username: cr.username,
        avatar: cr.avatar || '',
        url: cr.url || '',
        clicks,
      };
    }),
  );
  perCreator.sort((a, b) => b.clicks - a.clicks);
  const totalClicks = perCreator.reduce((s, p) => s + p.clicks, 0);

  // Impressions from launch through today.
  const impRows = campaignIds.length
    ? await CampaignImpressionDaily.aggregate([
        { $match: { campaignId: { $in: campaignIds }, date: { $gte: startDay, $lte: todayDay } } },
        { $group: { _id: null, total: { $sum: '$count' } } },
      ])
    : [];
  const totalImpressions = (impRows[0]?.total ?? 0);
  const ctr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

  // Per-hour series (last 24h).
  const since24 = new Date(now.getTime() - 24 * 3600 * 1000);
  const hourRows = campaignIds.length
    ? await CampaignClick.aggregate([
        { $match: { campaignId: { $in: campaignIds }, clickedAt: { $gte: since24 } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%dT%H', date: '$clickedAt' } }, count: { $sum: 1 } } },
      ])
    : [];
  const hourMap = new Map<string, number>();
  for (const r of hourRows as any[]) hourMap.set(r._id, r.count);
  const hourly: { label: string; clicks: number }[] = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600 * 1000);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}`;
    hourly.push({ label: `${String(d.getUTCHours()).padStart(2, '0')}h`, clicks: hourMap.get(key) || 0 });
  }

  // Per-day series: launch → today (includes every day after endDate while still live).
  const dayRows = campaignIds.length
    ? await CampaignClick.aggregate([
        { $match: { campaignId: { $in: campaignIds }, clickedAt: clickSinceLaunch } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$clickedAt' } }, count: { $sum: 1 } } },
      ])
    : [];
  const dayMap = new Map<string, number>();
  for (const r of dayRows as any[]) dayMap.set(r._id, r.count);
  const daily: { label: string; clicks: number }[] = [];
  for (let d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())); d <= now; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = ymd(d);
    daily.push({ label: key.slice(5), clicks: dayMap.get(key) || 0 });
  }

  // Section breakdown — launch → today.
  const sectionRows = campaignIds.length
    ? await CampaignClick.aggregate([
        { $match: { campaignId: { $in: campaignIds }, clickedAt: clickSinceLaunch } },
        { $group: { _id: '$placement', n: { $sum: 1 } } },
      ])
    : [];
  const SECTION_TOTALS: Record<string, number> = {
    'OnlyFans Search': 0, 'AI NSFW': 0, 'Telegram Bots': 0, 'Telegram Groups': 0,
    'Main': 0, 'Individual Pages': 0, 'Top 10s': 0, 'Trending Block': 0, 'Articles': 0, 'Other': 0,
  };
  const sectionOf = (p: string): string => {
    if (!p) return 'Telegram Groups'; // legacy untagged feed clicks defaulted to the groups feed
    if (p.startsWith('trending-')) return 'Trending Block';
    if (p.startsWith('top-bots-')) return 'Telegram Bots';
    if (p.startsWith('top-groups-') || p.startsWith('feed-')) return 'Telegram Groups';
    if (p.startsWith('ainsfw')) return 'AI NSFW';
    if (p === 'home-block-1' || p === 'home-block-2' || p === 'top-banner' || p === 'navbar-cta') return 'Main';
    if (p.startsWith('group-sidebar') || p === 'join-cta') return 'Individual Pages';
    if (p === 'best-of' || p === 'best-groups') return 'Top 10s';
    if (p.startsWith('article:')) return 'Articles';
    if (p === 'of-cat' || p.startsWith('of-') || p === 'trending-grid') return 'OnlyFans Search';
    return 'Other';
  };
  for (const r of sectionRows as any[]) SECTION_TOTALS[sectionOf(r._id)] += r.n;
  const sections = Object.entries(SECTION_TOTALS)
    .filter(([, n]) => n > 0)
    .map(([label, clicks]) => ({ label, clicks }))
    .sort((a, b) => b.clicks - a.clicks);

  // Goal progress: clicks since launch vs deal goal (can exceed 100% after goal hit).
  const goalProgress = c.goalClicks > 0 ? totalClicks / c.goalClicks : 0;
  const onPace = goalProgress >= 1 || (campaignEnded ? totalClicks >= c.goalClicks : totalClicks >= Math.round(c.goalClicks * Math.min(Math.max((now.getTime() - start.getTime()) / Math.max(end.getTime() - start.getTime(), 1), 0), 1)));
  const msLeft = Math.max(end.getTime() - now.getTime(), 0);

  return JSON.parse(JSON.stringify({
    client: {
      _id: c._id.toString(),
      name: c.name,
      goalClicks: c.goalClicks,
      dealPrice: c.dealPrice || 0,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
    campaignEnded,
    totalClicks,
    goalClicks: c.goalClicks,
    goalProgress,
    remainingClicks: Math.max(c.goalClicks - totalClicks, 0),
    onPace,
    timeProgress: campaignEnded ? 1 : Math.min(Math.max((now.getTime() - start.getTime()) / Math.max(end.getTime() - start.getTime(), 1), 0), 1),
    hoursLeft: Math.floor(msLeft / 3600000),
    daysLeft: Math.floor(msLeft / 86400000),
    totalImpressions,
    ctr,
    perCreator,
    sections,
    hourly,
    daily,
  }));
}
