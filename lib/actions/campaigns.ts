'use server';

import jwt from 'jsonwebtoken';
import mongoose, { type PipelineStage } from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import { User, Campaign, CampaignClick, CampaignImpressionDaily, Advertiser, Article, Group, Bot, OnlyFansCreator, TrendingOFCreator, TrendingClickDaily } from '@/lib/models';
import { BOOST_WEIGHT } from '@/lib/adPlacements';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

// LIVE schedule check (GMT). -1 = never live; 0/0 = always live; otherwise within [start,end),
// wrapping past midnight when start > end. Mirrors AdvertCard.isCreatorLiveNow.
function isOfCreatorLiveNow(start: number, end: number): boolean {
  if (start < 0 || end < 0) return false;
  if (start === 0 && end === 0) return true;
  const h = new Date().getUTCHours();
  return start <= end ? h >= start && h < end : h >= start || h < end;
}

type OFEnrich = {
  _id: string;
  liveHourStart: number;
  liveHourEnd: number;
  liveOnly: boolean;
  /** Rotatable creator album = [avatar, ...extraPhotos] minus paused. Ordered for ":v{i}" click tags. */
  album: string[];
};

/**
 * Build username → OF ad-enrichment (live window + rotatable album). The album is the ONE creator
 * album (scraped avatar + extraPhotos) minus any image the owner paused, so ads and the public
 * profile share the same image set. Reused by every feed/trending push block.
 */
async function buildOFEnrichMap(ofUsernames: string[]): Promise<Map<string, OFEnrich>> {
  const map = new Map<string, OFEnrich>();
  if (!ofUsernames.length) return map;
  const [creatorDocs, trendingDocs] = await Promise.all([
    OnlyFansCreator.find({ username: { $in: ofUsernames } }).select('username avatar extraPhotos').lean(),
    TrendingOFCreator.find({ username: { $in: ofUsernames } })
      .select('username liveHourStart liveHourEnd liveOnly pausedImageUrls').lean(),
  ]);
  const albumByUser = new Map<string, string[]>();
  for (const c of creatorDocs as any[]) {
    const all = [c.avatar, ...((c.extraPhotos as string[]) || [])].filter(Boolean);
    albumByUser.set(String(c.username).toLowerCase(), all);
  }
  for (const t of trendingDocs as any[]) {
    const uname = String(t.username).toLowerCase();
    const paused = new Set<string>((t.pausedImageUrls as string[]) || []);
    const album = (albumByUser.get(uname) || []).filter((u) => !paused.has(u));
    map.set(uname, {
      _id: String(t._id),
      liveHourStart: t.liveHourStart ?? -1,
      liveHourEnd: t.liveHourEnd ?? -1,
      liveOnly: t.liveOnly ?? false,
      album,
    });
  }
  return map;
}

const SLOT_LIMITS: Record<string, number> = {
  // Global banner shown across the site (Bots/Groups/Articles/Join pages)
  'top-banner': 2,
  'homepage-hero': 1,
  feed: 12, // 3 slots x up to 4 A/B variants each
  'navbar-cta': 1,
  'join-cta': 1,
  'filter-cta': 1,
  ainsfw: 10,
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
    internalName: c.internalName || '',
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
    blockFormat: c.blockFormat || 'card',
    premiumCategory: c.premiumCategory || '',
    premiumGroupIds: (c.premiumGroupIds || []).map((id: any) => id.toString()),
    bannerPages: c.bannerPages || [],
    bannerDevice: c.bannerDevice || 'all',
    ofUsername: c.ofUsername || '',
    placements: c.placements || [],
    targetKeywords: c.targetKeywords || [],
    weight: c.weight ?? null,
    dailyClickCap: c.dailyClickCap ?? null,
    priority: c.priority || 'normal',
  }));
}

export async function createCampaign(
  token: string,
  data: {
    advertiserId: string;
    name: string;
    internalName?: string;
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
    feedPlacement?: 'groups' | 'bots' | 'ainsfw' | 'both';
    videoUrl?: string;
    badgeText?: string;
    verified?: boolean;
    adType?: 'advertiser' | 'premium' | 'onlyfans-creator';
    blockFormat?: 'banner' | 'card';
    premiumCategory?: string;
    premiumGroupIds?: string[];
    socialProof?: string;
    bannerPages?: string[];
    bannerDevice?: 'all' | 'mobile' | 'desktop';
    ofUsername?: string;
    placements?: string[];
    targetKeywords?: string[];
    weight?: number | null;
    dailyClickCap?: number | null;
    priority?: 'normal' | 'boost';
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
  const hasVideo = data.slot === 'feed' && !!(data as any).videoUrl;
  if (!isCtaSlot && data.adType !== 'premium' && data.adType !== 'onlyfans-creator' && !data.creative && !hasVideo) {
    throw new Error('Creative image is required for this slot (or provide a video URL for feed ads)');
  }
  if (isCtaSlot && !(data.description != null && String(data.description).trim())) {
    throw new Error('CTA text (button label) is required for CTA slots');
  }

  const limit = SLOT_LIMITS[slot];
  if (limit === undefined) throw new Error(`Invalid slot: "${slot}"`);

  await connectDB();

  const now = new Date();

  if (data.slot === 'feed') {
    const hasNamedPlacements = Array.isArray(data.placements) && data.placements.length > 0;
    const slot = data.tierSlot != null ? Number(data.tierSlot) : null;
      if (slot != null && !hasNamedPlacements) {
      // Legacy cap check — only applies when campaign has NO named placements.
      // New placement-based campaigns bypass this; placement rotation is unlimited.
      if (slot < 1 || slot > 5) {
        throw new Error('Feed Slot must be 1–5.');
      }
      (data as any).feedTier = 1;
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
    } else if (hasNamedPlacements) {
      (data as any).feedTier = 1;
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
    internalName: data.internalName || '',
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
    blockFormat: data.blockFormat === 'banner' ? 'banner' : 'card',
    premiumCategory: data.adType === 'premium' ? (data.premiumCategory || '') : '',
    premiumGroupIds: data.adType === 'premium' && data.premiumGroupIds?.length
      ? data.premiumGroupIds.map(id => new mongoose.Types.ObjectId(id))
      : [],
    socialProof: data.socialProof || 'random',
    bannerPages: data.bannerPages || [],
    bannerDevice: data.bannerDevice || 'all',
    ofUsername: data.adType === 'onlyfans-creator' ? (data.ofUsername || '').trim() : '',
    placements: Array.isArray(data.placements) ? data.placements : [],
    targetKeywords: Array.isArray(data.targetKeywords) ? data.targetKeywords : [],
    weight: data.weight ?? null,
    dailyClickCap: data.dailyClickCap ?? null,
    priority: data.priority === 'boost' ? 'boost' : 'normal',
  });

  // Keep feed positions gap-free after a new ad is created
  if (data.slot === 'feed') {
    await normalizeFeedPositions();
  }

  // Unified OF sync: mirror an OF-creator launch into the featured slots (best-effort).
  if (doc.adType === 'onlyfans-creator') {
    const { syncCampaignToTrending } = await import('@/lib/actions/ofSync');
    await syncCampaignToTrending(doc._id.toString());
  }

  return { _id: doc._id.toString() };
}

export async function updateCampaign(
  token: string,
  id: string,
  data: Partial<{
    name: string;
    internalName: string;
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
    feedPlacement: 'groups' | 'bots' | 'ainsfw' | 'both';
    advertiserId: string;
    videoUrl: string;
    badgeText: string;
    verified: boolean;
    adType: 'advertiser' | 'premium' | 'onlyfans-creator';
    blockFormat: 'banner' | 'card';
    premiumCategory: string;
    premiumGroupIds: string[];
    socialProof: string;
    bannerPages: string[];
    bannerDevice: 'all' | 'mobile' | 'desktop';
    ofUsername: string;
    placements: string[];
    targetKeywords: string[];
    weight: number | null;
    dailyClickCap: number | null;
    priority: 'normal' | 'boost';
  }>
) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const updateData: Record<string, unknown> = {};
  if (data.name != null) updateData.name = String(data.name).trim();
  if ('internalName' in data) updateData.internalName = String(data.internalName ?? '').trim();
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
  if ('blockFormat' in data) updateData.blockFormat = data.blockFormat === 'banner' ? 'banner' : 'card';
  if ('ofUsername' in data) updateData.ofUsername = String(data.ofUsername ?? '').trim();
  if ('premiumCategory' in data) updateData.premiumCategory = String(data.premiumCategory ?? '').trim();
  if ('premiumGroupIds' in data) {
    updateData.premiumGroupIds = (data.premiumGroupIds || []).map(id => new mongoose.Types.ObjectId(id));
  }
  if ('socialProof' in data) updateData.socialProof = data.socialProof || 'random';
  if ('bannerPages' in data) updateData.bannerPages = Array.isArray(data.bannerPages) ? data.bannerPages : [];
  if ('bannerDevice' in data) updateData.bannerDevice = data.bannerDevice || 'all';
  if ('placements' in data) updateData.placements = Array.isArray(data.placements) ? data.placements : [];
  if ('targetKeywords' in data) updateData.targetKeywords = Array.isArray(data.targetKeywords) ? data.targetKeywords : [];
  if ('weight' in data) updateData.weight = data.weight ?? null;
  if ('dailyClickCap' in data) updateData.dailyClickCap = data.dailyClickCap ?? null;
  if ('priority' in data) updateData.priority = data.priority === 'boost' ? 'boost' : 'normal';

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

  // Unified OF sync: a pause/end/edit on an OF-creator ad mirrors to its featured slot (best-effort).
  if ((doc as any).adType === 'onlyfans-creator') {
    const { syncCampaignToTrending } = await import('@/lib/actions/ofSync');
    await syncCampaignToTrending(String((doc as any)._id));
  }

  return doc as any;
}

