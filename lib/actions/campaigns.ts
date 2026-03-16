'use server';

import jwt from 'jsonwebtoken';
import mongoose, { type PipelineStage } from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import { User, Campaign, CampaignClick, CampaignImpressionDaily, Advertiser, Article, Group } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

const SLOT_LIMITS: Record<string, number> = {
  // Global banner shown across the site (Bots/Groups/Articles/Join pages)
  'top-banner': 2,
  'homepage-hero': 1,
  feed: 12, // 3 slots x up to 4 A/B variants each
  'navbar-cta': 1,
  'join-cta': 1,
  'filter-cta': 1,
  'vault-premium': 1, // internal EROGRAM premium vault ad
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
    videoUrl: c.videoUrl || '',
    badgeText: c.badgeText || '',
    verified: Boolean(c.verified),
    adType: c.adType || 'advertiser',
    premiumCategory: c.premiumCategory || '',
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
    videoUrl?: string;
    badgeText?: string;
    verified?: boolean;
    adType?: 'advertiser' | 'premium';
    premiumCategory?: string;
    socialProof?: string;
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
  if (!isCtaSlot && data.adType !== 'premium' && !data.creative) {
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
    const slot = data.tierSlot != null ? Number(data.tierSlot) : null;
    if (slot != null) {
      if (slot < 1 || slot > 3) {
        throw new Error('Feed Slot must be 1–3.');
      }
      (data as any).feedTier = 1; // all feed ads live in tier 1
      const variantCount = await Campaign.countDocuments({
        slot: 'feed',
        feedTier: 1,
        tierSlot: slot,
        status: 'active',
        isVisible: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      });
      if (variantCount >= 4) {
        throw new Error(`Slot ${slot} already has 4 A/B variants (max). Pause or remove one first.`);
      }
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
    videoUrl: data.slot === 'feed' ? (data.videoUrl || '') : '',
    badgeText: data.slot === 'feed' ? (data.badgeText || '') : '',
    verified: data.slot === 'feed' ? Boolean(data.verified) : false,
    adType: data.adType || 'advertiser',
    premiumCategory: data.adType === 'premium' ? (data.premiumCategory || '') : '',
    socialProof: data.socialProof || 'random',
  });

  // Keep feed positions gap-free after a new ad is created
  if (data.slot === 'feed') {
    await normalizeFeedPositions();
  }

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
    videoUrl: string;
    badgeText: string;
    verified: boolean;
    adType: 'advertiser' | 'premium';
    premiumCategory: string;
    socialProof: string;
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
  if ('videoUrl' in data) updateData.videoUrl = String(data.videoUrl ?? '').trim();
  if ('badgeText' in data) updateData.badgeText = String(data.badgeText ?? '').trim();
  if ('verified' in data) updateData.verified = Boolean(data.verified);
  if ('adType' in data) updateData.adType = data.adType || 'advertiser';
  if ('premiumCategory' in data) updateData.premiumCategory = String(data.premiumCategory ?? '').trim();
  if ('socialProof' in data) updateData.socialProof = data.socialProof || 'random';

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

  // Keep feed positions gap-free so the admin always shows the correct order
  if ((doc as any).slot === 'feed' || data.slot === 'feed') {
    await normalizeFeedPositions();
  }

  return doc as any;
}

export async function deleteCampaign(token: string, id: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const deleted = await Campaign.findByIdAndDelete(id).lean();

  // Compact feed positions after deletion
  if (deleted && (deleted as any).slot === 'feed') {
    await normalizeFeedPositions();
  }

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
 * Get feed slot capacity (3 slots, up to 4 A/B variants each). Used by admin.
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
        feedTier: 1,
        tierSlot: { $gte: 1, $lte: 3 },
      },
    },
    { $group: { _id: '$tierSlot', count: { $sum: 1 } } },
  ]);

  const TIER_LABELS = ['Top Groups — Position 2', 'Discover NSFW Telegram — Position 3', 'Discover NSFW Groups — Position 8'];
  const countBySlot = new Map(counts.map((c: any) => [c._id, c.count]));
  return [1, 2, 3].map((s) => ({
    tier: 1,
    label: TIER_LABELS[s - 1],
    max: 4,
    active: countBySlot.get(s) || 0,
    remaining: 4 - (countBySlot.get(s) || 0),
  }));
}

