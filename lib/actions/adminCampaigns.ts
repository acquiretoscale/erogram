'use server';

import { revalidatePath } from 'next/cache';
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

const TEXT_ONLY_SLOTS = ['navbar-cta', 'join-cta', 'filter-cta'];

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
  });
  revalidatePublicFeeds();
  return result;
}

export async function adminUpdateCampaign(token: string, id: string, body: Record<string, any>) {
  if (body.slot && TEXT_ONLY_SLOTS.includes(body.slot)) {
    body.creative = '';
  }
  const updated = await updateCampaign(token, id, body);
  revalidatePublicFeeds();
  return updated;
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
  params: { advertiserIds?: string; slots?: string; range?: string; from?: string; to?: string },
) {
  const filters: DashboardFilters = {
    advertiserIds: params.advertiserIds ? params.advertiserIds.split(',').filter(Boolean) : undefined,
    slots: params.slots ? params.slots.split(',').filter(Boolean) : undefined,
    range: (['today', '7d', '30d', 'custom', 'lifetime'].includes(params.range || '') ? params.range : '30d') as DashboardFilters['range'],
    from: params.from,
    to: params.to,
  };
  return getDashboardStats(token, filters);
}
