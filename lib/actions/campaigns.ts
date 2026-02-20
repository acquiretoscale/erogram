'use server';

import jwt from 'jsonwebtoken';
import mongoose, { type PipelineStage } from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import { User, Campaign, CampaignClick, Advertiser, Article, Group } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

const SLOT_LIMITS: Record<string, number> = {
  // Global banner shown across the site (Bots/Groups/Articles/Join pages)
  'top-banner': 2,
  'homepage-hero': 1,
  feed: 12, // 4 per tier (tier 1, 2, 3)
  'navbar-cta': 1,
  'join-cta': 1,
  'filter-cta': 1,
};

// Grid positions for feed: first 12 groups get 4 ads at 3,6,9,12; next 12 at 15,18,21,24; next 12 at 27,30,33,36
const FEED_TIER_POSITIONS: Record<number, number[]> = {
  1: [3, 6, 9, 12],
  2: [15, 18, 21, 24],
  3: [27, 30, 33, 36],
};

async function authenticateAdmin(token: string) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    await connectDB();
    const user = await User.findById(decoded.id);
    if (user && user.isAdmin) return user;
  } catch {
    return null;
  }
  return null;
}

export async function getCampaigns(token: string, advertiserId?: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const filter: any = {};
  if (advertiserId) filter.advertiserId = advertiserId;

  const campaigns = await Campaign.find(filter)
    .populate('advertiserId', 'name')
    .sort({ createdAt: -1 })
    .lean();

  return campaigns.map((c: any) => ({
    _id: c._id.toString(),
    advertiserId: c.advertiserId?._id?.toString() || '',
    advertiserName: c.advertiserId?.name || 'Unknown',
    name: c.name,
    slot: c.slot,
    creative: c.creative,
    destinationUrl: c.destinationUrl,
    startDate: c.startDate?.toISOString() || '',
    endDate: c.endDate?.toISOString() || '',
    status: c.status,
    isVisible: c.isVisible,
    impressions: c.impressions || 0,
    clicks: c.clicks || 0,
    createdAt: c.createdAt?.toISOString() || '',
    position: c.position ?? null,
    feedTier: c.feedTier ?? null,
    tierSlot: c.tierSlot ?? null,
    description: c.description || '',
    category: c.category || 'All',
    country: c.country || 'All',
    buttonText: c.buttonText || 'Visit Site',
    feedPlacement: c.feedPlacement || 'both',
  }));
}

export async function createCampaign(
  token: string,
  data: {
    advertiserId: string;
    name: string;
    slot: string;
    creative: string;
    destinationUrl: string;
    startDate: string;
    endDate: string;
    status?: string;
    isVisible?: boolean;
    position?: number | null;
    feedTier?: number | null;
    tierSlot?: number | null;
    description?: string;
    category?: string;
    country?: string;
    buttonText?: string;
    feedPlacement?: 'groups' | 'bots' | 'both';
  }
) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  // CTA slots = text + link only (no image): navbar-cta, join-cta, filter-cta
  const CTA_SLOTS = ['navbar-cta', 'join-cta', 'filter-cta'];
  const slot = typeof data.slot === 'string' ? data.slot.trim().toLowerCase() : data.slot;
  (data as any).slot = slot;
  const isCtaSlot = CTA_SLOTS.includes(slot);
  if (isCtaSlot) {
    (data as any).creative = ''; // CTA slots never use image
  }
  if (!data.advertiserId || !String(data.advertiserId).trim()) {
    throw new Error('Advertiser is required');
  }
  if (!data.name || !String(data.name).trim()) {
    throw new Error('Campaign name is required');
  }
  if (!data.slot) {
    throw new Error('Slot is required');
  }
  if (!data.destinationUrl || !String(data.destinationUrl).trim()) {
    throw new Error('Destination URL is required');
  }
  if (!isCtaSlot && !data.creative) {
    throw new Error('Creative image is required for this slot');
  }
  if (isCtaSlot && !(data.description != null && String(data.description).trim())) {
    throw new Error('CTA text (button label) is required for CTA slots');
  }

  const limit = SLOT_LIMITS[slot];
  if (limit === undefined) throw new Error(`Invalid slot: "${slot}"`);

  await connectDB();

  const now = new Date();

  if (data.slot === 'feed') {
    const tier = data.feedTier != null ? Number(data.feedTier) : null;
    const slot = data.tierSlot != null ? Number(data.tierSlot) : null;
    if (tier == null || slot == null || tier < 1 || tier > 3 || slot < 1 || slot > 4) {
      throw new Error('Feed campaigns require Tier (1–3) and Slot (1–4).');
    }
    const existing = await Campaign.findOne({
      slot: 'feed',
      feedTier: tier,
      tierSlot: slot,
      status: 'active',
      isVisible: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });
    if (existing) {
      throw new Error(`Feed Tier ${tier} Slot ${slot} is already taken.`);
    }
  } else {
    const activeCount = await Campaign.countDocuments({
      slot: data.slot,
      status: 'active',
      isVisible: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });
    if (activeCount >= limit) {
      throw new Error(`Slot "${data.slot}" is full (${limit} max). Pause or end an existing campaign first.`);
    }
  }

  const doc = await Campaign.create({
    advertiserId: data.advertiserId,
    name: data.name,
    slot: data.slot,
    creative: isCtaSlot ? '' : (data.creative || ''),
    destinationUrl: data.destinationUrl,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    status: data.status || 'active',
    isVisible: data.isVisible !== false,
    position: data.position ?? null,
    feedTier: data.slot === 'feed' ? data.feedTier ?? null : null,
    tierSlot: data.slot === 'feed' ? data.tierSlot ?? null : null,
    description: data.description || '',
    category: data.category || 'All',
    country: data.country || 'All',
    buttonText: data.buttonText || 'Visit Site',
    feedPlacement: data.slot === 'feed' ? (data.feedPlacement || 'both') : undefined,
  });

  return { _id: doc._id.toString() };
}

