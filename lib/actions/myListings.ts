'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import jwt from 'jsonwebtoken';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import connectDB from '@/lib/db/mongodb';
import { Group, Bot, User } from '@/lib/models';
import { getR2PublicUrl, isR2Configured } from '@/lib/r2';
import { BOOST_STARS, cryptoUsdFromStars } from '@/lib/boostPricing';
import {
  compressGroupImageBuffer,
  processAndUploadGroupImage,
  processAndUploadBotImage,
} from '@/lib/images/processGroupImage';
import { slugify } from '@/lib/utils/slugify';
import { LOCALES } from '@/lib/i18n/config';

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

async function authenticateAdminToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    if (!decoded?.id) return null;
    await connectDB();
    const user = await User.findById(decoded.id).select('isAdmin').lean() as { isAdmin?: boolean } | null;
    return user?.isAdmin ? decoded.id : null;
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
  description: string;
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
        .select('name slug image telegramLink description status category views clickCount boosted boostExpiresAt boostDuration paidBoost paidBoostStars contactTelegram contactEmail createdAt')
        .sort({ createdAt: -1 })
        .lean(),
      Bot.find({ createdBy: userId, status: { $ne: 'deleted' } })
        .select('name slug image telegramLink description status category views clickCount boosted boostExpiresAt boostDuration paidBoost paidBoostStars contactTelegram contactEmail createdAt')
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
        description: g.description || '',
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
        description: b.description || '',
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
      Bot.countDocuments({ createdBy: userId, status: { $ne: 'deleted' } }),
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

// Renewal uses same USD as Stars equivalent via crypto — see lib/boostPricing.ts

export async function getBoostRenewalInfo(
  token: string,
  listingId: string,
  listingType: 'group' | 'bot'
): Promise<{
  canRenew: boolean;
  starsPrices: { week: number; month: number };
  cryptoPrices: { week: number; month: number };
  currentExpiry: string | null;
  error?: string;
}> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded?.id) {
      return { canRenew: false, starsPrices: { week: 0, month: 0 }, cryptoPrices: { week: 0, month: 0 }, currentExpiry: null, error: 'Invalid token' };
    }

    await connectDB();

    const Model = listingType === 'group' ? Group : Bot;
    const item = await Model.findOne({ _id: listingId, createdBy: decoded.id }).select('boosted boostExpiresAt status').lean() as any;
    if (!item) {
      return { canRenew: false, starsPrices: { week: 0, month: 0 }, cryptoPrices: { week: 0, month: 0 }, currentExpiry: null, error: 'Not found' };
    }

    if (item.status !== 'approved') {
      return { canRenew: false, starsPrices: { week: 0, month: 0 }, cryptoPrices: { week: 0, month: 0 }, currentExpiry: null, error: 'Listing must be approved first' };
    }

    const starsPrices = BOOST_STARS[listingType];
    return {
      canRenew: true,
      starsPrices,
      cryptoPrices: {
        week: cryptoUsdFromStars(starsPrices.week),
        month: cryptoUsdFromStars(starsPrices.month),
      },
      currentExpiry: item.boostExpiresAt ? item.boostExpiresAt.toISOString() : null,
    };
  } catch {
    return { canRenew: false, starsPrices: { week: 0, month: 0 }, cryptoPrices: { week: 0, month: 0 }, currentExpiry: null, error: 'Failed' };
  }
}

function revalidateListingPage(slug: string) {
  try {
    for (const locale of LOCALES) {
      revalidatePath(locale === 'en' ? `/${slug}` : `/${locale}/${slug}`);
    }
  } catch (err) {
    console.error('[MyListings] revalidatePath failed:', err);
  }
}

async function processListingImageDataUrl(
  imageDataUrl: string,
  slug: string,
  listingType: 'group' | 'bot',
): Promise<string> {
  const base64Match = imageDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!base64Match?.[2]) throw new Error('Invalid image');

  const buffer = Buffer.from(base64Match[2], 'base64');
  const safeSlug = slugify(slug).slice(0, 80) || listingType;

  if (isR2Configured()) {
    return listingType === 'group'
      ? processAndUploadGroupImage(buffer, slug)
      : processAndUploadBotImage(buffer, slug);
  }

  const compressed = await compressGroupImageBuffer(buffer);
  const folder = listingType === 'group' ? 'groups' : 'bots';
  const fileName = listingType === 'group'
    ? `${safeSlug}-porn-telegram-group.webp`
    : `${safeSlug}-porn-telegram-bot.webp`;
  const dir = path.join(process.cwd(), 'public', 'uploads', folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), compressed);
  return `/uploads/${folder}/${fileName}`;
}

