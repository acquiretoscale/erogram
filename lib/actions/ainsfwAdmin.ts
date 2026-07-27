'use server';

import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import connectDB from '@/lib/db/mongodb';
import { User, AINsfwToolStats } from '@/lib/models';
import { uploadToR2, isR2Configured, deleteFromR2 } from '@/lib/r2';
import { AINSFW_GALLERY } from '@/app/ainsfw/galleryMap';
import { resolveGallery, type ToolContentFields } from '@/lib/ainsfw/toolContent';
import { invertToolSlug } from '@/app/ainsfw/data';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const JPG_QUALITY = 95;

function statsSlugQuery(slug: string): string | { $in: string[] } {
  const alt = invertToolSlug(slug);
  return alt && alt !== slug ? { $in: [slug, alt] } : slug;
}

async function requireAdmin(token: string) {
  if (!token) throw new Error('Unauthorized');
  const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
  await connectDB();
  const user = await User.findById(decoded.id).select('isAdmin').lean() as { isAdmin?: boolean } | null;
  if (!user?.isAdmin) throw new Error('Unauthorized');
}

function slugKey(slug: string): string | { $in: string[] } {
  return statsSlugQuery(slug);
}

async function getStatsDoc(slug: string) {
  await connectDB();
  return AINsfwToolStats.findOne({ slug: slugKey(slug) }).lean() as any;
}

async function ensureStatsDoc(slug: string) {
  await connectDB();
  const existing = await getStatsDoc(slug);
  if (existing?.slug) return existing.slug as string;
  const doc = await AINsfwToolStats.findOneAndUpdate(
    { slug },
    { $setOnInsert: { slug } },
    { upsert: true, new: true },
  ).lean() as any;
  return doc.slug as string;
}

function fieldsFromDoc(doc?: any): ToolContentFields {
  if (!doc) return {};
  return {
    descriptionOverride: doc.descriptionOverride || '',
    imageOverride: doc.imageOverride || '',
    customGallery: doc.customGallery || [],
    hiddenGalleryUrls: doc.hiddenGalleryUrls || [],
    galleryManaged: !!doc.galleryManaged || (doc.hiddenGalleryUrls?.length ?? 0) > 0 || (doc.customGallery?.length ?? 0) > 0,
    coverManaged: !!doc.coverManaged,
  };
}

export async function isToolGalleryManaged(slug: string): Promise<boolean> {
  const doc = await getStatsDoc(slug);
  if (!doc) return false;
  return !!doc.galleryManaged || (doc.hiddenGalleryUrls?.length ?? 0) > 0 || (doc.customGallery?.length ?? 0) > 0;
}

async function optimizeImage(buf: Buffer): Promise<Buffer> {
  const meta = await sharp(buf).metadata();
  const width = meta.width && meta.width > 1200 ? 1200 : meta.width;
  return sharp(buf)
    .resize(width, undefined, { withoutEnlargement: true })
    .jpeg({ quality: JPG_QUALITY, mozjpeg: true })
    .toBuffer();
}

export async function adminGetToolGallery(token: string, slug: string): Promise<string[]> {
  await requireAdmin(token);
  const doc = await getStatsDoc(slug);
  return resolveGallery(slug, fieldsFromDoc(doc));
}

export async function adminSaveToolContent(
  token: string,
  slug: string,
  data: {
    description?: string;
    upvotes?: number;
    downvotes?: number;
    imageOverride?: string;
  },
): Promise<ToolContentFields & { upvotes: number; downvotes: number }> {
  await requireAdmin(token);
  const key = await ensureStatsDoc(slug);
  const set: Record<string, unknown> = {};
  if (data.description !== undefined) set.descriptionOverride = data.description.trim();
  if (data.imageOverride !== undefined) {
    set.imageOverride = data.imageOverride.trim();
    set.coverManaged = true;
  }
  if (data.upvotes !== undefined) set.upvotes = Math.max(0, data.upvotes);
  if (data.downvotes !== undefined) set.downvotes = Math.max(0, data.downvotes);

  const doc = await AINsfwToolStats.findOneAndUpdate(
    { slug: key },
    { $set: set },
    { upsert: true, new: true },
  ).lean() as any;

  return {
    ...fieldsFromDoc(doc),
    upvotes: doc.upvotes || 0,
    downvotes: doc.downvotes || 0,
  };
}

