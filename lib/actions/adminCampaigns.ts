'use server';

import jwt from 'jsonwebtoken';
import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/db/mongodb';
import { User, Group } from '@/lib/models';
import {
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaigns,
  getSlotCapacity,
  getFeedTierCapacity,
  getGlobalClickStats,
  getSlotClickTotals,
  getClicksByAdvertiser,
  getFeedCampaignClickStats,
  getFeedABStats,
  getDashboardStats,
  type DashboardFilters,
} from '@/lib/actions/campaigns';
import { getAdvertisers } from '@/lib/actions/advertisers';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const TEXT_ONLY_SLOTS = ['navbar-cta', 'join-cta', 'filter-cta'];

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

function revalidatePublicFeeds() {
  revalidatePath('/groups');
  revalidatePath('/groups/country/[country]', 'page');
  revalidatePath('/bots');
}

export async function adminCreateCampaign(token: string, body: Record<string, any>) {
  const slot = typeof body.slot === 'string' ? body.slot.trim().toLowerCase() : body.slot;
  const isCtaSlot = TEXT_ONLY_SLOTS.includes(slot);
  const desc = (body.description != null ? String(body.description).trim() : '') ||
    (body.buttonText != null ? String(body.buttonText).trim() : '') || 'Visit Site';

  const result = await createCampaign(token, {
    advertiserId: body.advertiserId != null ? String(body.advertiserId).trim() : '',
    name: body.name != null ? String(body.name).trim() : '',
    internalName: body.internalName != null ? String(body.internalName).trim() : '',
    slot,
    creative: isCtaSlot ? '' : (body.creative ?? ''),
    destinationUrl: body.destinationUrl != null ? String(body.destinationUrl).trim() : '',
    startDate: body.startDate != null ? String(body.startDate) : '',
    endDate: body.endDate != null ? String(body.endDate) : '',
    status: body.status ?? 'active',
    isVisible: body.isVisible !== false,
    position: body.position ?? null,
    feedTier: body.feedTier ?? null,
    tierSlot: body.tierSlot ?? null,
    description: isCtaSlot ? desc : (body.description != null ? String(body.description).trim() : ''),
    category: body.category ?? 'All',
    country: body.country ?? 'All',
    buttonText: isCtaSlot ? desc : (body.buttonText != null ? String(body.buttonText).trim() : 'Visit Site'),
    feedPlacement: body.feedPlacement ?? undefined,
    videoUrl: body.videoUrl ?? undefined,
    badgeText: body.badgeText ?? undefined,
    verified: body.verified ?? undefined,
    adType: body.adType ?? undefined,
    premiumCategory: body.premiumCategory ?? undefined,
    premiumGroupIds: body.premiumGroupIds ?? undefined,
    socialProof: body.socialProof ?? undefined,
    bannerPages: body.bannerPages ?? undefined,
    bannerDevice: body.bannerDevice ?? undefined,
    ofUsername: body.ofUsername ?? undefined,
  });
  revalidatePublicFeeds();
  return result;
}

export async function adminUpdateCampaign(token: string, id: string, body: Record<string, any>) {
  if (body.slot && TEXT_ONLY_SLOTS.includes(body.slot)) {
    body.creative = '';
  }
  const doc = await updateCampaign(token, id, body);
  revalidatePublicFeeds();
  if (!doc) return null;
  const c = doc as any;
  return {
    _id: c._id?.toString?.() ?? String(c._id),
    advertiserId: c.advertiserId?.toString?.() ?? '',
    name: c.name ?? '',
    internalName: c.internalName ?? '',
    slot: c.slot ?? '',
    creative: c.creative ?? '',
    destinationUrl: c.destinationUrl ?? '',
    startDate: c.startDate instanceof Date ? c.startDate.toISOString() : (c.startDate ?? ''),
    endDate: c.endDate instanceof Date ? c.endDate.toISOString() : (c.endDate ?? ''),
    status: c.status ?? 'active',
    isVisible: c.isVisible !== false,
    impressions: c.impressions ?? 0,
    clicks: c.clicks ?? 0,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : (c.createdAt ?? ''),
    position: c.position ?? null,
    feedTier: c.feedTier ?? null,
    tierSlot: c.tierSlot ?? null,
    description: c.description ?? '',
    category: c.category ?? 'All',
    country: c.country ?? 'All',
    buttonText: c.buttonText ?? 'Visit Site',
    feedPlacement: c.feedPlacement ?? 'both',
    videoUrl: c.videoUrl ?? '',
    badgeText: c.badgeText ?? '',
    verified: Boolean(c.verified),
    adType: c.adType ?? 'advertiser',
    premiumCategory: c.premiumCategory ?? '',
    premiumGroupIds: (c.premiumGroupIds || []).map((id: any) => id?.toString?.() ?? String(id)),
    socialProof: c.socialProof ?? 'random',
    bannerPages: c.bannerPages ?? [],
    bannerDevice: c.bannerDevice ?? 'all',
    ofUsername: c.ofUsername ?? '',
  };
}

