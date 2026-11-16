'use server';

import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { uploadToR2 } from '@/lib/r2';
import connectDB from '@/lib/db/mongodb';
import { Bot, HomeFeaturedSlot, User } from '@/lib/models';
import { DIRECTORY_PAGES, HOME_DIRECTORY_GROUPS } from '@/lib/bestDirectory/config';
import { exploreSitePool, getHomeFeaturedSlots, loadAllAinsfwTools } from '@/lib/bestDirectory/loadRankings';
import { loadExplorePageCategories } from '@/lib/explore/loadExplorePageCategories';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const RESULT_LIMIT = 30;

export type HomeFeaturedOption = { key: string; name: string; image: string; note: string };

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

function homeCardPage(cardSlug: string) {
  const onHome = HOME_DIRECTORY_GROUPS.some((group) => group.slugs.includes(cardSlug));
  if (!onHome) return null;
  return DIRECTORY_PAGES.find((page) => page.slug === cardSlug) || null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matches(name: string, query: string): boolean {
  return !query || name.toLowerCase().includes(query);
}

async function searchOptions(kind: string, rawQuery: string): Promise<HomeFeaturedOption[]> {
  const query = rawQuery.trim().toLowerCase();

  if (kind === 'ainsfw') {
    const { tools, stats } = await loadAllAinsfwTools();
    return tools
      .filter((tool) => matches(`${tool.name} ${tool.slug}`, query))
      .slice(0, RESULT_LIMIT)
      .map((tool) => ({
        key: tool.slug,
        name: tool.name,
        image: stats[tool.slug]?.imageOverride || tool.image || '',
        note: tool.category || '',
      }));
  }

  if (kind === 'bots') {
    await connectDB();
    const filter: Record<string, unknown> = { status: 'approved', isAdvertisement: { $ne: true } };
    if (query) filter.name = { $regex: escapeRegex(query), $options: 'i' };
    const bots = await Bot.find(filter)
      .select('name slug image category')
      .sort({ clickCount: -1, views: -1 })
      .limit(RESULT_LIMIT)
      .lean<{ name: string; slug: string; image?: string; category?: string }[]>();
    return bots.map((bot) => ({
      key: bot.slug,
      name: bot.name,
      image: bot.image || '',
      note: bot.category || '',
    }));
  }

  const { categories } = await loadExplorePageCategories();
  return exploreSitePool(categories)
    .filter((entry) => matches(`${entry.site.name} ${entry.key}`, query))
    .slice(0, RESULT_LIMIT)
    .map((entry) => ({
      key: entry.key,
      name: entry.site.name,
      image: entry.site.image || '',
      note: entry.categoryTitle,
    }));
}

async function findOption(kind: string, key: string): Promise<{ key: string; name: string } | null> {
  if (kind === 'ainsfw') {
    const { tools } = await loadAllAinsfwTools();
    const tool = tools.find((entry) => entry.slug === key);
    return tool ? { key: tool.slug, name: tool.name } : null;
  }
  if (kind === 'bots') {
    await connectDB();
    const bot = await Bot.findOne({ slug: key, status: 'approved' })
      .select('name slug')
      .lean<{ name: string; slug: string }>();
    return bot ? { key: bot.slug, name: bot.name } : null;
  }
  const { categories } = await loadExplorePageCategories();
  const entry = exploreSitePool(categories).find((item) => item.key === key);
  return entry ? { key: entry.key, name: entry.site.name } : null;
}

function revalidateCard(cardSlug: string) {
  revalidatePath('/');
  revalidatePath(`/${cardSlug}`);
}

export type HomeFeaturedAdminSlot = { name: string; imageUrl: string; badgeText: string };

export async function getHomeFeaturedForAdmin(token: string): Promise<Record<string, HomeFeaturedAdminSlot>> {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  const slots = await getHomeFeaturedSlots();
  return Object.fromEntries(
    [...slots.values()].map((slot) => [
      slot.cardSlug,
      { name: slot.listingName || slot.listingKey, imageUrl: slot.imageUrl, badgeText: slot.badgeText },
    ]),
  );
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function uploadHomeFeaturedImage(formData: FormData) {
  const token = String(formData.get('token') || '');
  const cardSlug = String(formData.get('cardSlug') || '');
  const file = formData.get('file');
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  const page = homeCardPage(cardSlug);
  if (!page) throw new Error('Unknown card');
  if (!(file instanceof File) || !file.type.startsWith('image/')) throw new Error('Not an image');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Image too large');

  const buffer = Buffer.from(await file.arrayBuffer());
  const webp = await sharp(buffer)
    .rotate()
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const imageUrl = await uploadToR2(
    webp,
    `explore/featured/${cardSlug}-${randomUUID().slice(0, 8)}.webp`,
    'image/webp',
  );

  await connectDB();
  await HomeFeaturedSlot.findOneAndUpdate(
    { cardSlug },
    { $set: { imageUrl }, $setOnInsert: { kind: page.kind } },
    { upsert: true },
  );
  revalidateCard(cardSlug);
  return { ok: true, imageUrl };
}

const MAX_BADGE_LENGTH = 24;

export async function setHomeFeaturedBadge(token: string, cardSlug: string, text: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  const page = homeCardPage(cardSlug);
  if (!page) throw new Error('Unknown card');
  const badgeText = text.trim().slice(0, MAX_BADGE_LENGTH);
  await connectDB();
  await HomeFeaturedSlot.findOneAndUpdate(
    { cardSlug },
    { $set: { badgeText }, $setOnInsert: { kind: page.kind } },
    { upsert: true },
  );
  revalidateCard(cardSlug);
  return { ok: true, badgeText };
}

export async function clearHomeFeaturedImage(token: string, cardSlug: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  if (!homeCardPage(cardSlug)) throw new Error('Unknown card');
  await connectDB();
  await HomeFeaturedSlot.updateOne({ cardSlug }, { $set: { imageUrl: '' } });
  revalidateCard(cardSlug);
  return { ok: true };
}

export async function searchHomeFeaturedOptions(token: string, cardSlug: string, query: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  const page = homeCardPage(cardSlug);
  if (!page) throw new Error('Unknown card');
  return searchOptions(page.kind, query);
}

export async function setHomeFeaturedSlot(token: string, cardSlug: string, listingKey: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  const page = homeCardPage(cardSlug);
  if (!page) throw new Error('Unknown card');

  const option = await findOption(page.kind, listingKey);
  if (!option) throw new Error('Listing not found');

  await connectDB();
  await HomeFeaturedSlot.findOneAndUpdate(
    { cardSlug },
    { $set: { kind: page.kind, listingKey: option.key, listingName: option.name, imageUrl: '' } },
    { upsert: true },
  );
  revalidateCard(cardSlug);
  return { ok: true, name: option.name };
}

export async function clearHomeFeaturedSlot(token: string, cardSlug: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  if (!homeCardPage(cardSlug)) throw new Error('Unknown card');
  await connectDB();
  await HomeFeaturedSlot.deleteOne({ cardSlug });
  revalidateCard(cardSlug);
  return { ok: true };
}
