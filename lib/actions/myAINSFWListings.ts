'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { AINsfwSubmission } from '@/lib/models';
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

export interface AINSFWListingItem {
  _id: string;
  name: string;
  slug: string;
  image: string;
  category: string;
  categories: string[];
  description: string;
  vendor: string;
  subscription: string;
  tags: string[];
  payment: string[];
  websiteUrl: string;
  status: string;
  paymentStatus: string;
  submissionTier: string;
  boosted: boolean;
  boostExpiresAt: string | null;
  featured: boolean;
  contactEmail: string;
  contactTelegram: string;
  createdAt: string;
}

export interface AINSFWListingUpdate {
  name?: string;
  description?: string;
  websiteUrl?: string;
  contactEmail?: string;
  contactTelegram?: string;
  vendor?: string;
  subscription?: string;
  tags?: string[];
  payment?: string[];
  image?: string;
}

export async function getMyAINSFWListings(token: string): Promise<{ listings: AINSFWListingItem[]; error?: string }> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded?.id) return { listings: [], error: 'Invalid token' };

    await connectDB();

    const items = await AINsfwSubmission.find({ createdBy: decoded.id })
      .select('name slug image category categories description vendor subscription tags payment websiteUrl status paymentStatus submissionTier boosted boostExpiresAt featured contactEmail contactTelegram createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const listings: AINSFWListingItem[] = (items as any[]).map((d) => ({
      _id: d._id.toString(),
      name: d.name,
      slug: d.slug,
      image: resolveImage(d.image),
      category: d.category || '',
      categories: Array.isArray(d.categories) ? d.categories : d.category ? [d.category] : [],
      description: d.description || '',
      vendor: d.vendor || '',
      subscription: d.subscription || '',
      tags: Array.isArray(d.tags) ? d.tags : [],
      payment: Array.isArray(d.payment) ? d.payment : [],
      websiteUrl: d.websiteUrl || '',
      status: d.status,
      paymentStatus: d.paymentStatus || 'none',
      submissionTier: d.submissionTier || 'basic',
      boosted: d.boosted || false,
      boostExpiresAt: d.boostExpiresAt ? new Date(d.boostExpiresAt).toISOString() : null,
      featured: d.featured || false,
      contactEmail: d.contactEmail || '',
      contactTelegram: d.contactTelegram || '',
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
    }));

    return { listings };
  } catch {
    return { listings: [], error: 'Authentication failed' };
  }
}

export async function updateMyAINSFWListing(
  token: string,
  listingId: string,
  updates: AINSFWListingUpdate,
): Promise<{ success: boolean; error?: string }> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    if (!decoded?.id) return { success: false, error: 'Invalid token' };

    await connectDB();

    const item = await AINsfwSubmission.findOne({ _id: listingId, createdBy: decoded.id }).lean();
    if (!item) return { success: false, error: 'Listing not found or access denied' };

    const set: Record<string, unknown> = {};

    if (updates.name !== undefined) {
      const name = updates.name.trim();
      if (!name) return { success: false, error: 'Tool name is required.' };
      set.name = name;
    }
    if (updates.description !== undefined) {
      const desc = updates.description.trim();
      if (!desc) return { success: false, error: 'Description is required.' };
      const words = desc.split(/\s+/).filter(Boolean).length;
      if (words > 1000) return { success: false, error: 'Description cannot exceed 1000 words.' };
      set.description = desc;
    }
    if (updates.websiteUrl !== undefined) {
      const url = updates.websiteUrl.trim();
      if (!url.startsWith('http')) return { success: false, error: 'Enter a valid URL starting with https://' };
      set.websiteUrl = url;
      set.tryNowUrl = url;
    }
    if (updates.contactEmail !== undefined) set.contactEmail = updates.contactEmail.trim();
    if (updates.contactTelegram !== undefined) set.contactTelegram = updates.contactTelegram.trim();
    if (updates.vendor !== undefined) set.vendor = updates.vendor.trim();
    if (updates.subscription !== undefined) set.subscription = updates.subscription.trim();
    if (updates.tags !== undefined) {
      set.tags = updates.tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
    }
    if (updates.payment !== undefined) {
      set.payment = updates.payment.map((p) => p.trim()).filter(Boolean);
    }
    if (updates.image !== undefined) {
      const img = updates.image.trim();
      if (!img) return { success: false, error: 'Image is required.' };
      if (!img.startsWith('https://') && !img.startsWith('/') && !img.startsWith('data:image/')) {
        return { success: false, error: 'Invalid image URL.' };
      }
      set.image = img;
    }

    const nextEmail = (set.contactEmail as string | undefined) ?? (item as any).contactEmail ?? '';
    const nextTelegram = (set.contactTelegram as string | undefined) ?? (item as any).contactTelegram ?? '';
    if (!nextEmail && !nextTelegram) {
      return { success: false, error: 'Please provide an email or Telegram contact.' };
    }

    if (Object.keys(set).length === 0) {
      return { success: false, error: 'No valid fields to update.' };
    }

    await AINsfwSubmission.updateOne({ _id: listingId }, { $set: set });
    return { success: true };
  } catch {
    return { success: false, error: 'Update failed' };
  }
}

export async function getMyAINSFWSummary(token: string): Promise<{ hasListings: boolean; inReviewCount: number }> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded?.id) return { hasListings: false, inReviewCount: 0 };

    await connectDB();
    const userId = decoded.id;

    const [total, inReview] = await Promise.all([
      AINsfwSubmission.countDocuments({ createdBy: userId }),
      AINsfwSubmission.countDocuments({ createdBy: userId, status: 'pending' }),
    ]);

    return { hasListings: total > 0, inReviewCount: inReview };
  } catch {
    return { hasListings: false, inReviewCount: 0 };
  }
}