export async function updateCampaign(
  token: string,
  id: string,
  data: Partial<{
    name: string;
    slot: string;
    creative: string;
    destinationUrl: string;
    startDate: string;
    endDate: string;
    status: string;
    isVisible: boolean;
    position: number | null;
    feedTier: number | null;
    tierSlot: number | null;
    description: string;
    category: string;
    country: string;
    buttonText: string;
    feedPlacement: 'groups' | 'bots' | 'both';
    advertiserId: string;
  }>
) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const updateData: Record<string, unknown> = {};
  if (data.name != null) updateData.name = String(data.name).trim();
  if (data.slot != null) updateData.slot = String(data.slot).trim().toLowerCase();
  if (data.advertiserId != null) updateData.advertiserId = String(data.advertiserId).trim();
  if (data.creative != null) updateData.creative = data.creative;
  if (data.destinationUrl != null) updateData.destinationUrl = String(data.destinationUrl).trim();
  if (data.startDate != null) updateData.startDate = new Date(data.startDate);
  if (data.endDate != null) updateData.endDate = new Date(data.endDate);
  if (data.status != null) updateData.status = data.status;
  if (data.isVisible !== undefined) updateData.isVisible = Boolean(data.isVisible);
  if (data.position !== undefined) updateData.position = data.position == null ? null : Number(data.position);
  if (data.feedTier !== undefined) updateData.feedTier = data.feedTier == null ? null : Number(data.feedTier);
  if (data.tierSlot !== undefined) updateData.tierSlot = data.tierSlot == null ? null : Number(data.tierSlot);
  // Always apply text fields when sent (so edits to name/description/buttonText always persist)
  if ('description' in data) updateData.description = String(data.description ?? '').trim();
  if ('buttonText' in data) updateData.buttonText = String(data.buttonText ?? 'Visit Site').trim();
  if (data.category != null) updateData.category = String(data.category || 'All');
  if (data.country != null) updateData.country = String(data.country || 'All');
  if (data.feedPlacement != null) updateData.feedPlacement = data.feedPlacement;

  if (Object.keys(updateData).length === 0) {
    const doc = await Campaign.findById(id).lean();
    if (!doc) throw new Error('Campaign not found');
    return doc as any;
  }

  const doc = await Campaign.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean();
  if (!doc) throw new Error('Campaign not found');

  return doc as any;
}

export async function deleteCampaign(token: string, id: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  await Campaign.findByIdAndDelete(id);

  return { success: true };
}

/**
 * Get active campaigns for a given slot.
 * Called from server components at render time — no auth needed.
 */
export async function getActiveCampaigns(slot: string) {
  await connectDB();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const limit = SLOT_LIMITS[slot] ?? undefined;
  const query = Campaign.find({
    slot,
    status: 'active', // paused/ended campaigns are never returned
    isVisible: { $ne: false },
    startDate: { $lte: now },
    endDate: { $gte: startOfToday },
  })
    .select('_id creative destinationUrl slot description buttonText')
    .sort({ createdAt: -1 });
  const campaigns = await (limit != null ? query.limit(limit) : query).lean();

  return campaigns.map((c: any) => ({
    _id: c._id.toString(),
    creative: c.creative || '',
    destinationUrl: c.destinationUrl || '',
    slot: c.slot,
    description: c.description || '',
    buttonText: c.buttonText || '',
  }));
}

/**
 * Get the remaining capacity for each slot.
 * Used by the admin UI to show available slots.
 */