// One ad every 5 entries: positions 5, 10, 15, … 60 (12 slots)
const FEED_DISPLAY_POSITIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

/**
 * Renumber position fields for ALL feed campaigns so there are no gaps.
 * Active campaigns come first (sorted by their current sort key), then inactive.
 * After this call: active ads are 1, 2, 3… and inactive are n+1, n+2…
 * Call after any feed campaign create / update / delete.
 */
async function normalizeFeedPositions(): Promise<void> {
  const allFeed = await Campaign.find({ slot: 'feed' })
    .select('_id status position feedTier tierSlot')
    .lean();

  if (allFeed.length === 0) return;

  const withKey = allFeed.map((c: any) => {
    const slot = c.tierSlot as number | null;
    const stored = c.position != null ? Number(c.position) : 999;
    const sortKey = slot != null && slot >= 1 && slot <= 3 ? slot : stored;
    const isActive = c.status === 'active';
    return { c, sortKey, isActive };
  });

  // Active first (by current sort key), then inactive (by current sort key)
  withKey.sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.sortKey - b.sortKey;
  });

  const bulkOps = withKey.map((item, i) => ({
    updateOne: {
      filter: { _id: item.c._id },
      update: { $set: { position: i + 1 } },
    },
  }));
  await Campaign.bulkWrite(bulkOps);
}

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
    feedTier: 1,
    tierSlot: { $gte: 1, $lte: 4 },
    $or: [
      { feedPlacement: placement },
      { feedPlacement: 'both' },
      { feedPlacement: { $exists: false } },
    ],
  })
    .select('_id creative destinationUrl slot feedTier tierSlot position description category country buttonText name feedPlacement videoUrl badgeText verified adType premiumCategory socialProof')
    .lean();

  // Group by tierSlot (1-4) for A/B variant selection
  const slotGroups = new Map<number, any[]>();
  for (const c of campaigns) {
    const ts = (c as any).tierSlot as number;
    if (!slotGroups.has(ts)) slotGroups.set(ts, []);
    slotGroups.get(ts)!.push(c);
  }

  // For each of the 4 slots, randomly pick one variant (A/B test)
  const slotPicks: (any | null)[] = [null, null, null, null];
  for (let s = 1; s <= 4; s++) {
    const variants = slotGroups.get(s);
    if (variants && variants.length > 0) {
      slotPicks[s - 1] = variants[Math.floor(Math.random() * variants.length)];
    }
  }

  // Return one campaign per slot with its tierSlot preserved.
  // Front-end buildFeedItems handles placement: slot 1 → top section,
  // slot 2 → after 2 groups, slot 3 → after 7, slot 4 → after 12 + loops.
  const results: any[] = [];
  for (let s = 0; s < 4; s++) {
    const pick = slotPicks[s];
    if (!pick) continue;
    results.push({
      _id: pick._id.toString(),
      creative: pick.creative,
      destinationUrl: pick.destinationUrl,
      slot: pick.slot,
      position: s + 1,
      tierSlot: (pick as any).tierSlot,
      description: pick.description || '',
      category: pick.category || 'All',
      country: pick.country || 'All',
      buttonText: pick.buttonText || 'Visit Site',
      name: pick.name,
      videoUrl: pick.videoUrl || '',
      badgeText: pick.badgeText || '',
      verified: Boolean(pick.verified),
      adType: pick.adType || 'advertiser',
      premiumCategory: pick.premiumCategory || '',
      socialProof: pick.socialProof || 'random',
    });
  }

  // For premium campaigns, load top featured groups for their category.
  // Wrapped in try-catch so a failure here never prevents advertiser ads from loading.
  try {
    const premiumCampaigns = results.filter(r => r.adType === 'premium');
    if (premiumCampaigns.length > 0) {
      const categoryCampaigns = premiumCampaigns.filter(c => c.premiumCategory);
      const noCategoryCampaigns = premiumCampaigns.filter(c => !c.premiumCategory);
      const categories = [...new Set(categoryCampaigns.map(c => c.premiumCategory))];

      const groupsByCategory: Record<string, any[]> = {};

      // Load groups for campaigns with a specific category
      await Promise.all(categories.map(async (cat) => {
        const groups = await Group.find({
          premiumOnly: true,
          status: 'approved',
          $or: [
            { category: cat },
            { vaultCategories: cat },
          ],
        })
          .sort({ showOnVaultTeaser: -1, memberCount: -1 })
          .limit(8)
          .select('_id name image memberCount category vaultCategories')
          .lean();
        groupsByCategory[cat] = groups.map((g: any) => ({
          _id: g._id.toString(),
          name: g.name || '',
          image: g.image || '',
          memberCount: g.memberCount || 0,
          category: g.category || '',
        }));
      }));

      // Load ALL top premium groups for campaigns without a specific category
      let allPremiumGroups: any[] = [];
      if (noCategoryCampaigns.length > 0) {
        const groups = await Group.find({
          premiumOnly: true,
          status: 'approved',
        })
          .sort({ showOnVaultTeaser: -1, memberCount: -1 })
          .limit(8)
          .select('_id name image memberCount category vaultCategories')
          .lean();
        allPremiumGroups = groups.map((g: any) => ({
          _id: g._id.toString(),
          name: g.name || '',
          image: g.image || '',
          memberCount: g.memberCount || 0,
          category: g.category || '',
        }));
      }

      for (const r of results) {
        if (r.adType === 'premium') {
          r.premiumGroups = r.premiumCategory
            ? (groupsByCategory[r.premiumCategory] || [])
            : allPremiumGroups;
        }
      }
    }
  } catch (err) {
    console.error('[getActiveFeedCampaigns] Failed to load premium groups, continuing without them:', err);
  }

  return results;
}

