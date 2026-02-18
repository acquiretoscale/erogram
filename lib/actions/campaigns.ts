'use server';

import jwt from 'jsonwebtoken';
import type { PipelineStage } from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import { User, Campaign, CampaignClick } from '@/lib/models';

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
  }>
) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const updateData: any = { ...data };
  if (data.startDate) updateData.startDate = new Date(data.startDate);
  if (data.endDate) updateData.endDate = new Date(data.endDate);

  const doc = await Campaign.findByIdAndUpdate(id, updateData, { new: true }).lean();
  if (!doc) throw new Error('Campaign not found');

  return { _id: (doc as any)._id.toString() };
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

/**
 * Get active feed campaigns by tier. Returns campaigns with computed grid position
 * (tier 1: 3,6,9,12; tier 2: 15,18,21,24; tier 3: 27,30,33,36).
 */
export async function getActiveFeedCampaigns() {
  await connectDB();
  const now = new Date();

  const campaigns = await Campaign.find({
    slot: 'feed',
    status: 'active',
    isVisible: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
    feedTier: { $in: [1, 2, 3] },
    tierSlot: { $gte: 1, $lte: 4 },
  })
    .select('_id creative destinationUrl slot feedTier tierSlot description category country buttonText name')
    .sort({ feedTier: 1, tierSlot: 1 })
    .lean();

  return campaigns.map((c: any) => {
    const tier = c.feedTier as number;
    const slot = c.tierSlot as number;
    const positions = FEED_TIER_POSITIONS[tier];
    const position = positions && positions[slot - 1] != null ? positions[slot - 1] : 0;
    return {
      _id: c._id.toString(),
      creative: c.creative,
      destinationUrl: c.destinationUrl,
      slot: c.slot,
      position,
      description: c.description || '',
      category: c.category || 'All',
      country: c.country || 'All',
      buttonText: c.buttonText || 'Visit Site',
      name: c.name,
    };
  });
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

/** Admin: global click stats — all-time total and last 7/30 days. */
export async function getGlobalClickStats(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  await connectDB();
  const [totalRow] = await Campaign.aggregate([{ $group: { _id: null, total: { $sum: '$clicks' } } }]);
  const totalClicks = totalRow?.total ?? 0;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last7Days = await CampaignClick.countDocuments({ clickedAt: { $gte: sevenDaysAgo } });
  const last30Days = await CampaignClick.countDocuments({ clickedAt: { $gte: thirtyDaysAgo } });
  return {
    totalClicks,
    last7Days,
    last30Days,
  };
}

/** Admin: clicks per day for chart (last 7 or 30 days). */
export async function getClickStatsByDay(token: string, days: 7 | 30 = 30) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  await connectDB();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days);
  const pipeline: PipelineStage[] = [
    { $match: { clickedAt: { $gte: start } } },
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
  const result: { date: string; clicks: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const dateStr = d.toISOString().slice(0, 10);
    result.push({ date: dateStr, clicks: byDate.get(dateStr) ?? 0 });
  }
  return result;
}