export async function deleteCampaign(token: string, id: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const deleted = await Campaign.findByIdAndDelete(id).lean();

  // Unified OF sync: deleting an OF-creator campaign pulls its linked featured slot (SAME-promotion).
  if (deleted && (deleted as any).adType === 'onlyfans-creator' && (deleted as any).ofTrendingId) {
    await TrendingOFCreator.findByIdAndUpdate((deleted as any).ofTrendingId, {
      $set: { active: false, linkedCampaignId: null },
    });
  }

  // Compact feed positions after deletion
  if (deleted && (deleted as any).slot === 'feed') {
    await normalizeFeedPositions();
  }

  return { success: true };
}

/**
 * Get active campaigns for a given slot.
 * Called from server components at render time — no auth needed.
 *
 * @param slot    Campaign slot name (e.g. 'top-banner', 'homepage-hero')
 * @param opts.page   Page identifier for banner targeting (e.g. 'groups', 'bots', 'homepage').
 *                    When provided, only campaigns targeting that page (or with no page restriction) are returned.
 * @param opts.device 'mobile' | 'desktop' — filters by bannerDevice field.
 */
export async function getActiveCampaigns(
  slot: string,
  opts?: { page?: string; device?: 'mobile' | 'desktop' },
) {
  await connectDB();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // UNIFIED "WHERE": a campaign serves this surface if EITHER its legacy `slot` matches
  // (old system) OR its named `placements` array contains this surface name (new system).
  // This makes one campaign assignable to banner/CTA/hero via the SAME placement picker
  // used for feed surfaces — placements[] is the single source of truth, slot is fallback.
  const filter: Record<string, unknown> = {
    status: 'active',
    isVisible: { $ne: false },
    startDate: { $lte: now },
    endDate: { $gte: startOfToday },
    $or: [
      { slot },
      { placements: slot },
    ],
  };

  const andConditions: Record<string, unknown>[] = [];

  if (opts?.page) {
    andConditions.push({
      $or: [
        { bannerPages: { $size: 0 } },
        { bannerPages: { $exists: false } },
        { bannerPages: opts.page },
      ],
    });
  }

  if (opts?.device) {
    andConditions.push({
      $or: [
        { bannerDevice: { $in: ['all', opts.device] } },
        { bannerDevice: { $exists: false } },
        { bannerDevice: null },
      ],
    });
  }

  if (andConditions.length > 0) {
    filter.$and = andConditions;
  }

  const limit = SLOT_LIMITS[slot] ?? undefined;
  const query = Campaign.find(filter)
    .select('_id creative destinationUrl slot description buttonText bannerDevice advertiserId')
    .sort({ createdAt: -1 });
  const allCampaigns = await (limit != null ? query.limit(limit) : query).lean();

  // Per-advertiser daily cap: drop campaigns whose advertiser already hit their cap today.
  const cappedAdvertisers = await getCappedAdvertiserIds();
  const campaigns = cappedAdvertisers.size === 0
    ? allCampaigns
    : allCampaigns.filter((c: any) => !c.advertiserId || !cappedAdvertisers.has(c.advertiserId.toString()));

  return campaigns.map((c: any) => ({
    _id: c._id.toString(),
    creative: c.creative || '',
    destinationUrl: c.destinationUrl || '',
    slot: c.slot,
    description: c.description || '',
    buttonText: c.buttonText || '',
    bannerDevice: c.bannerDevice || 'all',
  }));
}

/**
 * Active generic ads assigned to a named placement (e.g. 'ainsfw-featured'), shaped for AdvertCard.
 * Used by surfaces that render AdvertCards outside the groups/bots feed (brain: ad-engine-unify).
 * Honors dates + visibility + per-campaign and per-advertiser daily caps.
 */
export async function getPlacementFeedCampaigns(placement: string, max = 4) {
  await connectDB();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [cappedAdvertisers, cappedCampaigns] = await Promise.all([
    getCappedAdvertiserIds(),
    getCappedCampaignIds(),
  ]);

  const docs = await Campaign.find({
    status: 'active',
    isVisible: true,
    startDate: { $lte: now },
    endDate: { $gte: startOfToday },
    placements: placement,
  })
    .select('_id creative destinationUrl slot description category country buttonText name videoUrl badgeText verified adType ofUsername advertiserId priority blockFormat')
    .sort({ priority: -1, createdAt: -1 })
    .lean();

  const eligible = (docs as any[])
    .filter((c) =>
      !cappedCampaigns.has(c._id.toString()) &&
      (!c.advertiserId || !cappedAdvertisers.has(c.advertiserId.toString())),
    )
    .slice(0, max);

  // Enrich OF-creator campaigns with stats + trending link so AdvertCard renders them fully.
  const ofUsernames = eligible
    .filter((c) => c.adType === 'onlyfans-creator' && c.ofUsername)
    .map((c) => String(c.ofUsername).toLowerCase());
  const ofStats = new Map<string, { likesCount: number; subscriberCount: number }>();
  const ofTrending = await buildOFEnrichMap(ofUsernames);
  if (ofUsernames.length) {
    const docsStats = await OnlyFansCreator.find({ username: { $in: ofUsernames } }).select('username likesCount subscriberCount').lean();
    for (const d of docsStats as any[]) ofStats.set(String(d.username).toLowerCase(), { likesCount: d.likesCount || 0, subscriberCount: d.subscriberCount || 0 });
  }

  // Drop OF creators flagged liveOnly that are currently offline — frees their slot.
  const liveEligible = (eligible as any[]).filter((c) => {
    if (c.adType !== 'onlyfans-creator') return true;
    const tr = ofTrending.get(String(c.ofUsername || '').toLowerCase());
    if (!tr || !tr.liveOnly) return true;
    return isOfCreatorLiveNow(tr.liveHourStart, tr.liveHourEnd);
  });

  return liveEligible.map((c: any, i: number) => {
    const uname = String(c.ofUsername || '').toLowerCase();
    const stats = ofStats.get(uname);
    const tr = ofTrending.get(uname);
    return {
      _id: c._id.toString(),
      name: c.name || '',
      creative: c.creative || '',
      destinationUrl: c.destinationUrl || '',
      slot: c.slot || 'feed',
      position: i,
      description: c.description || '',
      category: c.category || 'All',
      country: c.country || 'All',
      buttonText: c.buttonText || 'Visit Site',
      videoUrl: c.videoUrl || '',
      badgeText: c.badgeText || '',
      verified: Boolean(c.verified),
      adType: c.adType || 'advertiser',
      blockFormat: c.blockFormat || 'card',
      ofUsername: c.ofUsername || '',
      ofLikesCount: stats?.likesCount ?? 0,
      ofSubscriberCount: stats?.subscriberCount ?? 0,
      ofTrendingId: tr?._id ?? '',
      ofLiveHourStart: tr?.liveHourStart ?? -1,
      ofLiveHourEnd: tr?.liveHourEnd ?? -1,
      ofLiveOnly: tr?.liveOnly ?? false,
      ofAlbum: tr?.album ?? [],
    };
  });
}

