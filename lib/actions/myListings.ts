'use server';

import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { Group, Bot } from '@/lib/models';
import { getR2PublicUrl } from '@/lib/r2';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

function resolveImage(stored: string | undefined): string {
  const placeholder = '/assets/placeholder-no-image.png';
  if (!stored || typeof stored !== 'string') return placeholder;
  if (stored.startsWith('https://') || stored.startsWith('/')) return stored;
  const r2 = getR2PublicUrl();
  if (r2) return `${r2.replace(/\/$/, '')}/${stored}`;
  return placeholder;
}

async function getAuthUserId(): Promise<string | null> {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as any;
    return decoded?.id || null;
  } catch {
    return null;
  }
}

export interface ListingItem {
  _id: string;
  type: 'group' | 'bot' | 'ainsfw';
  name: string;
  slug: string;
  image: string;
  telegramLink: string;
  status: string;
  category: string;
  views: number;
  clickCount: number;
  boosted: boolean;
  boostExpiresAt: string | null;
  boostDuration: string | null;
  paidBoost: boolean;
  paidBoostStars: number | null;
  contactTelegram: string;
  contactEmail: string;
  createdAt: string;
}

export async function getMyListings(token: string): Promise<{ listings: ListingItem[]; error?: string }> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded?.id) return { listings: [], error: 'Invalid token' };

    await connectDB();

    const userId = decoded.id;

    const [groups, bots] = await Promise.all([
      Group.find({ createdBy: userId, status: { $ne: 'deleted' } })
        .select('name slug image telegramLink status category views clickCount boosted boostExpiresAt boostDuration paidBoost paidBoostStars contactTelegram contactEmail createdAt')
        .sort({ createdAt: -1 })
        .lean(),
      Bot.find({ createdBy: userId })
        .select('name slug image telegramLink status category views clickCount boosted boostExpiresAt boostDuration paidBoost paidBoostStars contactTelegram contactEmail createdAt')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const listings: ListingItem[] = [
      ...(groups as any[]).map((g) => ({
        _id: g._id.toString(),
        type: 'group' as const,
        name: g.name,
        slug: g.slug,
        image: resolveImage(g.image),
        telegramLink: g.telegramLink || '',
        status: g.status,
        category: g.category || '',
        views: g.views || 0,
        clickCount: g.clickCount || 0,
        boosted: g.boosted || false,
        boostExpiresAt: g.boostExpiresAt ? g.boostExpiresAt.toISOString() : null,
        boostDuration: g.boostDuration || null,
        paidBoost: g.paidBoost || false,
        paidBoostStars: g.paidBoostStars || null,
        contactTelegram: g.contactTelegram || '',
        contactEmail: g.contactEmail || '',
        createdAt: g.createdAt?.toISOString?.() || new Date().toISOString(),
      })),
      ...(bots as any[]).map((b) => ({
        _id: b._id.toString(),
        type: 'bot' as const,
        name: b.name,
        slug: b.slug,
        image: resolveImage(b.image),
        telegramLink: b.telegramLink || '',
        status: b.status,
        category: b.category || '',
        views: b.views || 0,
        clickCount: b.clickCount || 0,
        boosted: b.boosted || false,
        boostExpiresAt: b.boostExpiresAt ? b.boostExpiresAt.toISOString() : null,
        boostDuration: b.boostDuration || null,
        paidBoost: b.paidBoost || false,
        paidBoostStars: b.paidBoostStars || null,
        contactTelegram: b.contactTelegram || '',
        contactEmail: b.contactEmail || '',
        createdAt: b.createdAt?.toISOString?.() || new Date().toISOString(),
      })),
    ];

    listings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { listings };
  } catch {
    return { listings: [], error: 'Authentication failed' };
  }
}