export async function adminUploadToolGalleryImage(
  token: string,
  slug: string,
  formData: FormData,
): Promise<{ url: string; gallery: string[] } | { error: string }> {
  await requireAdmin(token);
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) return { error: 'No file uploaded' };
  if (!isR2Configured()) return { error: 'R2 not configured' };

  const key = await ensureStatsDoc(slug);
  const doc = await getStatsDoc(slug);
  const current = resolveGallery(slug, fieldsFromDoc(doc));
  const buf = Buffer.from(await file.arrayBuffer());
  const optimized = await optimizeImage(buf);
  const cacheBust = Date.now().toString(36);
  const r2Key = `ainsfw/gallery/${slug.replace(/[^a-z0-9-]/gi, '')}-${cacheBust}.jpg`;
  const url = await uploadToR2(optimized, r2Key, 'image/jpeg');
  const gallery = [...current, url];

  await AINsfwToolStats.findOneAndUpdate(
    { slug: key },
    { $set: { customGallery: gallery, galleryManaged: true } },
    { upsert: true },
  );

  return { url, gallery };
}

export async function adminDeleteToolGalleryImage(
  token: string,
  slug: string,
  url: string,
): Promise<{ gallery: string[] } | { error: string }> {
  await requireAdmin(token);
  if (!url) return { error: 'Missing image URL' };

  const key = await ensureStatsDoc(slug);
  const doc = await getStatsDoc(slug);
  const fields = fieldsFromDoc(doc);
  let gallery = resolveGallery(slug, fields).filter((u) => u !== url);

  const hidden = new Set(fields.hiddenGalleryUrls || []);
  if ((AINSFW_GALLERY[slug] || []).includes(url)) hidden.add(url);

  const update: Record<string, unknown> = {
    customGallery: gallery,
    hiddenGalleryUrls: [...hidden],
    galleryManaged: true,
  };

  if (doc?.imageOverride === url) update.imageOverride = gallery[0] || '';

  await AINsfwToolStats.findOneAndUpdate({ slug: key }, { $set: update }, { upsert: true });

  if (url.includes('r2.dev') || url.includes(process.env.R2_PUBLIC_URL || '___none___')) {
    await deleteFromR2(url).catch(() => {});
  }

  return { gallery };
}

export async function adminSetToolFeaturedImage(
  token: string,
  slug: string,
  url: string,
): Promise<{ imageOverride: string } | { error: string }> {
  await requireAdmin(token);
  if (!url) return { error: 'Missing image URL' };
  const key = await ensureStatsDoc(slug);
  await AINsfwToolStats.findOneAndUpdate(
    { slug: key },
    { $set: { imageOverride: url, coverManaged: true } },
    { upsert: true },
  );
  return { imageOverride: url };
}

export async function adminUploadToolCoverImage(
  token: string,
  slug: string,
  formData: FormData,
): Promise<{ imageOverride: string } | { error: string }> {
  await requireAdmin(token);
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) return { error: 'No file uploaded' };
  if (!isR2Configured()) return { error: 'R2 not configured' };

  const key = await ensureStatsDoc(slug);
  const doc = await getStatsDoc(slug);
  const oldCover = doc?.imageOverride || '';
  const buf = Buffer.from(await file.arrayBuffer());
  const optimized = await optimizeImage(buf);
  const cacheBust = Date.now().toString(36);
  const r2Key = `ainsfw/cover/${slug.replace(/[^a-z0-9-]/gi, '')}-${cacheBust}.jpg`;
  const url = await uploadToR2(optimized, r2Key, 'image/jpeg');

  await AINsfwToolStats.findOneAndUpdate(
    { slug: key },
    { $set: { imageOverride: url, coverManaged: true } },
    { upsert: true },
  );

  if (oldCover && oldCover !== url && (oldCover.includes('r2.dev') || oldCover.includes(process.env.R2_PUBLIC_URL || '___none___'))) {
    await deleteFromR2(oldCover).catch(() => {});
  }

  return { imageOverride: url };
}

export async function adminDeleteToolCoverImage(
  token: string,
  slug: string,
): Promise<{ imageOverride: string } | { error: string }> {
  await requireAdmin(token);
  const key = await ensureStatsDoc(slug);
  const doc = await getStatsDoc(slug);
  const oldCover = doc?.imageOverride || '';

  await AINsfwToolStats.findOneAndUpdate(
    { slug: key },
    { $set: { imageOverride: '', coverManaged: true } },
    { upsert: true },
  );

  if (oldCover && (oldCover.includes('r2.dev') || oldCover.includes(process.env.R2_PUBLIC_URL || '___none___'))) {
    await deleteFromR2(oldCover).catch(() => {});
  }

  return { imageOverride: '' };
}

export async function getPublicToolGallery(slug: string): Promise<string[]> {
  const doc = await getStatsDoc(slug);
  return resolveGallery(slug, fieldsFromDoc(doc));
}