export async function getSlotCapacity(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const now = new Date();

  const activeCounts = await Campaign.aggregate([
    {
      $match: {
        status: 'active',
        isVisible: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      },
    },
    { $group: { _id: '$slot', count: { $sum: 1 } } },
  ]);

  const countMap = new Map(activeCounts.map((c: any) => [c._id, c.count]));

  return Object.entries(SLOT_LIMITS).map(([slot, max]) => ({
    slot,
    max,
    active: countMap.get(slot) || 0,
    remaining: max - (countMap.get(slot) || 0),
  }));
}

/**
 * Get feed tier capacity (4 slots per tier). Used by admin when creating feed campaigns.
 */
export async function getFeedTierCapacity(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const now = new Date();

  const counts = await Campaign.aggregate([
    {
      $match: {
        slot: 'feed',
        status: 'active',
        isVisible: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
        feedTier: { $in: [1, 2, 3] },
      },
    },
    { $group: { _id: '$feedTier', count: { $sum: 1 } } },
  ]);

  const countByTier = new Map(counts.map((c: any) => [c._id, c.count]));
  return [1, 2, 3].map((tier) => ({
    tier,
    label: tier === 1 ? 'Top (first 12 groups)' : tier === 2 ? 'Middle (next 12)' : 'Bottom (next 12)',
    max: 4,
    active: countByTier.get(tier) || 0,
    remaining: 4 - (countByTier.get(tier) || 0),
  }));
}

// One ad every 5 entries: positions 5, 10, 15, … 60 (12 slots)
const FEED_DISPLAY_POSITIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

/**
 * Get active feed campaigns for Groups or Bots page. Single source: Campaign slot=feed.
 * placement: 'groups' | 'bots' — only campaigns with feedPlacement matching (or 'both') are returned.
 * Sorted by priority/position 1,2,3…; one ad every 5 entries. No cache.
 */
export async function getActiveFeedCampaigns(placement: 'groups' | 'bots') {
  const { unstable_noStore } = await import('next/cache');
  unstable_noStore();

  await connectDB();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const campaigns = await Campaign.find({
    slot: 'feed',
    status: 'active',
    isVisible: true,
    startDate: { $lte: now },
    endDate: { $gte: startOfToday },
    $and: [
      {
        $or: [
          { feedTier: { $in: [1, 2, 3] }, tierSlot: { $gte: 1, $lte: 4 } },
          { position: { $gte: 1 } },
        ],
      },
      {
        $or: [
          { feedPlacement: placement },
          { feedPlacement: 'both' },
          { feedPlacement: { $exists: false } },
        ],
      },
    ],
  })
    .select('_id creative destinationUrl slot feedTier tierSlot position description category country buttonText name feedPlacement')
    .lean();

  const withSortKey = campaigns.map((c: any) => {
    const tier = c.feedTier as number | null;
    const slot = c.tierSlot as number | null;
    const storedPosition = c.position != null ? Number(c.position) : 999;
    const positions = tier != null ? FEED_TIER_POSITIONS[tier] : null;
    const sortPosition =
      positions != null && slot != null && slot >= 1 && slot <= 4 && positions[slot - 1] != null
        ? positions[slot - 1]
        : storedPosition;
    return { c, sortPosition };
  });
  withSortKey.sort((a, b) => a.sortPosition - b.sortPosition);

  // Only 12 ads. Assign display positions 5, 10, 15, … 60 (one ad every 5 entries).
  return withSortKey.slice(0, 12).map(({ c }, i) => ({
    _id: c._id.toString(),
    creative: c.creative,
    destinationUrl: c.destinationUrl,
    slot: c.slot,
    position: FEED_DISPLAY_POSITIONS[i],
    description: c.description || '',
    category: c.category || 'All',
    country: c.country || 'All',
    buttonText: c.buttonText || 'Visit Site',
    name: c.name,
  }));
}

/**
 * Track a click on a campaign. Fire-and-forget from the client.
 * Updates Campaign.clicks and records a CampaignClick for period stats (7d, 30d).
 */
export async function trackClick(campaignId: string, placement?: string) {
  try {
    await connectDB();
    await Campaign.findByIdAndUpdate(campaignId, { $inc: { clicks: 1 } });
    await CampaignClick.create({ campaignId, clickedAt: new Date() });
  } catch {
    // Silently fail — click tracking should never block the user
  }
}

/** Admin: total clicks per slot (for top-performing slots). Sorted by totalClicks desc. */
export async function getSlotClickTotals(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  await connectDB();
  const rows = await Campaign.aggregate([
    { $group: { _id: '$slot', totalClicks: { $sum: '$clicks' }, campaignCount: { $sum: 1 } } },
    { $sort: { totalClicks: -1 } },
  ]);
  return rows.map((r: { _id: string; totalClicks: number; campaignCount: number }) => ({
    slot: r._id,
    totalClicks: r.totalClicks || 0,
    campaignCount: r.campaignCount || 0,
  }));
}

