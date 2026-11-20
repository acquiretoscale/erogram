'use server';

import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { uploadToR2 } from '@/lib/r2';
import connectDB from '@/lib/db/mongodb';
import { Advertiser, AinsfwTrending, Campaign, User } from '@/lib/models';
import { isAdTrackingPaused } from '@/lib/adTrackingKillSwitch';
import { trackClick } from '@/lib/actions/campaigns';
import {
  DEFAULT_AINSFW_TRENDING,
  isOutboundToolHref,
  type AinsfwTrendingItem,
} from '@/lib/ainsfw/trendingTools';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const KEY = 'ainsfw';

async function authenticateAdmin(token: string) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    await connectDB();
    const user = await User.findById(decoded.id);
    if (user?.isAdmin) return user;
  } catch {
    return null;
  }
  return null;
}

function cleanItems(raw: AinsfwTrendingItem[]): AinsfwTrendingItem[] {
  const seen = new Set<string>();
  const items: AinsfwTrendingItem[] = [];
  for (const row of raw) {
    const slug = String(row.slug || '').trim();
    const name = String(row.name || '').trim();
    const href = String(row.href || '').trim();
    const logo = String(row.logo || '').trim();
    if (!slug || !name || !isOutboundToolHref(href) || seen.has(slug)) continue;
    seen.add(slug);
    items.push({ slug, name, href, logo });
  }
  return items.slice(0, 24);
}

const TRENDING_CLICK_MARKER = 'ainsfw-trending-clicks';

/** One hidden campaign so these clicks land in ad-space totals and never serve as an ad. */
async function trendingClickCampaignId(): Promise<string | null> {
  const existing = await Campaign.findOne({ internalName: TRENDING_CLICK_MARKER }).select('_id').lean() as { _id?: unknown } | null;
  if (existing?._id) return String(existing._id);

  const advertiser = await Advertiser.findOne({ name: /^EROGRAM$/i }).select('_id').lean() as { _id?: unknown } | null;
  if (!advertiser?._id) return null;

  const created = await Campaign.create({
    advertiserId: advertiser._id,
    name: 'Trending on Erogram',
    internalName: TRENDING_CLICK_MARKER,
    slot: 'trending-on-erogram',
    destinationUrl: 'https://erogramx.com',
    startDate: new Date(),
    status: 'paused',
    isVisible: false,
    adType: 'advertiser',
  });
  return String(created._id);
}

/** Count a trending-button click in the advertiser network ad-space total. */
export async function trackAinsfwTrendingClick(_href: string): Promise<void> {
  try {
    if (await isAdTrackingPaused()) return;
    await connectDB();
    const id = await trendingClickCampaignId();
    if (!id) return;
    await trackClick(id, 'trending-on-erogram');
  } catch {
    // A missed count must not stop the click from opening.
  }
}

export async function getAinsfwTrending(): Promise<AinsfwTrendingItem[]> {
  try {
    await connectDB();
    const doc = await AinsfwTrending.findOne({ key: KEY }).lean<{ items?: AinsfwTrendingItem[] }>();
    if (!doc) return DEFAULT_AINSFW_TRENDING;
    return cleanItems(doc.items || []);
  } catch {
    return DEFAULT_AINSFW_TRENDING;
  }
}

export async function saveAinsfwTrending(token: string, raw: AinsfwTrendingItem[]): Promise<AinsfwTrendingItem[]> {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Not allowed');
  const items = cleanItems(raw);
  await AinsfwTrending.findOneAndUpdate(
    { key: KEY },
    { $set: { items } },
    { upsert: true, new: true },
  );
  revalidatePath('/ainsfw');
  revalidatePath('/ainsfw/[slug]', 'page');
  revalidatePath('/bots');
  revalidatePath('/bots/page/[page]', 'page');
  revalidatePath('/[slug]', 'page');
  return items;
}

export async function listAinsfwTrendingPicker(): Promise<Array<{ slug: string; name: string; image: string; tryNowUrl: string }>> {
  const { AI_NSFW_TOOLS } = await import('@/app/ainsfw/data');
  const { getApprovedSubmissions } = await import('@/lib/actions/ainsfw');
  const paid = await getApprovedSubmissions();
  const bySlug = new Map<string, { slug: string; name: string; image: string; tryNowUrl: string }>();
  for (const tool of [...AI_NSFW_TOOLS, ...paid]) {
    bySlug.set(tool.slug, {
      slug: tool.slug,
      name: tool.name,
      image: tool.image || '',
      tryNowUrl: tool.tryNowUrl || '',
    });
  }
  return [...bySlug.values()];
}

export async function uploadAinsfwTrendingIcon(formData: FormData): Promise<string> {
  const token = String(formData.get('token') || '');
  const file = formData.get('file');
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Not allowed');
  if (!(file instanceof File) || !file.type.startsWith('image/')) throw new Error('Not an image');
  if (file.size > 2_000_000) throw new Error('Image too large');
  const buffer = Buffer.from(await file.arrayBuffer());
  const webp = await sharp(buffer)
    .rotate()
    .resize(128, 128, { fit: 'cover' })
    .webp({ quality: 80 })
    .toBuffer();
  return uploadToR2(webp, `ainsfw/trending/${randomUUID().slice(0, 8)}.webp`, 'image/webp');
}