/**
 * Fetch up to N active campaigns assigned to the new "Trending on Erogram" ad space.
 * ONE query for any campaign on a trending-* placement, deduped, caps respected.
 * Interleaves OF creators with other ad types so a single adType (e.g. AI advertisers)
 * never crowds out the promoted OF creators in the mixed block.
 */
export async function getTrendingErogramCampaigns(max = 4) {
  const { unstable_noStore } = await import('next/cache');
  unstable_noStore();

  await connectDB();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [cappedAdvertisers, cappedCampaigns] = await Promise.all([
    getCappedAdvertiserIds(),
    getCappedCampaignIds(),
  ]);

  const docs = await Campaign.find({
    status: 'active',
    isVisible: true,
    startDate: { $lte: now },
    endDate: { $gte: startOfToday },
    placements: { $in: ['trending-1', 'trending-2', 'trending-3', 'trending-4'] },
  })
    .select('_id creative destinationUrl slot description category country buttonText name videoUrl badgeText verified adType ofUsername advertiserId priority blockFormat')
    .sort({ priority: -1, createdAt: -1 })
    .lean();

  const eligible = (docs as any[]).filter((c) =>
    !cappedCampaigns.has(c._id.toString()) &&
    (!c.advertiserId || !cappedAdvertisers.has(c.advertiserId.toString())),
  );

  // Interleave OF creators with everything else so the mixed block stays varied.
  const ofCreators = eligible.filter((c) => c.adType === 'onlyfans-creator');
  const others = eligible.filter((c) => c.adType !== 'onlyfans-creator');
  const interleaved: any[] = [];
  let oi = 0, ji = 0;
  while (interleaved.length < eligible.length) {
    if (oi < ofCreators.length) interleaved.push(ofCreators[oi++]);
    if (ji < others.length) interleaved.push(others[ji++]);
    if (oi >= ofCreators.length && ji >= others.length) break;
  }
  const picks = interleaved.slice(0, max);

  // Enrich OF-creator campaigns with stats + trending link so AdvertCard renders them fully.
  const ofUsernames = picks
    .filter((c) => c.adType === 'onlyfans-creator' && c.ofUsername)
    .map((c) => String(c.ofUsername).toLowerCase());
  const ofStats = new Map<string, { likesCount: number; subscriberCount: number }>();
  const ofTrending = await buildOFEnrichMap(ofUsernames);
  if (ofUsernames.length) {
    const docsStats = await OnlyFansCreator.find({ username: { $in: ofUsernames } }).select('username likesCount subscriberCount').lean();
    for (const d of docsStats as any[]) ofStats.set(String(d.username).toLowerCase(), { likesCount: d.likesCount || 0, subscriberCount: d.subscriberCount || 0 });
  }

  // Drop OF creators flagged liveOnly that are currently offline — frees their slot.
  const livePicks = (picks as any[]).filter((c) => {
    if (c.adType !== 'onlyfans-creator') return true;
    const tr = ofTrending.get(String(c.ofUsername || '').toLowerCase());
    if (!tr || !tr.liveOnly) return true;
    return isOfCreatorLiveNow(tr.liveHourStart, tr.liveHourEnd);
  });

  return livePicks.map((c: any, i: number) => {
    const uname = String(c.ofUsername || '').toLowerCase();
    const stats = ofStats.get(uname);
    const tr = ofTrending.get(uname);
    return {
      _id: c._id.toString(),
      name: c.name || '',
      creative: c.creative || '',
      destinationUrl: c.destinationUrl || '',
      slot: c.slot || 'feed',
      position: i,
      description: c.description || '',
      category: c.category || 'All',
      country: c.country || 'All',
      buttonText: c.buttonText || 'Visit Site',
      videoUrl: c.videoUrl || '',
      badgeText: c.badgeText || '',
      verified: Boolean(c.verified),
      adType: c.adType || 'advertiser',
      blockFormat: c.blockFormat || 'card',
      ofUsername: c.ofUsername || '',
      ofLikesCount: stats?.likesCount ?? 0,
      ofSubscriberCount: stats?.subscriberCount ?? 0,
      ofTrendingId: tr?._id ?? '',
      ofLiveHourStart: tr?.liveHourStart ?? -1,
      ofLiveHourEnd: tr?.liveHourEnd ?? -1,
      ofLiveOnly: tr?.liveOnly ?? false,
      ofAlbum: tr?.album ?? [],
    };
  });
}

/**
 * Keyword-targeted placement fetch for the Top-10 pages (best-onlyfans-accounts / best-telegram-groups).
 * A campaign matches when:
 *   - its placements include the page placement id (e.g. 'best-of' or 'best-groups'), AND
 *   - its targetKeywords is empty (= runs on ALL category pages of that type) OR includes this category slug.
 * Reuses the same active/visible/in-date + daily-cap filtering and OF enrichment as getPlacementFeedCampaigns.
 * SEO-safe: callers render the result client-side; pages stay static/SSG.
 */
