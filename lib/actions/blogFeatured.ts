'use server';

import jwt from 'jsonwebtoken';
import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/db/mongodb';
import { User, BlogFeaturedCreator, OnlyFansCreator } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

export interface BlogFeaturedCreatorData {
  _id: string;
  name: string;
  username: string;
  monthLabel: string;
  blurb: string;
  coverImage: string;
  avatar: string;
  destinationUrl: string;
  ctaLabel: string;
  active: boolean;
  clicks: number;
}

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

function toData(d: any): BlogFeaturedCreatorData {
  return {
    _id: d._id.toString(),
    name: d.name || '',
    username: d.username || '',
    monthLabel: d.monthLabel || '',
    blurb: d.blurb || '',
    coverImage: d.coverImage || '',
    avatar: d.avatar || '',
    destinationUrl: d.destinationUrl || '',
    ctaLabel: d.ctaLabel || 'See the feature',
    active: !!d.active,
    clicks: d.clicks || 0,
  };
}

/** Public: the active Creator of the Month, or null if none is manually set. */
export async function getBlogFeaturedCreator(): Promise<BlogFeaturedCreatorData | null> {
  try {
    await connectDB();
    const doc = await BlogFeaturedCreator.findOne({ active: true }).sort({ updatedAt: -1 }).lean();
    return doc ? toData(doc) : null;
  } catch (e) {
    console.error('[blogFeatured] get failed:', e);
    return null;
  }
}

/** Admin: full record (active or not) for the editor. */
export async function getBlogFeaturedCreatorAdmin(token: string): Promise<BlogFeaturedCreatorData | null> {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  await connectDB();
  const doc = await BlogFeaturedCreator.findOne({}).sort({ updatedAt: -1 }).lean();
  return doc ? toData(doc) : null;
}

/** Admin: create or update the single slot. */
export async function upsertBlogFeaturedCreator(
  token: string,
  data: Partial<Omit<BlogFeaturedCreatorData, '_id' | 'clicks'>>,
): Promise<{ success: true }> {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  if (!data.name?.trim()) throw new Error('Name is required');

  await connectDB();
  const fields = {
    name: data.name.trim(),
    username: (data.username || '').trim(),
    monthLabel: (data.monthLabel || '').trim(),
    blurb: (data.blurb || '').trim(),
    coverImage: (data.coverImage || '').trim(),
    avatar: (data.avatar || '').trim(),
    destinationUrl: (data.destinationUrl || '').trim(),
    ctaLabel: (data.ctaLabel || 'See the feature').trim(),
    active: data.active !== false,
  };

  const existing = await BlogFeaturedCreator.findOne({}).sort({ updatedAt: -1 });
  if (existing) {
    await BlogFeaturedCreator.findByIdAndUpdate(existing._id, fields);
  } else {
    await BlogFeaturedCreator.create(fields);
  }
  revalidatePath('/blog');
  revalidatePath('/main');
  return { success: true };
}

export interface CreatorPickerResult {
  _id: string;
  name: string;
  username: string;
  avatar: string;
  slug: string;
}

/** Admin: search the full OnlyFansCreator DB by name or username (for the SPOTLIGHT picker). */
export async function searchCreatorsForUncut(token: string, q: string): Promise<CreatorPickerResult[]> {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  const trimmed = (q || '').trim();
  if (trimmed.length < 2) return [];
  await connectDB();
  const regex = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const rows = await OnlyFansCreator.find(
    {
      deleted: { $ne: true },
      submissionStatus: { $ne: 'rejected' },
      $or: [{ name: regex }, { username: regex }],
    },
    { name: 1, username: 1, avatar: 1, slug: 1 },
  )
    .limit(12)
    .lean() as any[];

  return rows.map((r) => ({
    _id: r._id.toString(),
    name: r.name || '',
    username: r.username || '',
    avatar: r.avatar || '',
    slug: r.slug || '',
  }));
}

/** Admin: assign an existing promoted creator (TrendingOFCreator) to the
 *  blog SPOTLIGHT cover in one click. Pulls avatar/name/url from the slot. */
export async function assignCreatorToUncut(
  token: string,
  creator: { name: string; username?: string; avatar?: string; url?: string; bio?: string },
): Promise<{ success: true }> {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  if (!creator?.name?.trim()) throw new Error('Creator name is required');

  const now = new Date();
  return upsertBlogFeaturedCreator(token, {
    name: creator.name.trim(),
    username: (creator.username || '').trim(),
    monthLabel: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    blurb: (creator.bio || '').trim(),
    coverImage: (creator.avatar || '').trim(),
    avatar: (creator.avatar || '').trim(),
    destinationUrl: (creator.url || '').trim() || ((creator.username || '').trim() ? `/${(creator.username || '').trim()}-onlyfans` : ''),
    ctaLabel: 'See the feature',
    active: true,
  });
}

/** Admin: remove the SPOTLIGHT cover entirely (nothing shows on /main). */
export async function clearBlogFeaturedCreator(token: string): Promise<{ success: true }> {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  await connectDB();
  await BlogFeaturedCreator.deleteMany({});
  revalidatePath('/main');
  revalidatePath('/blog');
  return { success: true };
}

/** Public: count a click (sendBeacon-friendly, but used as a server action). */
export async function trackBlogFeaturedClick(id: string): Promise<void> {
  try {
    if (!id) return;
    await connectDB();
    await BlogFeaturedCreator.findByIdAndUpdate(id, { $inc: { clicks: 1 } });
  } catch {
    /* non-critical */
  }
}