/**
 * Track a click on a campaign. Fire-and-forget from the client.
 * Updates Campaign.clicks and records a CampaignClick for period stats (7d, 30d).
 */
export async function trackClick(campaignId: string, placement?: string) {
  try {
    await connectDB();
    await Campaign.findByIdAndUpdate(campaignId, { $inc: { clicks: 1 } });
    await CampaignClick.create({
      campaignId,
      clickedAt: new Date(),
      ...(placement ? { placement } : {}),
    });
  } catch {
    // Silently fail — click tracking should never block the user
  }
}

/**
 * Track an impression on a campaign. Fire-and-forget from the client.
 * Increments Campaign.impressions (all-time) and upserts a daily counter
 * for period-specific CTR calculations.
 */
export async function trackImpression(campaignId: string) {
  try {
    await connectDB();
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    await Promise.all([
      Campaign.findByIdAndUpdate(campaignId, { $inc: { impressions: 1 } }),
      CampaignImpressionDaily.updateOne(
        { campaignId, date: today },
        { $inc: { count: 1 } },
        { upsert: true },
      ),
    ]);
  } catch {
    // Silently fail
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

/** Admin: click stats per feed campaign (total, last 24h, 48h, 7d, 30d) + period-specific impressions & CTR. */
export async function getFeedCampaignClickStats(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  await connectDB();
  const feedCampaigns = await Campaign.find({ slot: 'feed' }).select('_id clicks impressions').lean();
  const campaignIds = feedCampaigns.map((c: any) => c._id);
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Date strings for daily impression lookups
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const sevenDaysAgo = last7d.toISOString().slice(0, 10);

  const [by24h, by48h, by7d, by30d, impressionsDaily] = await Promise.all([
    CampaignClick.aggregate([
      { $match: { campaignId: { $in: campaignIds }, clickedAt: { $gte: last24h } } },
      { $group: { _id: '$campaignId', clicks: { $sum: 1 } } },
    ]).then((r: { _id: any; clicks: number }[]) => new Map(r.map((x) => [x._id.toString(), x.clicks]))),
    CampaignClick.aggregate([
      { $match: { campaignId: { $in: campaignIds }, clickedAt: { $gte: last48h } } },
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
    // Daily impression buckets for period-specific CTR
    CampaignImpressionDaily.aggregate([
      { $match: { campaignId: { $in: campaignIds }, date: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: '$campaignId',
          imp24h: { $sum: { $cond: [{ $gte: ['$date', yesterday] }, '$count', 0] } },
          imp48h: { $sum: { $cond: [{ $gte: ['$date', twoDaysAgo] }, '$count', 0] } },
          imp7d: { $sum: '$count' },
        },
      },
    ]).then((r: any[]) => new Map(r.map((x) => [x._id.toString(), { imp24h: x.imp24h, imp48h: x.imp48h, imp7d: x.imp7d }]))),
  ]);

  const result: Record<string, {
    total: number; last24h: number; last48h: number; last7d: number; last30d: number;
    impressions: number; ctr: number;
    impressions24h: number; ctr24h: number;
    impressions48h: number; ctr48h: number;
  }> = {};
  feedCampaigns.forEach((c: any) => {
    const id = c._id.toString();
    const impressions = c.impressions ?? 0;
    const totalClicks = c.clicks ?? 0;
    const clicks24h = by24h.get(id) ?? 0;
    const clicks48h = by48h.get(id) ?? 0;
    const daily = impressionsDaily.get(id) || { imp24h: 0, imp48h: 0, imp7d: 0 };
    result[id] = {
      total: totalClicks,
      last24h: clicks24h,
      last48h: clicks48h,
      last7d: by7d.get(id) ?? 0,
      last30d: by30d.get(id) ?? 0,
      impressions,
      ctr: impressions > 0 ? Number(((totalClicks / impressions) * 100).toFixed(2)) : 0,
      impressions24h: daily.imp24h,
      ctr24h: daily.imp24h > 0 ? Number(((clicks24h / daily.imp24h) * 100).toFixed(2)) : 0,
      impressions48h: daily.imp48h,
      ctr48h: daily.imp48h > 0 ? Number(((clicks48h / daily.imp48h) * 100).toFixed(2)) : 0,
    };
  });
  return result;
}

/** Admin: A/B stats for feed campaigns grouped by position (feedTier, tierSlot). */
export async function getFeedABStats(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  await connectDB();

  const feedCampaigns = await Campaign.find({ slot: 'feed' })
    .select('_id name feedTier tierSlot impressions clicks status advertiserId')
    .populate('advertiserId', 'name')
    .lean();

  const groups: Record<string, {
    feedTier: number;
    tierSlot: number;
    variants: {
      _id: string;
      name: string;
      advertiserName: string;
      impressions: number;
      clicks: number;
      ctr: number;
      status: string;
      isWinner: boolean;
    }[];
  }> = {};

  for (const c of feedCampaigns as any[]) {
    const tier = c.feedTier as number | null;
    const slot = c.tierSlot as number | null;
    if (tier == null || slot == null) continue;

    const key = `${tier}-${slot}`;
    if (!groups[key]) {
      groups[key] = { feedTier: tier, tierSlot: slot, variants: [] };
    }

    const impressions = c.impressions ?? 0;
    const clicks = c.clicks ?? 0;
    groups[key].variants.push({
      _id: c._id.toString(),
      name: c.name,
      advertiserName: c.advertiserId?.name || 'Unknown',
      impressions,
      clicks,
      ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
      status: c.status,
      isWinner: false,
    });
  }

  // Mark winner in each position group (highest CTR with min 100 impressions)
  for (const group of Object.values(groups)) {
    const eligible = group.variants.filter((v) => v.impressions >= 100);
    if (eligible.length > 0) {
      eligible.sort((a, b) => b.ctr - a.ctr);
      eligible[0].isWinner = true;
    }
  }

  return groups;
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
