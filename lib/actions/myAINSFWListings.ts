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

export async function getMyAINSFWListings(token: string): Promise<{ listings: AINSFWListingItem[]; error?: string }> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded?.id) return { listings: [], error: 'Invalid token' };

    await connectDB();

    const items = await AINsfwSubmission.find({ createdBy: decoded.id })
      .select('name slug image category websiteUrl status paymentStatus submissionTier boosted boostExpiresAt featured contactEmail contactTelegram createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const listings: AINSFWListingItem[] = (items as any[]).map((d) => ({
      _id: d._id.toString(),
      name: d.name,
      slug: d.slug,
      image: resolveImage(d.image),
      category: d.category || '',
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