export async function updateMyApprovedListing(
  token: string,
  listingId: string,
  listingType: 'group' | 'bot',
  updates: { telegramLink?: string; description?: string; imageDataUrl?: string },
): Promise<{ success: boolean; error?: string; image?: string }> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded?.id) return { success: false, error: 'Invalid token' };

    await connectDB();

    const Model = listingType === 'group' ? Group : Bot;
    const isAdmin = await authenticateAdminToken(token);
    const item = isAdmin
      ? await Model.findOne({ _id: listingId })
      : await Model.findOne({ _id: listingId, createdBy: decoded.id });
    if (!item) return { success: false, error: 'Listing not found' };
    if (item.status !== 'approved') return { success: false, error: 'Only approved listings can be edited' };

    const updateFields: Record<string, string> = {};

    if (updates.telegramLink !== undefined) {
      const link = updates.telegramLink.trim();
      if (!link.startsWith('https://t.me/')) {
        return { success: false, error: 'Telegram link must start with https://t.me/' };
      }
      updateFields.telegramLink = link;
    }

    if (updates.description !== undefined) {
      const description = updates.description.trim();
      if (description.length < 30) {
        return { success: false, error: 'Description must be at least 30 characters' };
      }
      updateFields.description = description;
    }

    if (updates.imageDataUrl) {
      updateFields.image = await processListingImageDataUrl(
        updates.imageDataUrl,
        item.slug,
        listingType,
      );
    }

    if (Object.keys(updateFields).length === 0) {
      return { success: false, error: 'No changes to save' };
    }

    await Model.updateOne({ _id: listingId }, { $set: updateFields });
    revalidateListingPage(item.slug);

    return { success: true, image: updateFields.image };
  } catch {
    return { success: false, error: 'Update failed' };
  }
}

export async function deleteMyPendingListing(
  token: string,
  listingId: string,
  listingType: 'group' | 'bot',
): Promise<{ success: boolean; error?: string }> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded?.id) return { success: false, error: 'Invalid token' };

    await connectDB();

    const Model = listingType === 'group' ? Group : Bot;
    const item = await Model.findOne({ _id: listingId, createdBy: decoded.id });
    if (!item) return { success: false, error: 'Listing not found' };
    if (item.status !== 'pending') return { success: false, error: 'Only pending listings can be deleted' };

    await Model.updateOne(
      { _id: listingId },
      { $set: { status: 'deleted', deletedAt: new Date() } },
    );
    return { success: true };
  } catch {
    return { success: false, error: 'Delete failed' };
  }
}

function mapBoostedRow(doc: Record<string, unknown>, type: 'group' | 'bot'): ListingItem & { ownerLabel: string } {
  const d = doc as {
    _id: { toString(): string };
    name: string;
    slug: string;
    image?: string;
    telegramLink?: string;
    status: string;
    category?: string;
    views?: number;
    clickCount?: number;
    boosted?: boolean;
    boostExpiresAt?: Date | null;
    boostDuration?: string | null;
    paidBoost?: boolean;
    paidBoostStars?: number | null;
    contactTelegram?: string;
    contactEmail?: string;
    description?: string;
    createdByUsername?: string;
    createdAt?: Date;
  };
  return {
    _id: d._id.toString(),
    type,
    name: d.name,
    slug: d.slug,
    image: resolveImage(d.image),
    telegramLink: d.telegramLink || '',
    status: d.status,
    category: d.category || '',
    views: d.views || 0,
    clickCount: d.clickCount || 0,
    boosted: d.boosted || false,
    boostExpiresAt: d.boostExpiresAt ? d.boostExpiresAt.toISOString() : null,
    boostDuration: d.boostDuration || null,
    paidBoost: d.paidBoost || false,
    paidBoostStars: d.paidBoostStars ?? null,
    contactTelegram: d.contactTelegram || '',
    contactEmail: d.contactEmail || '',
    description: d.description || '',
    createdAt: d.createdAt?.toISOString?.() || new Date().toISOString(),
    ownerLabel: d.createdByUsername || d.contactTelegram || d.contactEmail || 'unknown',
  };
}

export async function getAllBoostedListings(
  token: string,
): Promise<{ listings: (ListingItem & { ownerLabel: string; boostPhase: 'active' | 'past' })[]; error?: string }> {
  try {
    const adminId = await authenticateAdminToken(token);
    if (!adminId) return { listings: [], error: 'Unauthorized' };

    await connectDB();
    const now = new Date();
    const hadBoostFilter = {
      $or: [
        { boosted: true },
        { boostExpiresAt: { $ne: null } },
        { boostDuration: { $in: ['1d', '7d', '14d', '30d', 'lifetime'] } },
        { paidBoostStars: { $in: [2000, 5000, 3000, 6000, 9923] } },
      ],
    };

    const select =
      'name slug image telegramLink status category views clickCount boosted boostExpiresAt boostDuration paidBoost paidBoostStars contactTelegram contactEmail description createdByUsername createdAt';

    const [groups, bots] = await Promise.all([
      Group.find({ ...hadBoostFilter, status: { $ne: 'deleted' } }).select(select).sort({ boostExpiresAt: -1, updatedAt: -1 }).lean(),
      Bot.find(hadBoostFilter).select(select).sort({ boostExpiresAt: -1, updatedAt: -1 }).lean(),
    ]);

    const listings = [
      ...(groups as Record<string, unknown>[]).map((g) => mapBoostedRow(g, 'group')),
      ...(bots as Record<string, unknown>[]).map((b) => mapBoostedRow(b, 'bot')),
    ].map((row) => {
      const expiry = row.boostExpiresAt ? new Date(row.boostExpiresAt) : null;
      const isActive = row.boosted && (!expiry || expiry > now);
      return { ...row, boostPhase: isActive ? 'active' as const : 'past' as const };
    }).sort((a, b) => {
      if (a.boostPhase !== b.boostPhase) return a.boostPhase === 'active' ? -1 : 1;
      const aT = a.boostExpiresAt ? new Date(a.boostExpiresAt).getTime() : 0;
      const bT = b.boostExpiresAt ? new Date(b.boostExpiresAt).getTime() : 0;
      return bT - aT;
    });

    return { listings };
  } catch {
    return { listings: [], error: 'Failed to load boosted listings' };
  }
}