export async function getKeywordPlacementCampaigns(placement: string, categorySlug: string, max = 4) {
  await connectDB();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Canonicalize so a single keyword matches both OF (big-ass) and group (big ass) pages.
  const slug = (categorySlug || '').toLowerCase().trim().replace(/[\s_]+/g, '-');
  const [cappedAdvertisers, cappedCampaigns] = await Promise.all([
    getCappedAdvertiserIds(),
    getCappedCampaignIds(),
  ]);

  const docs = await Campaign.find({
    status: 'active',
    isVisible: true,
    startDate: { $lte: now },
    endDate: { $gte: startOfToday },
    placements: placement,
    // Empty/missing targetKeywords = runs on every category page of this type.
    $or: [
      { targetKeywords: { $exists: false } },
      { targetKeywords: { $size: 0 } },
      { targetKeywords: slug },
    ],
  })
    .select('_id creative destinationUrl slot description category country buttonText name videoUrl badgeText verified adType ofUsername advertiserId priority targetKeywords')
    .sort({ priority: -1, createdAt: -1 })
    .lean();

  const filtered = (docs as any[])
    .filter((c) =>
      !cappedCampaigns.has(c._id.toString()) &&
      (!c.advertiserId || !cappedAdvertisers.has(c.advertiserId.toString())),
    );

  // ROTATION (brain: inc-top-groups-rotation): every assigned ad must rotate, not just the
  // top-priority one. Boost-weighted shuffle — boosted ads get BOOST_WEIGHT draws (more visibility)
  // but non-boosted ads still rotate in. Same law as Top Groups. Without this, .slice() froze on [0].
  const weightedPool: any[] = [];
  for (const c of filtered) {
    const draws = c.priority === 'boost' ? BOOST_WEIGHT : 1;
    for (let k = 0; k < draws; k++) weightedPool.push(c);
  }
  for (let i = weightedPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [weightedPool[i], weightedPool[j]] = [weightedPool[j], weightedPool[i]];
  }
  const eligible: any[] = [];
  const seen = new Set<string>();
  for (const c of weightedPool) {
    const id = c._id.toString();
    if (seen.has(id)) continue;
    seen.add(id);
    eligible.push(c);
    if (eligible.length >= max) break;
  }

  // Enrich OF-creator campaigns with stats + trending link so AdvertCard renders them fully.
  const ofUsernames = eligible
    .filter((c) => c.adType === 'onlyfans-creator' && c.ofUsername)
    .map((c) => String(c.ofUsername).toLowerCase());
  const ofStats = new Map<string, { likesCount: number; subscriberCount: number; bio: string }>();
  const ofTrending = await buildOFEnrichMap(ofUsernames);
  if (ofUsernames.length) {
    const docsStats = await OnlyFansCreator.find({ username: { $in: ofUsernames } }).select('username likesCount subscriberCount bio').lean();
    for (const d of docsStats as any[]) ofStats.set(String(d.username).toLowerCase(), { likesCount: d.likesCount || 0, subscriberCount: d.subscriberCount || 0, bio: d.bio || '' });
  }

  // Drop OF creators flagged liveOnly that are currently offline — frees their slot.
  const liveEligible = (eligible as any[]).filter((c) => {
    if (c.adType !== 'onlyfans-creator') return true;
    const tr = ofTrending.get(String(c.ofUsername || '').toLowerCase());
    if (!tr || !tr.liveOnly) return true;
    return isOfCreatorLiveNow(tr.liveHourStart, tr.liveHourEnd);
  });

  return liveEligible.map((c: any, i: number) => {
    const uname = String(c.ofUsername || '').toLowerCase();
    const stats = ofStats.get(uname);
    const tr = ofTrending.get(uname);
    return {
      _id: c._id.toString(),
      name: c.name || '',
      creative: c.creative || '',
      destinationUrl: c.destinationUrl || '',
      slot: c.slot || 'feed',
      position: i,
      // Prefer the campaign's own copy; fall back to the creator's real OnlyFans bio.
      description: c.description || stats?.bio || '',
      category: c.category || 'All',
      country: c.country || 'All',
      buttonText: c.buttonText || 'Visit Site',
      videoUrl: c.videoUrl || '',
      badgeText: c.badgeText || '',
      verified: Boolean(c.verified),
      adType: c.adType || 'advertiser',
      ofUsername: c.ofUsername || '',
      ofBio: stats?.bio ?? '',
      ofLikesCount: stats?.likesCount ?? 0,
      ofSubscriberCount: stats?.subscriberCount ?? 0,
      ofTrendingId: tr?._id ?? '',
      ofLiveHourStart: tr?.liveHourStart ?? -1,
      ofLiveHourEnd: tr?.liveHourEnd ?? -1,
      ofLiveOnly: tr?.liveOnly ?? false,
      ofAlbum: tr?.album ?? [],
    };
  });
}

/**
 * Admin: per-campaign click counts for Today / last 7d / last 30d.
 * One aggregation over the last 30 days of CampaignClick. Lifetime lives on Campaign.clicks already.
 * Returns a map keyed by campaignId string.
 */
export async function getCampaignPeriodClicks(
  token: string,
): Promise<Record<string, { today: number; last7d: number; last30d: number }>> {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  await connectDB();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const rows = await CampaignClick.aggregate([
    { $match: { clickedAt: { $gte: last30d } } },
    {
      $group: {
        _id: '$campaignId',
        today: { $sum: { $cond: [{ $gte: ['$clickedAt', startOfToday] }, 1, 0] } },
        last7d: { $sum: { $cond: [{ $gte: ['$clickedAt', last7d] }, 1, 0] } },
        last30d: { $sum: 1 },
      },
    },
  ]);
  const map: Record<string, { today: number; last7d: number; last30d: number }> = {};
  for (const r of rows as Array<{ _id: unknown; today: number; last7d: number; last30d: number }>) {
    if (r._id) map[String(r._id)] = { today: r.today, last7d: r.last7d, last30d: r.last30d };
  }
  return map;
}

export interface GroupSidebarCreator {
  _id: string; // campaignId — used for click tracking via trackClick(_, 'group-sidebar')
  name: string;
  username: string;
  avatar: string;
  url: string;
  likesCount: number;
  categories: string[];
  isCampaign: true;
}

export interface GroupSidebarSlot {
  creators: GroupSidebarCreator[];
  ads: Array<{
    _id: string;
    name: string;
    creative: string;
    destinationUrl: string;
    slot: string;
    position: number;
    description: string;
    category: string;
    country: string;
    buttonText: string;
    videoUrl: string;
    verified: boolean;
    socialProof: string;
    adType: 'advertiser';
  }>;
}

/**
 * Sidebar promo slot on individual group/bot pages (placement: group-sidebar).
 * Returns OF-creator campaigns assigned to this placement (up to 4) resolved with avatar/likes,
 * plus any non-OF campaigns assigned to it (rendered through AdvertCard).
 * Render-time, no auth. Empty when nothing is assigned — caller falls back to trending creators.
 */