export async function adminDeleteCampaign(token: string, id: string) {
  await deleteCampaign(token, id);
  revalidatePublicFeeds();
  return { success: true };
}

export async function getAdvertisersDashboard(token: string) {
  const [advertisers, campaigns, slots, feedTierCapacity, globalStats, slotTotals, clicksByAdvertiser, feedClickStats, feedABStats] = await Promise.all([
    getAdvertisers(token),
    getCampaigns(token),
    getSlotCapacity(token),
    getFeedTierCapacity(token),
    getGlobalClickStats(token).catch(() => ({ totalClicks: 0, todayClicks: 0, last24h: 0, last7Days: 0, last30Days: 0 })),
    getSlotClickTotals(token).catch(() => []),
    getClicksByAdvertiser(token).catch(() => []),
    getFeedCampaignClickStats(token).catch(() => ({})),
    getFeedABStats(token).catch(() => ({})),
  ]);
  return {
    advertisers,
    campaigns,
    slots,
    feedTierCapacity,
    globalStats,
    slotTotals,
    clicksByAdvertiser,
    feedClickStats,
    feedABStats,
  };
}

export async function getAdvertiserDashboardStats(
  token: string,
  params: { advertiserIds?: string | string[]; slots?: string | string[]; range?: string; from?: string; to?: string },
) {
  const toArr = (v?: string | string[]) => Array.isArray(v) ? v.filter(Boolean) : v ? v.split(',').filter(Boolean) : undefined;
  const filters: DashboardFilters = {
    advertiserIds: toArr(params.advertiserIds),
    slots: toArr(params.slots),
    range: (['today', '7d', '30d', 'custom', 'lifetime'].includes(params.range || '') ? params.range : '30d') as DashboardFilters['range'],
    from: params.from,
    to: params.to,
  };
  return getDashboardStats(token, filters);
}

export async function getTopGroupSlots(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const groups = await Group.find({ topGroupSlot: { $in: [1, 2] } })
    .select('name slug image topGroupSlot views weeklyClicks clickCount category')
    .lean();

  return groups.map((g: any) => ({
    _id: g._id.toString(),
    name: g.name,
    slug: g.slug,
    image: g.image,
    topGroupSlot: g.topGroupSlot,
    views: g.views || 0,
    weeklyClicks: g.weeklyClicks || 0,
    clickCount: g.clickCount || 0,
    category: g.category || '',
  }));
}

export async function setTopGroupSlot(token: string, groupId: string, slot: 1 | 2) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  await Group.updateMany({ topGroupSlot: slot }, { $set: { topGroupSlot: null } }, { strict: false });
  await Group.findByIdAndUpdate(groupId, { $set: { topGroupSlot: slot } }, { strict: false });
  revalidatePublicFeeds();
  return { success: true };
}

export async function clearTopGroupSlot(token: string, slot: 1 | 2) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  await Group.updateMany({ topGroupSlot: slot }, { $set: { topGroupSlot: null } });
  revalidatePublicFeeds();
  return { success: true };
}

export async function searchGroupsForTopSlot(token: string, query: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const groups = await Group.find({
    status: 'approved',
    isAdvertisement: { $ne: true },
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { slug: { $regex: query, $options: 'i' } },
    ],
  })
    .select('name slug image category views')
    .limit(10)
    .lean();

  return groups.map((g: any) => ({
    _id: g._id.toString(),
    name: g.name,
    slug: g.slug,
    image: g.image,
    category: g.category || '',
    views: g.views || 0,
  }));
}