/** Admin: global click stats — all-time total, today, last 7/30 days. */
export async function getGlobalClickStats(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  await connectDB();
  const [totalRow] = await Campaign.aggregate([{ $group: { _id: null, total: { $sum: '$clicks' } } }]);
  const totalClicks = totalRow?.total ?? 0;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [todayClicks, last24h, last7Days, last30Days] = await Promise.all([
    CampaignClick.countDocuments({ clickedAt: { $gte: startOfToday } }),
    CampaignClick.countDocuments({ clickedAt: { $gte: twentyFourHoursAgo } }),
    CampaignClick.countDocuments({ clickedAt: { $gte: sevenDaysAgo } }),
    CampaignClick.countDocuments({ clickedAt: { $gte: thirtyDaysAgo } }),
  ]);
  return {
    totalClicks,
    todayClicks,
    last24h,
    last7Days,
    last30Days,
  };
}

/** Admin: click stats per feed campaign (total, last 24h, 7d, 30d) for Feed Ads dashboard. */
export async function getFeedCampaignClickStats(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  await connectDB();
  const feedCampaigns = await Campaign.find({ slot: 'feed' }).select('_id clicks').lean();
  const campaignIds = feedCampaigns.map((c: any) => c._id);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [by24h, by7d, by30d] = await Promise.all([
    CampaignClick.aggregate([
      { $match: { campaignId: { $in: campaignIds }, clickedAt: { $gte: last24h } } },
      { $group: { _id: '$campaignId', clicks: { $sum: 1 } } },
    ]).then((r: { _id: any; clicks: number }[]) => new Map(r.map((x) => [x._id.toString(), x.clicks]))),
    CampaignClick.aggregate([
      { $match: { campaignId: { $in: campaignIds }, clickedAt: { $gte: last7d } } },
      { $group: { _id: '$campaignId', clicks: { $sum: 1 } } },
    ]).then((r: { _id: any; clicks: number }[]) => new Map(r.map((x) => [x._id.toString(), x.clicks]))),
    CampaignClick.aggregate([
      { $match: { campaignId: { $in: campaignIds }, clickedAt: { $gte: last30d } } },
      { $group: { _id: '$campaignId', clicks: { $sum: 1 } } },
    ]).then((r: { _id: any; clicks: number }[]) => new Map(r.map((x) => [x._id.toString(), x.clicks]))),
  ]);

  const result: Record<string, { total: number; last24h: number; last7d: number; last30d: number }> = {};
  feedCampaigns.forEach((c: any) => {
    const id = c._id.toString();
    result[id] = {
      total: c.clicks ?? 0,
      last24h: by24h.get(id) ?? 0,
      last7d: by7d.get(id) ?? 0,
      last30d: by30d.get(id) ?? 0,
    };
  });
  return result;
}

/** Admin: total clicks per advertiser (all-time, last 7d, last 30d) for Overview. */
export async function getClicksByAdvertiser(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  await connectDB();
  const campaigns = await Campaign.find({}).select('advertiserId clicks').lean();
  const campaignIds = campaigns.map((c: any) => c._id);
  const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [by7d, by30d] = await Promise.all([
    CampaignClick.aggregate([
      { $match: { campaignId: { $in: campaignIds }, clickedAt: { $gte: last7d } } },
      { $lookup: { from: 'campaigns', localField: 'campaignId', foreignField: '_id', as: 'camp' } },
      { $unwind: '$camp' },
      { $group: { _id: '$camp.advertiserId', clicks: { $sum: 1 } } },
    ]).then((r: { _id: any; clicks: number }[]) => new Map<string, number>(r.filter((x) => x._id).map((x) => [String(x._id), x.clicks] as [string, number]))),
    CampaignClick.aggregate([
      { $match: { campaignId: { $in: campaignIds }, clickedAt: { $gte: last30d } } },
      { $lookup: { from: 'campaigns', localField: 'campaignId', foreignField: '_id', as: 'camp' } },
      { $unwind: '$camp' },
      { $group: { _id: '$camp.advertiserId', clicks: { $sum: 1 } } },
    ]).then((r: { _id: any; clicks: number }[]) => new Map<string, number>(r.filter((x) => x._id).map((x) => [String(x._id), x.clicks] as [string, number]))),
  ]);
  const byAdv = new Map<string, { totalClicks: number; last7Days: number; last30Days: number }>();
  campaigns.forEach((c: any) => {
    const aid = c.advertiserId?.toString();
    if (!aid) return;
    const cur = byAdv.get(aid) || { totalClicks: 0, last7Days: 0, last30Days: 0 };
    cur.totalClicks += c.clicks ?? 0;
    byAdv.set(aid, cur);
  });
  byAdv.forEach((cur, aid) => {
    cur.last7Days = by7d.get(aid) ?? 0;
    cur.last30Days = by30d.get(aid) ?? 0;
  });
  const advertisers = await Advertiser.find({}).select('_id name').lean();
  const names = new Map(advertisers.map((a: any) => [a._id.toString(), a.name]));
  return Array.from(byAdv.entries()).map(([advertiserId, v]) => ({
    advertiserId,
    advertiserName: names.get(advertiserId) || 'Unknown',
    ...v,
  })).sort((a, b) => b.totalClicks - a.totalClicks);
}