export async function getGroupSidebarSlot(): Promise<GroupSidebarSlot> {
  const { unstable_noStore } = await import('next/cache');
  unstable_noStore();
  await connectDB();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const camps = await Campaign.find({
    status: 'active',
    isVisible: { $ne: false },
    startDate: { $lte: now },
    endDate: { $gte: startOfToday },
    placements: 'group-sidebar',
  })
    .select('_id name description destinationUrl buttonText creative adType ofUsername videoUrl category country verified socialProof')
    .lean();

  const ofCamps = (camps as any[]).filter((c) => c.adType === 'onlyfans-creator' && c.ofUsername).slice(0, 4);
  const otherCamps = (camps as any[]).filter((c) => c.adType !== 'onlyfans-creator');

  const usernames = ofCamps.map((c) => (c.ofUsername as string).toLowerCase());
  const ofDocs = usernames.length
    ? await OnlyFansCreator.find({ username: { $in: usernames } })
        .select('username name avatar likesCount categories')
        .lean()
    : [];
  const ofMap = new Map((ofDocs as any[]).map((d) => [String(d.username).toLowerCase(), d]));

  const creators: GroupSidebarCreator[] = ofCamps.map((c) => {
    const d = ofMap.get((c.ofUsername as string).toLowerCase());
    return {
      _id: c._id.toString(),
      name: c.name || d?.name || c.ofUsername,
      username: c.ofUsername,
      avatar: c.creative || d?.avatar || '',
      url: c.destinationUrl || '',
      likesCount: d?.likesCount ?? 0,
      categories: d?.categories || [],
      isCampaign: true as const,
    };
  });

  const ads = otherCamps.map((c) => ({
    _id: c._id.toString(),
    name: c.name || '',
    creative: c.creative || '',
    destinationUrl: c.destinationUrl || '',
    slot: 'group-sidebar',
    position: 0,
    description: c.description || '',
    category: c.category || 'All',
    country: c.country || 'All',
    buttonText: c.buttonText || 'Visit Site',
    videoUrl: c.videoUrl || '',
    verified: Boolean(c.verified),
    socialProof: c.socialProof || 'random',
    adType: 'advertiser' as const,
  }));

  return { creators, ads };
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
        tierSlot: { $gte: 1, $lte: 5 },
      },
    },
    { $group: { _id: '$tierSlot', count: { $sum: 1 } } },
  ]);

  const TIER_LABELS = [
    'Top Groups — Position 2',
    'Discover NSFW Telegram — Position 3',
    'Discover NSFW Groups — Position 8',
    'After 12 Groups — Position 12+',
    'Featured Bot — Position 5 (Groups feed)',
  ];
  const countBySlot = new Map(counts.map((c: any) => [c._id, c.count]));
  return [1, 2, 3, 4, 5].map((s) => ({
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
    const sortKey = slot != null && slot >= 1 && slot <= 5 ? slot : stored;
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
/**
 * Per-advertiser daily click cap (brain: ad-vision).
 * Returns the set of advertiserId strings that have already hit their daily click cap today (UTC).
 * Their ads are then excluded from serving for the rest of the day → other advertisers / Erogram-own ads fill in.
 * Near-real-time (counts logged CampaignClicks); small overdelivery is acceptable by design.
 */
async function getCappedAdvertiserIds(): Promise<Set<string>> {
  const capped = new Set<string>();
  try {
    const startOfDayUTC = new Date();
    startOfDayUTC.setUTCHours(0, 0, 0, 0);

    // Advertisers that actually have a cap set (cap > 0).
    const cappedAdvertisers = await Advertiser.find({ dailyClickCap: { $gt: 0 } })
      .select('_id dailyClickCap')
      .lean();
    if (cappedAdvertisers.length === 0) return capped;

    const capMap = new Map<string, number>();
    for (const a of cappedAdvertisers as any[]) capMap.set(a._id.toString(), a.dailyClickCap);

    // Campaigns belonging to those advertisers.
    const camps = await Campaign.find({ advertiserId: { $in: cappedAdvertisers.map((a: any) => a._id) } })
      .select('_id advertiserId')
      .lean();
    const campToAdv = new Map<string, string>();
    for (const c of camps as any[]) campToAdv.set(c._id.toString(), c.advertiserId.toString());

    // Today's clicks grouped by campaign.
    const clicksByCampaign = await CampaignClick.aggregate([
      { $match: { clickedAt: { $gte: startOfDayUTC }, campaignId: { $in: camps.map((c: any) => c._id) } } },
      { $group: { _id: '$campaignId', n: { $sum: 1 } } },
    ]);

    // Sum per advertiser.
    const todayByAdv = new Map<string, number>();
    for (const row of clicksByCampaign as any[]) {
      const adv = campToAdv.get(row._id.toString());
      if (!adv) continue;
      todayByAdv.set(adv, (todayByAdv.get(adv) || 0) + row.n);
    }

    for (const [adv, cap] of capMap) {
      if ((todayByAdv.get(adv) || 0) >= cap) capped.add(adv);
    }
  } catch (err) {
    console.error('[getCappedAdvertiserIds] failed, serving uncapped:', err);
  }
  return capped;
}

/**
 * Per-campaign daily click cap: campaigns whose OWN dailyClickCap (>0) is already hit today.
 * Used for OnlyFans creators (and any single ad) where the cap is the campaign's, not the advertiser's.
 */
async function getCappedCampaignIds(): Promise<Set<string>> {
  const capped = new Set<string>();
  try {
    const startOfDayUTC = new Date();
    startOfDayUTC.setUTCHours(0, 0, 0, 0);
    const cappedCampaigns = await Campaign.find({ dailyClickCap: { $gt: 0 } }).select('_id dailyClickCap').lean();
    if (cappedCampaigns.length === 0) return capped;
    const capMap = new Map<string, number>();
    for (const c of cappedCampaigns as any[]) capMap.set(c._id.toString(), c.dailyClickCap);
    const clicks = await CampaignClick.aggregate([
      { $match: { clickedAt: { $gte: startOfDayUTC }, campaignId: { $in: cappedCampaigns.map((c: any) => c._id) } } },
      { $group: { _id: '$campaignId', n: { $sum: 1 } } },
    ]);
    const todayByCamp = new Map<string, number>();
    for (const row of clicks as any[]) todayByCamp.set(row._id.toString(), row.n);
    for (const [id, cap] of capMap) {
      if ((todayByCamp.get(id) || 0) >= cap) capped.add(id);
    }
  } catch (err) {
    console.error('[getCappedCampaignIds] failed, serving uncapped:', err);
  }
  return capped;
}

export async function getActiveFeedCampaigns(placement: 'groups' | 'bots' | 'ainsfw') {
  const { unstable_noStore } = await import('next/cache');
  unstable_noStore();

  await connectDB();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [cappedAdvertisers, cappedCampaigns] = await Promise.all([
    getCappedAdvertiserIds(),
    getCappedCampaignIds(),
  ]);

  const allCampaigns = await Campaign.find({
    slot: 'feed',
    status: 'active',
    isVisible: true,
    startDate: { $lte: now },
    endDate: { $gte: startOfToday },
    feedTier: 1,
    // Include legacy tierSlot 1-5, any named-placement campaign, OR a no-location feed ad
    // (no tierSlot and empty placements) which defaults to the repeating in-feed slot.
    $and: [
      {
        $or: [
          { tierSlot: { $gte: 1, $lte: 5 } },
          { placements: { $exists: true, $ne: [] } },
          { tierSlot: null, placements: { $in: [null, []] } },
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
    .select('_id creative destinationUrl slot feedTier tierSlot position description category country buttonText name feedPlacement videoUrl badgeText verified adType premiumCategory premiumGroupIds socialProof ofUsername placements advertiserId priority')
    .lean();

  // Daily caps: drop campaigns whose advertiser OR whose own campaign cap is hit today.
  const campaigns = (cappedAdvertisers.size === 0 && cappedCampaigns.size === 0)
    ? allCampaigns
    : allCampaigns.filter((c: any) =>
        !cappedCampaigns.has(c._id.toString()) &&
        (!c.advertiserId || !cappedAdvertisers.has(c.advertiserId.toString())),
      );

  // Compatibility read layer: a campaign's effective slots = ALL its named placements (if set), else its legacy tierSlot.
  // EMPTY placements → legacy tierSlot used as-is, so existing campaigns behave identically.
  // A multi-placement campaign (e.g. assigned to top-groups-1 AND feed-2/3/4) must appear in EVERY
  // slot it targets — not just the first — so one advertiser can blast across the whole feed.
  const { placementToTierSlot, tierSlotToPlacement } = await import('@/lib/adPlacements');
  const effectiveTierSlots = (c: any): number[] => {
    const pls: string[] = Array.isArray(c.placements) ? c.placements : [];
    if (pls.length > 0) {
      // Named placements are authoritative. Resolve ONLY the ones that map to a feed slot.
      // If NONE map to a feed slot (e.g. a banner/CTA-only campaign), return [] so it does
      // NOT leak into the feed — it will be served by its own surface (getActiveCampaigns /
      // getPlacementFeedCampaigns) instead. No fallback to slot 4 for placement campaigns.
      const slots = new Set<number>();
      for (const p of pls) {
        const ts = placementToTierSlot(p);
        if (ts != null) slots.add(ts);
      }
      return [...slots];
    }
    if (c.tierSlot != null) return [c.tierSlot];
    // Pure-legacy ad with no placement AND no tierSlot → default to the repeating in-feed slot.
    return [4];
  };

  // Group by effective tierSlot (1-10) for A/B variant selection. A campaign can land in several slots.
  const slotGroups = new Map<number, any[]>();
  for (const c of campaigns) {
    for (const ts of effectiveTierSlots(c)) {
      if (!slotGroups.has(ts)) slotGroups.set(ts, []);
      slotGroups.get(ts)!.push(c);
    }
  }

  // For onlyfans-creator campaigns: one query to get stats + lastSeen, plus the live schedule
  // from the TrendingOFCreator rail so the LIVE green dot reflects what the admin set.
  const ofUsernames = campaigns
    .filter((c: any) => c.adType === 'onlyfans-creator' && c.ofUsername)
    .map((c: any) => (c.ofUsername as string).toLowerCase());
  const ofCreatorMap = new Map<string, { likesCount: number; subscriberCount: number; lastSeen: string; liveHourStart: number; liveHourEnd: number; liveOnly: boolean; album: string[] }>();
  if (ofUsernames.length > 0) {
    const [ofDocs, trendingDocs] = await Promise.all([
      OnlyFansCreator.find({ username: { $in: ofUsernames } }, 'username lastSeen likesCount subscriberCount avatar extraPhotos').lean(),
      TrendingOFCreator.find({ username: { $in: ofUsernames } }, 'username liveHourStart liveHourEnd liveOnly pausedImageUrls').lean(),
    ]);
    const liveMap = new Map<string, { liveHourStart: number; liveHourEnd: number; liveOnly: boolean; pausedImageUrls: string[] }>();
    for (const t of trendingDocs as any[]) {
      liveMap.set(String(t.username).toLowerCase(), { liveHourStart: t.liveHourStart ?? -1, liveHourEnd: t.liveHourEnd ?? -1, liveOnly: t.liveOnly ?? false, pausedImageUrls: t.pausedImageUrls ?? [] });
    }
    for (const d of ofDocs as any[]) {
      const live = liveMap.get(d.username.toLowerCase());
      const paused = new Set<string>(live?.pausedImageUrls ?? []);
      const album = [d.avatar, ...((d.extraPhotos as string[]) || [])].filter(Boolean).filter((u) => !paused.has(u));
      ofCreatorMap.set(d.username.toLowerCase(), {
        likesCount: d.likesCount || 0,
        subscriberCount: d.subscriberCount || 0,
        lastSeen: d.lastSeen || '',
        liveHourStart: live?.liveHourStart ?? -1,
        liveHourEnd: live?.liveHourEnd ?? -1,
        liveOnly: live?.liveOnly ?? false,
        album,
      });
    }
  }

  // Slots 1-3: pick one random variant (A/B test).
  // Slot 4: return ALL active campaigns so the frontend can cycle through them as the user scrolls.
  // Slot 5: Featured Bot — pick one random variant (shown at position 5 in groups feed).
  // Slot 6: Top Groups Spot 1 (reachable via named placement top-groups-1).
  const results: any[] = [];
  for (let s = 1; s <= 11; s++) {
    const variants = slotGroups.get(s);
    if (!variants || variants.length === 0) continue;

    // AGNOSTIC SLOT LAW (brain: versatile-slots / ad-vision): EVERY ad assigned to a slot
    // is returned so the client rotates through ALL of them. Boosted ads are NOT exclusive —
    // they're listed first so the client weights them heavier (more visibility), but
    // non-boosted ads in the same slot still rotate in. If one advertiser/agency puts 5
    // creators in a slot, all 5 rotate. No collapsing, no one-per-advertiser.
    const boosted = variants.filter((v: any) => v.priority === 'boost');
    const orderedAll = boosted.length > 0
      ? [...boosted, ...variants.filter((v: any) => v.priority !== 'boost')]
      : variants;
    const picks = orderedAll;
    for (const pick of picks) {
      const ofData = (pick as any).adType === 'onlyfans-creator'
        ? ofCreatorMap.get(((pick as any).ofUsername || '').toLowerCase())
        : undefined;
      // liveOnly creators that are currently offline free their slot — skip them entirely.
      if (ofData && ofData.liveOnly && !isOfCreatorLiveNow(ofData.liveHourStart, ofData.liveHourEnd)) continue;
      results.push({
        _id: pick._id.toString(),
        creative: pick.creative,
        destinationUrl: pick.destinationUrl,
        slot: pick.slot,
        position: s,
        // Effective tierSlot: GroupsClient reads tierSlot 1/5/6 for Top Groups spots.
        tierSlot: s,
        // Canonical placement for THIS slot (top-groups-1..4 / top-bots-1..4 / feed-2..4 / feed-5).
        // Stamped here from the authoritative map so the click tracker never has to re-guess.
        // This is what makes Top Groups / Top Bots show as their own dashboard lines.
        placement: tierSlotToPlacement(s) || undefined,
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
        ofUsername: (pick as any).ofUsername || '',
        priority: (pick as any).priority === 'boost' ? 'boost' : 'normal',
        advertiserId: pick.advertiserId ? pick.advertiserId.toString() : null,
        ...(ofData ? {
          ofLikesCount: ofData.likesCount,
          ofSubscriberCount: ofData.subscriberCount,
          ofIsLive: ofData.lastSeen ? (Date.now() - new Date(ofData.lastSeen).getTime() < 3600000) : false,
          ofLiveHourStart: ofData.liveHourStart,
          ofLiveHourEnd: ofData.liveHourEnd,
          ofLiveOnly: ofData.liveOnly,
          ofAlbum: ofData.album,
        } : {}),
      });
    }
  }

  // For premium campaigns, load top featured groups for their category.
  // Wrapped in try-catch so a failure here never prevents advertiser ads from loading.
  try {
    const premiumCampaigns = results.filter(r => r.adType === 'premium');
    if (premiumCampaigns.length > 0) {
      const toGroupObj = (g: any) => ({
        _id: g._id.toString(),
        name: g.name || '',
        image: g.image || '',
        memberCount: g.memberCount || 0,
        category: g.category || '',
      });

      // Separate campaigns by whether they have hand-picked group IDs
      const handPickedCampaigns = premiumCampaigns.filter(c => {
        const src = campaigns.find((doc: any) => doc._id.toString() === c._id);
        const ids = (src as any)?.premiumGroupIds || [];
        return ids.length > 0;
      });
      const autoCampaigns = premiumCampaigns.filter(c => !handPickedCampaigns.includes(c));

      // Load hand-picked groups by their IDs (preserving selection order)
      const allPickedIds = new Set<string>();
      for (const camp of handPickedCampaigns) {
        const src = campaigns.find((doc: any) => doc._id.toString() === camp._id);
        for (const id of ((src as any)?.premiumGroupIds || [])) allPickedIds.add(id.toString());
      }
      let pickedGroupsMap = new Map<string, any>();
      if (allPickedIds.size > 0) {
        const pickedGroups = await Group.find({
          _id: { $in: [...allPickedIds].map(id => new mongoose.Types.ObjectId(id)) },
          premiumOnly: true,
          status: 'approved',
        })
          .select('_id name image memberCount category')
          .lean();
        for (const g of pickedGroups) pickedGroupsMap.set((g as any)._id.toString(), toGroupObj(g));
      }

      // For auto campaigns, load by category
      const categoryCampaigns = autoCampaigns.filter(c => c.premiumCategory);
      const noCategoryCampaigns = autoCampaigns.filter(c => !c.premiumCategory);
      const categories = [...new Set(categoryCampaigns.map(c => c.premiumCategory))];

      const groupsByCategory: Record<string, any[]> = {};
      await Promise.all(categories.map(async (cat) => {
        const groups = await Group.find({
          premiumOnly: true,
          status: 'approved',
          $or: [
            { category: cat },
            { categories: cat },
            { vaultCategories: cat },
          ],
        })
          .sort({ showOnVaultTeaser: -1, memberCount: -1 })
          .limit(8)
          .select('_id name image memberCount category')
          .lean();
        groupsByCategory[cat] = groups.map(toGroupObj);
      }));

      let allPremiumGroups: any[] = [];
      if (noCategoryCampaigns.length > 0) {
        const groups = await Group.find({ premiumOnly: true, status: 'approved' })
          .sort({ showOnVaultTeaser: -1, memberCount: -1 })
          .limit(8)
          .select('_id name image memberCount category')
          .lean();
        allPremiumGroups = groups.map(toGroupObj);
      }

      for (const r of results) {
        if (r.adType !== 'premium') continue;

        // Check for hand-picked IDs first
        const src = campaigns.find((doc: any) => doc._id.toString() === r._id);
        const pickedIds: string[] = ((src as any)?.premiumGroupIds || []).map((id: any) => id.toString());
        if (pickedIds.length > 0) {
          r.premiumGroups = pickedIds
            .map(id => pickedGroupsMap.get(id))
            .filter(Boolean);
        } else if (r.premiumCategory) {
          r.premiumGroups = groupsByCategory[r.premiumCategory] || [];
        } else {
          r.premiumGroups = allPremiumGroups;
        }
      }
    }
  } catch (err) {
    console.error('[getActiveFeedCampaigns] Failed to load premium groups, continuing without them:', err);
  }

  return results;
}

/**
 * Is an Erogram Premium house ad currently live in the network?
 * The /groups Vault Teaser promo is gated on this so the front end only ever
 * shows what the Ad Network controls (one centralized switch). No live premium
 * campaign → no vault teaser. Toggle it from /admin/ad-network like any ad.
 */
export async function isPremiumHouseAdLive(): Promise<boolean> {
  const { unstable_noStore } = await import('next/cache');
  unstable_noStore();
  await connectDB();
  const now = new Date();
  const count = await Campaign.countDocuments({
    adType: 'premium',
    status: 'active',
    isVisible: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  });
  return count > 0;
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
  const feedCampaigns = await Campaign.find({ slot: { $in: ['feed', 'ainsfw'] } }).select('_id clicks impressions slot').lean();
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
  clicksByDayBySlot?: { date: string; slots: Record<string, number> }[];
  advertiserSlotBreakdown?: { advertiserId: string; advertiserName: string; slots: { slot: string; clicks: number }[] }[];
  featuredGroups?: { groupId: string; name: string; advertiserId: string; advertiserName: string; clickCount: number; lastClickedAt?: string }[];
  /** Whole-network click totals for the selected period, split by store (read-only).
   *  adSpace = sponsor CampaignClicks (this dashboard's existing scope, excl. OF creators);
   *  boost = paid group/bot boosts (entity clickCount); of = OnlyFans creators total.
   *  ofFeatured = paying/featured creators (TrendingClickDaily); ofOrganic = organic profile
   *  clicks (OnlyFansCreator.clicks, lifetime — no per-day breakdown). */
  networkTotals?: { adSpace: number; boost: number; of: number; ofFeatured: number; ofOrganic: number; grandTotal: number };
  /** Per-creator OnlyFans detail (top creators by clicks in the selected period). Only on the
   *  unfiltered network view. ofDetail = featured/trending creators; lifetime view also shows organic. */
  ofDetail?: { name: string; username: string; clicks: number; kind: 'featured' | 'organic' }[];
  /** Per-boost-item detail (each boosted group/bot, individually). Only on the unfiltered network view. */
  boostDetail?: { name: string; entityType: 'group' | 'bot'; clicks: number }[];
}

/** Admin: full dashboard stats with filters (advertiser, slot, date range). For Overview charts and KPIs. */
/**
 * Normalize a raw click placement (+ campaign slot fallback) into a friendly ad-space bucket
 * for the Advertiser Overview. Keeps the in-feed positions collapsed into one "In-Feed" line,
 * surfaces each Top Groups / Top Bots / AI NSFW / Top-10 / sidebar space as its own line, and
 * groups all article CTA/link clicks. Older clicks with no placement fall back to the slot.
 */
function normalizeAdSpace(placement?: string | null, slot?: string | null): string {
  const p = (placement || '').trim();
  if (p) {
    if (p.startsWith('article:')) return 'article-link';
    // Top-tier families: roll the 4 spots up into ONE line each so the Overview matches the
    // owner's mental model (Top Groups / Top Bots as a single family). Spot-level detail lives
    // in the detailed-tracking drill, not the Overview.
    if (p.startsWith('top-groups-') || p === 'top-groups') return 'top-groups';
    if (p.startsWith('top-bots-') || p === 'top-bots') return 'top-bots';
    if (p.startsWith('feed')) return 'feed';          // feed-2/3/4/5 → In-Feed
    if (p === 'ainsfw-featured') return 'ainsfw-featured';
    // 4-ad BLOCKS, tracked per host page so each block's performance is visible separately.
    if (p.startsWith('group-sidebar')) return p;      // group-sidebar / -groups / -bots / -ainsfw
    if (p === 'best-of' || p === 'best-groups' || p === 'of-cat') return p;
    if (p === 'feed') return 'feed';
    return p; // any other named placement keeps its name
  }
  // No placement on the click (legacy rows): fall back to the campaign slot.
  const s = (slot || '').trim();
  return s || 'feed';
}

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
  // If the user explicitly picked ad spaces but NONE of them are campaign slots (e.g. only
  // "Featured Groups", which is an entity store, not a Campaign), match ZERO campaigns so the
  // view shows only featured-group clicks — not the whole network's campaign clicks.
  const onlyNonCampaignSlots = !!slots?.length && (!campaignSlots || campaignSlots.length === 0);
  const campaigns = (onlyNonCampaignSlots
    ? []
    : await Campaign.find(campaignMatch).select('_id advertiserId slot clicks').lean()) as any[];
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
      // Featured groups track clicks on the entity (clickCount), which is LIFETIME only — there is
      // no per-day store. Surface that lifetime total as the KPI so the view never shows 0 clicks
      // when featured groups clearly have clicks.
      kpis.totalClicks = fgTotal;
      kpis.last30d = fgTotal;
      kpis.last7d = 0;
      kpis.todayClicks = 0;
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
      // Group by the REAL placement the click was tagged with (top-groups-1, top-bots-2,
      // ainsfw-featured, best-of, group-sidebar, article CTA…), falling back to the campaign
      // slot when a click has no placement (older rows). Normalized to friendly buckets in JS.
      { $group: { _id: { placement: '$placement', slot: '$camp.slot' }, clicks: { $sum: 1 } } },
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

  // Per-day per-slot breakdown
  let clicksByDayBySlot: { date: string; slots: Record<string, number> }[] | undefined;
  {
    const daySlotRows = await CampaignClick.aggregate([
      { $match: matchInRange },
      { $lookup: { from: 'campaigns', localField: 'campaignId', foreignField: '_id', as: 'camp' } },
      { $unwind: '$camp' },
      { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$clickedAt' } }, slot: '$camp.slot' }, clicks: { $sum: 1 } } },
      { $sort: { '_id.date': 1 } },
    ]);
    const daySlotMap = new Map<string, Record<string, number>>();
    for (const r of daySlotRows as any[]) {
      const date = r._id.date as string;
      const slot = r._id.slot as string;
      if (!daySlotMap.has(date)) daySlotMap.set(date, {});
      daySlotMap.get(date)![slot] = r.clicks;
    }
    clicksByDayBySlot = clicksByDay.map((d) => ({
      date: d.date,
      slots: daySlotMap.get(d.date) || {},
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

  // Bucket clicks by REAL ad space (normalized placement), not the coarse campaign slot.
  // This splits the old inflated "In-Feed" blob into Top Groups / Top Bots / AI NSFW / Top-10 /
  // sidebar lines while keeping the in-feed positions grouped as one "In-Feed".
  const bySlotAgg = new Map<string, number>();
  for (const r of bySlotRows as any[]) {
    const space = normalizeAdSpace(r._id?.placement, r._id?.slot);
    bySlotAgg.set(space, (bySlotAgg.get(space) ?? 0) + (r.clicks as number));
  }
  const bySlot = Array.from(bySlotAgg.entries())
    .map(([slot, totalClicks]) => ({
      slot,
      totalClicks,
      campaignCount: campaigns.filter((c: any) => c.slot === slot).length,
    }))
    .sort((a, b) => b.totalClicks - a.totalClicks);

  const articleClicksByAdvertiser = await getArticleClicksByAdvertiser(advertiserIds);

  // ── WHOLE-NETWORK TOTALS (read-only, additive) ──
  // Stores, never mixed:
  //   adSpace    = sponsor CampaignClicks in range, EXCLUDING onlyfans-creator campaigns
  //   boost      = paid group/bot boost clicks in range (entity clickCountByDay)
  //   ofFeatured = PAYING/featured creators (TrendingClickDaily, date-rangeable)
  //   ofOrganic  = organic creator profile clicks (OnlyFansCreator.clicks; lifetime only — no
  //                per-day data, so only counted on the Lifetime range to avoid faking dates)
  //   of         = ofFeatured + ofOrganic + OF-creator CampaignClicks
  // Only computed for the unfiltered "all advertisers" view so the headline reflects the network.
  let networkTotals: { adSpace: number; boost: number; of: number; ofFeatured: number; ofOrganic: number; grandTotal: number } | undefined;
  let ofDetail: { name: string; username: string; clicks: number; kind: 'featured' | 'organic' }[] | undefined;
  let boostDetail: { name: string; entityType: 'group' | 'bot'; clicks: number }[] | undefined;
  if (!advertiserIds?.length && !slots?.length) {
    const rangeStartDay = rangeStart.toISOString().slice(0, 10);
    const rangeEndDay = rangeEnd.toISOString().slice(0, 10);

    // OF-creator campaign ids (to split them out of the sponsor ad-space total)
    const ofCampaignIds = (await Campaign.find({ adType: 'onlyfans-creator' }).select('_id').lean() as any[])
      .map((c) => c._id);
    const ofCampaignIdSet = new Set(ofCampaignIds.map((id) => id.toString()));

    const [ofCampaignClicks, ofTrendingRows, ofOrganicRows, boostGroups, boostBots] = await Promise.all([
      // OF-creator clicks that came through the Campaign/AdvertCard path
      CampaignClick.countDocuments({
        campaignId: { $in: ofCampaignIds },
        ...(isLifetime ? {} : { clickedAt: { $gte: rangeStart, $lte: rangeEnd } }),
      }),
      // Featured/paying OF creator clicks via the trending path (read-only — never modify OF)
      TrendingClickDaily.aggregate([
        ...(isLifetime ? [] : [{ $match: { date: { $gte: rangeStartDay, $lte: rangeEndDay } } }]),
        { $group: { _id: null, clicks: { $sum: '$clicks' } } },
      ]),
      // Organic profile clicks — OnlyFansCreator.clicks has NO date breakdown, so only on Lifetime.
      isLifetime
        ? OnlyFansCreator.aggregate([{ $group: { _id: null, clicks: { $sum: '$clicks' } } }])
        : Promise.resolve([] as any[]),
      // Boosted groups — period clicks from clickCountByDay (fallback to lifetime clickCount)
      Group.find({ boosted: true }).select('name clickCount clickCountByDay').lean(),
      Bot.find({ boosted: true }).select('name clickCount clickCountByDay').lean(),
    ]);

    const sumDayMap = (entities: any[]): number => {
      let total = 0;
      for (const e of entities) {
        const m = e.clickCountByDay;
        if (m && (isLifetime ? false : true)) {
          // Map may come back as a plain object from .lean()
          const entries: [string, number][] = m instanceof Map ? Array.from(m.entries()) : Object.entries(m);
          for (const [day, n] of entries) {
            if (isLifetime || (day >= rangeStartDay && day <= rangeEndDay)) total += Number(n) || 0;
          }
        } else if (isLifetime) {
          total += e.clickCount || 0;
        }
      }
      return total;
    };

    const boostTotal = sumDayMap(boostGroups as any[]) + sumDayMap(boostBots as any[]);
    const ofFeatured = ((ofTrendingRows as any[])[0]?.clicks || 0) + ofCampaignClicks;
    const ofOrganic = (ofOrganicRows as any[])[0]?.clicks || 0;
    const ofTotal = ofFeatured + ofOrganic;

    // Sponsor ad-space total = clicks in range on non-OF campaigns
    const adSpaceTotal = (await CampaignClick.countDocuments({
      campaignId: { $in: campaignIds.filter((id) => !ofCampaignIdSet.has(id.toString())) },
      ...(isLifetime ? {} : { clickedAt: { $gte: rangeStart, $lte: rangeEnd } }),
    }));

    networkTotals = {
      adSpace: adSpaceTotal,
      boost: boostTotal,
      of: ofTotal,
      ofFeatured,
      ofOrganic,
      grandTotal: adSpaceTotal + boostTotal + ofTotal,
    };

    // ── Per-creator OF detail (top by clicks) ──
    // Featured/trending creators are date-rangeable via TrendingClickDaily; on Lifetime we rank
    // by all-time creator clicks. Each creator tracked INDIVIDUALLY, as requested.
    try {
      if (isLifetime) {
        const topCreators = await OnlyFansCreator.find({ clicks: { $gt: 0 } })
          .select('name username clicks featured').sort({ clicks: -1 }).limit(50).lean() as any[];
        ofDetail = topCreators.map((c) => ({
          name: c.name || c.username, username: c.username || '',
          clicks: c.clicks || 0, kind: c.featured ? 'featured' : 'organic',
        }));
      } else {
        const rows = await TrendingClickDaily.aggregate([
          { $match: { date: { $gte: rangeStartDay, $lte: rangeEndDay } } },
          { $group: { _id: '$trendingId', clicks: { $sum: '$clicks' } } },
          { $sort: { clicks: -1 } }, { $limit: 50 },
        ]);
        const ids = (rows as any[]).map((r) => r._id).filter(Boolean);
        const creators = ids.length
          ? await TrendingOFCreator.find({ _id: { $in: ids } }).select('name username').lean() as any[]
          : [];
        const cmap = new Map(creators.map((c: any) => [c._id.toString(), c]));
        ofDetail = (rows as any[]).map((r) => {
          const c = cmap.get(String(r._id));
          return { name: c?.name || c?.username || 'Creator', username: c?.username || '', clicks: r.clicks, kind: 'featured' as const };
        }).filter((r) => r.clicks > 0);
      }
    } catch { ofDetail = undefined; }

    // ── Per-boost-item detail (each boosted group/bot individually) ──
    try {
      const periodClicks = (e: any): number => {
        const m = e.clickCountByDay;
        if (!isLifetime && m) {
          const entries: [string, number][] = m instanceof Map ? Array.from(m.entries()) : Object.entries(m);
          let t = 0;
          for (const [day, n] of entries) if (day >= rangeStartDay && day <= rangeEndDay) t += Number(n) || 0;
          return t;
        }
        return e.clickCount || 0;
      };
      const gRows = (boostGroups as any[]).map((g) => ({ name: g.name || 'Group', entityType: 'group' as const, clicks: periodClicks(g) }));
      const bRows = (boostBots as any[]).map((b) => ({ name: b.name || 'Bot', entityType: 'bot' as const, clicks: periodClicks(b) }));
      boostDetail = [...gRows, ...bRows].filter((r) => r.clicks > 0).sort((a, b) => b.clicks - a.clicks).slice(0, 50);
    } catch { boostDetail = undefined; }

    // Fold OnlyFans and Boosts into the advertiser breakdown as synthetic rows so the
    // Advertisers view reflects the WHOLE Erogram ecosystem, not just CampaignClick sponsors.
    // OWNER RULING: featured/promoted creators = paid clients; ALL their clicks count.
    if (ofTotal > 0) {
      byAdvertiser.unshift({
        advertiserId: '__onlyfans__',
        advertiserName: 'OnlyFans (all creators)',
        totalClicks: ofTotal,
        last7d: 0,
        last30d: 0,
      });
    }
    if (boostTotal > 0) {
      byAdvertiser.unshift({
        advertiserId: '__boosts__',
        advertiserName: 'Boosts (groups & bots)',
        totalClicks: boostTotal,
        last7d: 0,
        last30d: 0,
      });
    }
  }

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
    clicksByDayBySlot,
    advertiserSlotBreakdown,
    featuredGroups,
    networkTotals,
    ofDetail,
    boostDetail,
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