export async function getMyListingsSummary(token: string): Promise<{
  hasListings: boolean;
  inReviewCount: number;
  hasPaidCampaign: boolean;
}> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded?.id) return { hasListings: false, inReviewCount: 0, hasPaidCampaign: false };

    await connectDB();
    const userId = decoded.id;
    const now = new Date();

    const reviewFilter = { createdBy: userId, status: 'pending', paidBoost: { $ne: true } };
    const paidFilter = {
      createdBy: userId,
      $or: [{ paidBoost: true }, { boostExpiresAt: { $gt: now } }],
    };

    const [gTotal, bTotal, gReview, bReview, gPaid, bPaid] = await Promise.all([
      Group.countDocuments({ createdBy: userId, status: { $ne: 'deleted' } }),
      Bot.countDocuments({ createdBy: userId }),
      Group.countDocuments(reviewFilter),
      Bot.countDocuments(reviewFilter),
      Group.countDocuments(paidFilter),
      Bot.countDocuments(paidFilter),
    ]);

    return {
      hasListings: gTotal + bTotal > 0,
      inReviewCount: gReview + bReview,
      hasPaidCampaign: gPaid + bPaid > 0,
    };
  } catch {
    return { hasListings: false, inReviewCount: 0, hasPaidCampaign: false };
  }
}

export async function updateListingDetails(
  token: string,
  listingId: string,
  listingType: 'group' | 'bot',
  updates: { telegramLink?: string; image?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded?.id) return { success: false, error: 'Invalid token' };

    await connectDB();

    const Model = listingType === 'group' ? Group : Bot;
    const item = await Model.findOne({ _id: listingId, createdBy: decoded.id });
    if (!item) return { success: false, error: 'Listing not found or access denied' };

    // Editing link/image is a PAID BOOST perk (advertising), not a free feature
    const boostActive = item.boostExpiresAt && new Date(item.boostExpiresAt) > new Date();
    if (!boostActive && !item.paidBoost) {
      return { success: false, error: 'Boost your listing to edit your link' };
    }

    const updateFields: Record<string, string> = {};
    if (updates.telegramLink && updates.telegramLink.startsWith('https://t.me/')) {
      updateFields.telegramLink = updates.telegramLink;
    }
    if (updates.image && (updates.image.startsWith('https://') || updates.image.startsWith('data:image/'))) {
      updateFields.image = updates.image;
    }

    if (Object.keys(updateFields).length === 0) {
      return { success: false, error: 'No valid fields to update' };
    }

    await Model.updateOne({ _id: listingId }, { $set: updateFields });
    return { success: true };
  } catch {
    return { success: false, error: 'Update failed' };
  }
}

// Renewal pricing: 30% OFF the original boost price
const RENEWAL_DISCOUNT = 0.7;

const RENEWAL_PRICES = {
  group: {
    boost_week: Math.round(2000 * RENEWAL_DISCOUNT),
    boost_month: Math.round(4000 * RENEWAL_DISCOUNT),
  },
  bot: {
    boost_week: Math.round(3000 * RENEWAL_DISCOUNT),
    boost_month: Math.round(6000 * RENEWAL_DISCOUNT),
  },
} as const;

export async function getBoostRenewalInfo(
  token: string,
  listingId: string,
  listingType: 'group' | 'bot'
): Promise<{ canRenew: boolean; prices: Record<string, number>; currentExpiry: string | null; error?: string }> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded?.id) return { canRenew: false, prices: {}, currentExpiry: null, error: 'Invalid token' };

    await connectDB();

    const Model = listingType === 'group' ? Group : Bot;
    const item = await Model.findOne({ _id: listingId, createdBy: decoded.id }).select('boosted boostExpiresAt status').lean() as any;
    if (!item) return { canRenew: false, prices: {}, currentExpiry: null, error: 'Not found' };

    if (item.status !== 'approved') {
      return { canRenew: false, prices: {}, currentExpiry: null, error: 'Listing must be approved first' };
    }

    const prices = RENEWAL_PRICES[listingType];
    return {
      canRenew: true,
      prices,
      currentExpiry: item.boostExpiresAt ? item.boostExpiresAt.toISOString() : null,
    };
  } catch {
    return { canRenew: false, prices: {}, currentExpiry: null, error: 'Failed' };
  }
}
