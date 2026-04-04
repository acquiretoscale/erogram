'use server';

import sharp from 'sharp';
import { uploadToR2, isR2Configured } from '@/lib/r2';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';

const EXIF_COPYRIGHT = '© Erogram.pro';
const EXIF_ARTIST = 'Erogram.pro';
const JPG_QUALITY = 95;

function r2Host(): string {
  return process.env.R2_PUBLIC_URL || '___none___';
}

function isAlreadyOnR2(url: string): boolean {
  return !!url && url.includes(r2Host());
}

export async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return null;
    return Buffer.from(await resp.arrayBuffer());
  } catch {
    return null;
  }
}

export async function optimizeAndBrand(buf: Buffer): Promise<Buffer> {
  return sharp(buf)
    .jpeg({ quality: JPG_QUALITY, mozjpeg: true })
    .withMetadata({
      exif: {
        IFD0: {
          Copyright: EXIF_COPYRIGHT,
          Artist: EXIF_ARTIST,
          ImageDescription: 'Erogram.pro - OnlyFans Creator Directory',
        },
      },
    })
    .toBuffer();
}

/**
 * Process a single creator's images: download from OF CDN, optimize,
 * brand with EXIF metadata, upload to R2 with SEO-friendly names.
 *
 * Handles: avatar, header, avatarThumbC50, avatarThumbC144, extraPhotos
 * Naming: {slug}-onlyfans.jpg (avatar), {slug}-onlyfans-header.jpg (header),
 *         {slug}-onlyfans-{i}.jpg (extras)
 * R2 path: onlyfanssearch/{slug}-onlyfans.jpg
 */
export async function processCreatorImages(slug: string): Promise<{
  avatarR2: string | null;
  headerR2: string | null;
  extrasR2: string[];
  error?: string;
}> {
  if (!isR2Configured()) {
    return { avatarR2: null, headerR2: null, extrasR2: [], error: 'R2 not configured' };
  }

  await connectDB();
  const creator = await OnlyFansCreator.findOne({ slug }).lean() as any;
  if (!creator) {
    return { avatarR2: null, headerR2: null, extrasR2: [], error: 'Creator not found' };
  }

  let avatarR2: string | null = null;
  let headerR2: string | null = null;
  const extrasR2: string[] = [];

  const avatarSrc = creator.avatar || '';
  if (avatarSrc && !isAlreadyOnR2(avatarSrc)) {
    const buf = await downloadImage(avatarSrc);
    if (buf) {
      const optimized = await optimizeAndBrand(buf);
      const key = `onlyfanssearch/${slug}-onlyfans.jpg`;
      avatarR2 = await uploadToR2(optimized, key, 'image/jpeg');
    }
  } else if (isAlreadyOnR2(avatarSrc)) {
    avatarR2 = avatarSrc;
  }

  const headerSrc = creator.header || '';
  if (headerSrc && !isAlreadyOnR2(headerSrc)) {
    const buf = await downloadImage(headerSrc);
    if (buf) {
      const optimized = await optimizeAndBrand(buf);
      const key = `onlyfanssearch/${slug}-onlyfans-header.jpg`;
      headerR2 = await uploadToR2(optimized, key, 'image/jpeg');
    }
  } else if (isAlreadyOnR2(headerSrc)) {
    headerR2 = headerSrc;
  }

  const extras: string[] = creator.extraPhotos || [];
  for (let i = 0; i < extras.length; i++) {
    const src = extras[i];
    if (!src) continue;
    if (isAlreadyOnR2(src)) {
      extrasR2.push(src);
      continue;
    }
    const buf = await downloadImage(src);
    if (buf) {
      const optimized = await optimizeAndBrand(buf);
      const key = `onlyfanssearch/${slug}-onlyfans-${i + 1}.jpg`;
      const url = await uploadToR2(optimized, key, 'image/jpeg');
      extrasR2.push(url);
    }
  }

  const updateFields: Record<string, any> = {};
  if (avatarR2) {
    updateFields.avatar = avatarR2;
    updateFields.avatarThumbC50 = avatarR2;
    updateFields.avatarThumbC144 = avatarR2;
  }
  if (headerR2) updateFields.header = headerR2;
  if (extrasR2.length > 0) updateFields.extraPhotos = extrasR2;

  if (Object.keys(updateFields).length > 0) {
    await OnlyFansCreator.updateOne({ slug }, { $set: updateFields });
  }

  return { avatarR2, headerR2, extrasR2 };
}

/**
 * Bulk-process images for multiple creators.
 * Returns a summary of results per creator.
 */
export async function bulkProcessCreatorImages(slugs: string[]): Promise<
  { slug: string; avatarR2: string | null; headerR2: string | null; extrasR2: string[]; error?: string }[]
> {
  const results: { slug: string; avatarR2: string | null; headerR2: string | null; extrasR2: string[]; error?: string }[] = [];

  for (const slug of slugs) {
    try {
      const r = await processCreatorImages(slug);
      results.push({ slug, ...r });
    } catch (e: any) {
      results.push({ slug, avatarR2: null, headerR2: null, extrasR2: [], error: e.message });
    }
  }

  return results;
}

/**
 * Find all adminImported creators whose avatar/header still point to external URLs
 * (not on R2) and process them.
 */
export async function processAllTop100Images(): Promise<{
  total: number;
  processed: number;
  skipped: number;
  errors: string[];
}> {
  if (!isR2Configured()) return { total: 0, processed: 0, skipped: 0, errors: ['R2 not configured'] };

  await connectDB();
  const r2Host = process.env.R2_PUBLIC_URL || '___none___';

  const creators = await OnlyFansCreator.find({
    adminImported: true,
    deleted: { $ne: true },
  }).select('slug avatar header').lean() as any[];

  const needsProcessing = creators.filter(
    (c: any) =>
      (c.avatar && !c.avatar.includes(r2Host)) ||
      (c.header && !c.header.includes(r2Host))
  );

  const errors: string[] = [];
  let processed = 0;

  for (const c of needsProcessing) {
    try {
      await processCreatorImages(c.slug);
      processed++;
    } catch (e: any) {
      errors.push(`${c.slug}: ${e.message}`);
    }
  }

  return {
    total: creators.length,
    processed,
    skipped: creators.length - needsProcessing.length,
    errors,
  };
}