/** Admin: clicks per day for chart. days=7|30 or pass fromDate/toDate (YYYY-MM-DD) for custom range. */
export async function getClickStatsByDay(
  token: string,
  days: 7 | 30 = 30,
  fromDate?: string,
  toDate?: string
) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  await connectDB();
  let start: Date;
  let end: Date;
  const result: { date: string; clicks: number }[] = [];
  if (fromDate && toDate) {
    start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
  } else {
    end = new Date();
    end.setHours(0, 0, 0, 0);
    start = new Date(end);
    start.setDate(start.getDate() - days);
  }
  const pipeline: PipelineStage[] = [
    { $match: { clickedAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$clickedAt' } },
        clicks: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 as 1 } },
  ];
  const rows = await CampaignClick.aggregate(pipeline);
  const byDate = new Map<string, number>(rows.map((r: { _id: string; clicks: number }) => [r._id, r.clicks]));
  const cur = new Date(start);
  while (cur <= end) {
    const dateStr = cur.toISOString().slice(0, 10);
    result.push({ date: dateStr, clicks: byDate.get(dateStr) ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

export type DashboardRange = 'today' | '7d' | '30d' | 'custom' | 'lifetime';

export interface DashboardFilters {
  advertiserIds?: string[];
  slots?: string[];
  range: DashboardRange;
  from?: string;
  to?: string;
}

export interface DashboardStatsResult {
  kpis: {
    totalClicks: number;
    todayClicks: number;
    last24h: number;
    last7d: number;
    last30d: number;
  };
  clicksByDay: { date: string; clicks: number }[];
  clicksByDayByAdvertiser?: { date: string; advertisers: { advertiserId: string; advertiserName: string; clicks: number }[] }[];
  byAdvertiser: { advertiserId: string; advertiserName: string; totalClicks: number; last7d: number; last30d: number }[];
  bySlot: { slot: string; totalClicks: number; campaignCount: number }[];
  articleClicksByAdvertiser: { advertiserId: string; advertiserName: string; articleClicks: number }[];
  prevPeriodClicksByDay?: { date: string; clicks: number }[];
  prevPeriodTotal?: number;
  advertiserSlotBreakdown?: { advertiserId: string; advertiserName: string; slots: { slot: string; clicks: number }[] }[];
  featuredGroups?: { groupId: string; name: string; advertiserId: string; advertiserName: string; clickCount: number; lastClickedAt?: string }[];
}

/** Admin: full dashboard stats with filters (advertiser, slot, date range). For Overview charts and KPIs. */
export async function getDashboardStats(token: string, filters: DashboardFilters): Promise<DashboardStatsResult> {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  await connectDB();

  const { advertiserIds, slots, range, from, to } = filters;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const wantFeatured = !slots?.length || slots.includes('featured-groups');
  const campaignSlots = slots?.filter((s) => s !== 'featured-groups');

  const campaignMatch: Record<string, unknown> = {};
  if (advertiserIds?.length) campaignMatch.advertiserId = { $in: advertiserIds };
  if (campaignSlots?.length) campaignMatch.slot = campaignSlots.length === 1 ? campaignSlots[0] : { $in: campaignSlots };
  const campaigns = await Campaign.find(campaignMatch).select('_id advertiserId slot clicks').lean() as any[];
  const campaignIds = campaigns.map((c) => c._id);

  let rangeStart: Date;
  let rangeEnd: Date;
  const isLifetime = range === 'lifetime';
  if (range === 'custom' && from && to) {
    rangeStart = new Date(from);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date(to);
    rangeEnd.setHours(23, 59, 59, 999);
  } else if (range === 'today') {
    rangeStart = startOfToday;
    rangeEnd = new Date();
  } else if (range === '7d') {
    rangeStart = last7d;
    rangeEnd = new Date();
  } else if (isLifetime) {
    rangeEnd = new Date();
    rangeStart = new Date(rangeEnd.getTime() - 90 * 24 * 60 * 60 * 1000);
    rangeStart.setHours(0, 0, 0, 0);
  } else {
    rangeStart = last30d;
    rangeEnd = new Date();
  }

  const kpis = {
    totalClicks: 0,
    todayClicks: 0,
    last24h: 0,
    last7d: 0,
    last30d: 0,
  };

  if (campaignIds.length === 0) {
    const clicksByDay: { date: string; clicks: number }[] = [];
    const cur = new Date(rangeStart);
    while (cur <= rangeEnd) {
      clicksByDay.push({ date: cur.toISOString().slice(0, 10), clicks: 0 });
      cur.setDate(cur.getDate() + 1);
    }
    const allAdvertisers = await Advertiser.find({}).select('_id name').lean() as any[];
    const names = new Map<string, string>(allAdvertisers.map((a) => [a._id.toString(), a.name]));
    let featuredGroups: { groupId: string; name: string; advertiserId: string; advertiserName: string; clickCount: number; lastClickedAt?: string }[] | undefined;
    const bySlot: { slot: string; totalClicks: number; campaignCount: number }[] = [];
    if (wantFeatured) {
      const fgMatch: Record<string, unknown> = { pinned: true, isAdvertisement: true, advertiserId: { $exists: true, $ne: null } };
      if (advertiserIds?.length) {
        fgMatch.advertiserId = { $in: advertiserIds.map((id) => new mongoose.Types.ObjectId(id)) };
      }
      const fGroups = await Group.find(fgMatch).select('_id name advertiserId clickCount lastClickedAt').lean() as any[];
      featuredGroups = fGroups
        .filter((g) => g.advertiserId)
        .map((g) => ({
          groupId: g._id.toString(),
          name: g.name as string,
          advertiserId: g.advertiserId.toString(),
          advertiserName: names.get(g.advertiserId.toString()) || 'Unknown',
          clickCount: (g.clickCount || 0) as number,
          lastClickedAt: g.lastClickedAt ? new Date(g.lastClickedAt).toISOString() : undefined,
        }));
      const fgTotal = featuredGroups.reduce((s, g) => s + g.clickCount, 0);
      if (fgTotal > 0) bySlot.push({ slot: 'featured-groups', totalClicks: fgTotal, campaignCount: featuredGroups.length });
    }
    return {
      kpis,
      clicksByDay,
      byAdvertiser: [],
      bySlot,
      articleClicksByAdvertiser: await getArticleClicksByAdvertiser(advertiserIds),
      featuredGroups,
    };
  }

  const matchInRange = { campaignId: { $in: campaignIds }, clickedAt: { $gte: rangeStart, $lte: rangeEnd } };
  const matchAllTime = { campaignId: { $in: campaignIds } };
  const dateMatch = isLifetime ? matchAllTime : matchInRange;

  const [todayClicks, last24hCount, last7dCount, last30dCount, totalInRange, clicksByDayRows, byAdvertiserRows, byAdvertiser7d, byAdvertiser30d, bySlotRows] = await Promise.all([
    CampaignClick.countDocuments({ campaignId: { $in: campaignIds }, clickedAt: { $gte: startOfToday } }),
    CampaignClick.countDocuments({ campaignId: { $in: campaignIds }, clickedAt: { $gte: last24h } }),
    CampaignClick.countDocuments({ campaignId: { $in: campaignIds }, clickedAt: { $gte: last7d } }),
    CampaignClick.countDocuments({ campaignId: { $in: campaignIds }, clickedAt: { $gte: last30d } }),
    CampaignClick.countDocuments({ campaignId: { $in: campaignIds }, clickedAt: { $gte: rangeStart, $lte: rangeEnd } }),
    CampaignClick.aggregate([
      { $match: matchInRange },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$clickedAt' } }, clicks: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    CampaignClick.aggregate([
      { $match: dateMatch },
      { $lookup: { from: 'campaigns', localField: 'campaignId', foreignField: '_id', as: 'camp' } },
      { $unwind: '$camp' },
      { $group: { _id: '$camp.advertiserId', clicks: { $sum: 1 } } },
    ]),
    CampaignClick.aggregate([
      { $match: { campaignId: { $in: campaignIds }, clickedAt: { $gte: last7d } } },
      { $lookup: { from: 'campaigns', localField: 'campaignId', foreignField: '_id', as: 'camp' } },
      { $unwind: '$camp' },
      { $group: { _id: '$camp.advertiserId', clicks: { $sum: 1 } } },
    ]),
    CampaignClick.aggregate([
      { $match: { campaignId: { $in: campaignIds }, clickedAt: { $gte: last30d } } },
      { $lookup: { from: 'campaigns', localField: 'campaignId', foreignField: '_id', as: 'camp' } },
      { $unwind: '$camp' },
      { $group: { _id: '$camp.advertiserId', clicks: { $sum: 1 } } },
    ]),
    CampaignClick.aggregate([
      { $match: dateMatch },
      { $lookup: { from: 'campaigns', localField: 'campaignId', foreignField: '_id', as: 'camp' } },
      { $unwind: '$camp' },
      { $group: { _id: '$camp.slot', clicks: { $sum: 1 } } },
    ]),
  ]);

  const adv7dMap = new Map<string, number>((byAdvertiser7d as any[]).map((r) => [r._id.toString(), r.clicks]));
  const adv30dMap = new Map<string, number>((byAdvertiser30d as any[]).map((r) => [r._id.toString(), r.clicks]));

  kpis.todayClicks = todayClicks;
  kpis.last24h = last24hCount;
  kpis.last7d = last7dCount;
  kpis.last30d = last30dCount;
  kpis.totalClicks = campaigns.reduce((sum: number, c: any) => sum + (c.clicks ?? 0), 0);

  const byDateMap = new Map<string, number>((clicksByDayRows as any[]).map((r) => [r._id, r.clicks]));
  const clicksByDay: { date: string; clicks: number }[] = [];
  const cur = new Date(rangeStart);
  while (cur <= rangeEnd) {
    const dateStr = cur.toISOString().slice(0, 10);
    clicksByDay.push({ date: dateStr, clicks: byDateMap.get(dateStr) ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }

  const allAdvertisers = await Advertiser.find({}).select('_id name').lean() as any[];
  const names = new Map<string, string>(allAdvertisers.map((a) => [a._id.toString(), a.name]));

  let clicksByDayByAdvertiser: { date: string; advertisers: { advertiserId: string; advertiserName: string; clicks: number }[] }[] | undefined;
  {
    const byDayByAdv = await CampaignClick.aggregate([
      { $match: { campaignId: { $in: campaignIds }, clickedAt: { $gte: rangeStart, $lte: rangeEnd } } },
      { $lookup: { from: 'campaigns', localField: 'campaignId', foreignField: '_id', as: 'camp' } },
      { $unwind: '$camp' },
      { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$clickedAt' } }, advertiserId: '$camp.advertiserId' }, clicks: { $sum: 1 } } },
      { $sort: { '_id.date': 1 } },
    ]);
    const byDate = new Map<string, { advertiserId: string; clicks: number }[]>();
    for (const r of byDayByAdv as any[]) {
      const date = r._id.date as string;
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push({ advertiserId: r._id.advertiserId.toString(), clicks: r.clicks });
    }
    clicksByDayByAdvertiser = clicksByDay.map((d) => ({
      date: d.date,
      advertisers: (byDate.get(d.date) || []).map((a) => ({
        advertiserId: a.advertiserId,
        advertiserName: names.get(a.advertiserId) || 'Unknown',
        clicks: a.clicks,
      })),
    }));
  }

  // Period comparison: previous period of same length
  let prevPeriodClicksByDay: { date: string; clicks: number }[] | undefined;
  let prevPeriodTotal: number | undefined;
  if (!isLifetime && range !== 'custom') {
    const periodMs = rangeEnd.getTime() - rangeStart.getTime();
    const prevEnd = new Date(rangeStart.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - periodMs);
    prevStart.setHours(0, 0, 0, 0);
    const prevRows = await CampaignClick.aggregate([
      { $match: { campaignId: { $in: campaignIds }, clickedAt: { $gte: prevStart, $lte: prevEnd } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$clickedAt' } }, clicks: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const prevMap = new Map<string, number>((prevRows as any[]).map((r) => [r._id, r.clicks]));
    prevPeriodClicksByDay = [];
    const pc = new Date(prevStart);
    while (pc <= prevEnd) {
      const ds = pc.toISOString().slice(0, 10);
      prevPeriodClicksByDay.push({ date: ds, clicks: prevMap.get(ds) ?? 0 });
      pc.setDate(pc.getDate() + 1);
    }
    prevPeriodTotal = prevPeriodClicksByDay.reduce((s, d) => s + d.clicks, 0);
  }

  // Per-advertiser slot breakdown
  let advertiserSlotBreakdown: { advertiserId: string; advertiserName: string; slots: { slot: string; clicks: number }[] }[] | undefined;
  {
    const slotByAdv = await CampaignClick.aggregate([
      { $match: dateMatch },
      { $lookup: { from: 'campaigns', localField: 'campaignId', foreignField: '_id', as: 'camp' } },
      { $unwind: '$camp' },
      { $group: { _id: { advertiserId: '$camp.advertiserId', slot: '$camp.slot' }, clicks: { $sum: 1 } } },
    ]);
    const map = new Map<string, { slot: string; clicks: number }[]>();
    for (const r of slotByAdv as any[]) {
      const aid = r._id.advertiserId.toString();
      if (!map.has(aid)) map.set(aid, []);
      map.get(aid)!.push({ slot: r._id.slot, clicks: r.clicks });
    }
    advertiserSlotBreakdown = Array.from(map.entries()).map(([aid, slots]) => ({
      advertiserId: aid,
      advertiserName: names.get(aid) || 'Unknown',
      slots: slots.sort((a, b) => b.clicks - a.clicks),
    }));
  }

  const unassignedRow = (byAdvertiserRows as any[]).find((r) => !r._id);
  const byAdvertiser = [
    ...(byAdvertiserRows as any[])
      .filter((r) => r._id)
      .map((r) => {
        const id = r._id.toString();
        return {
          advertiserId: id,
          advertiserName: names.get(id) || 'Unknown',
          totalClicks: r.clicks as number,
          last7d: adv7dMap.get(id) ?? 0,
          last30d: adv30dMap.get(id) ?? 0,
        };
      })
      .sort((a, b) => b.totalClicks - a.totalClicks),
    ...(unassignedRow ? [{
      advertiserId: '__unassigned__',
      advertiserName: 'Unassigned',
      totalClicks: unassignedRow.clicks,
      last7d: adv7dMap.get('__null__') ?? 0,
      last30d: adv30dMap.get('__null__') ?? 0,
    }] : []),
  ];

  const bySlot = (bySlotRows as any[]).map((r) => ({
    slot: r._id as string,
    totalClicks: r.clicks as number,
    campaignCount: campaigns.filter((c: any) => c.slot === r._id).length,
  }));

  const articleClicksByAdvertiser = await getArticleClicksByAdvertiser(advertiserIds);

  // Featured groups (pinned ad groups with advertiserId)
  let featuredGroups: { groupId: string; name: string; advertiserId: string; advertiserName: string; clickCount: number; lastClickedAt?: string }[] | undefined;
  if (wantFeatured) {
    const fgMatch: Record<string, unknown> = { pinned: true, isAdvertisement: true, advertiserId: { $exists: true, $ne: null } };
    if (advertiserIds?.length) {
      fgMatch.advertiserId = { $in: advertiserIds.map((id) => new mongoose.Types.ObjectId(id)) };
    }
    const fGroups = await Group.find(fgMatch).select('_id name advertiserId clickCount lastClickedAt').lean() as any[];
    featuredGroups = fGroups
      .filter((g) => g.advertiserId)
      .map((g) => ({
        groupId: g._id.toString(),
        name: g.name as string,
        advertiserId: g.advertiserId.toString(),
        advertiserName: names.get(g.advertiserId.toString()) || 'Unknown',
        clickCount: (g.clickCount || 0) as number,
        lastClickedAt: g.lastClickedAt ? new Date(g.lastClickedAt).toISOString() : undefined,
      }));

    // Add featured group clicks to the slot breakdown
    const fgTotal = featuredGroups.reduce((s, g) => s + g.clickCount, 0);
    if (fgTotal > 0) {
      bySlot.push({ slot: 'featured-groups', totalClicks: fgTotal, campaignCount: featuredGroups.length });
    }

    // Add featured group clicks to KPIs when only featured-groups slot is selected
    if (slots?.length === 1 && slots[0] === 'featured-groups') {
      kpis.totalClicks = fgTotal;
    }
  }

  return {
    kpis,
    clicksByDay,
    clicksByDayByAdvertiser,
    byAdvertiser,
    bySlot,
    articleClicksByAdvertiser,
    prevPeriodClicksByDay,
    prevPeriodTotal,
    advertiserSlotBreakdown,
    featuredGroups,
  };
}

async function getArticleClicksByAdvertiser(advertiserIds?: string[]) {
  await connectDB();
  const match: Record<string, unknown> = { advertiserId: { $exists: true, $ne: null } };
  if (advertiserIds?.length) match.advertiserId = { $in: advertiserIds };
  const rows = await Article.aggregate([
    { $match: match },
    { $group: { _id: '$advertiserId', articleClicks: { $sum: '$views' } } },
  ]);
  const advertisers = await Advertiser.find({}).select('_id name').lean() as any[];
  const names = new Map<string, string>(advertisers.map((a) => [a._id.toString(), a.name]));
  return (rows as any[]).map((r) => ({
    advertiserId: r._id.toString(),
    advertiserName: names.get(r._id.toString()) || 'Unknown',
    articleClicks: r.articleClicks as number,
  }));
}
