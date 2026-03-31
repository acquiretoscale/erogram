'use server';

import sharp from 'sharp';
import { uploadToR2, isR2Configured } from '@/lib/r2';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';

const EXIF_COPYRIGHT = '© Erogram.pro';
const EXIF_ARTIST = 'Erogram.pro';
const JPG_QUALITY = 95;

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return null;
    return Buffer.from(await resp.arrayBuffer());
  } catch {
    return null;
  }
}

async function optimizeAndBrand(buf: Buffer): Promise<Buffer> {
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
 * Naming: {slug}-onlyfans.jpg (avatar), {slug}-onlyfans2.jpg (header)
 * R2 path: onlyfans/{slug}-onlyfans.jpg
 */
export async function processCreatorImages(slug: string): Promise<{
  avatarR2: string | null;
  headerR2: string | null;
  error?: string;
}> {
  if (!isR2Configured()) {
    return { avatarR2: null, headerR2: null, error: 'R2 not configured' };
  }

  await connectDB();
  const creator = await OnlyFansCreator.findOne({ slug }).lean() as any;
  if (!creator) {
    return { avatarR2: null, headerR2: null, error: 'Creator not found' };
  }

  let avatarR2: string | null = null;
  let headerR2: string | null = null;

  const avatarSrc = creator.avatar || '';
  if (avatarSrc && !avatarSrc.includes(process.env.R2_PUBLIC_URL || '___none___')) {
    const buf = await downloadImage(avatarSrc);
    if (buf) {
      const optimized = await optimizeAndBrand(buf);
      const key = `onlyfanssearch/${slug}-onlyfans.jpg`;
      avatarR2 = await uploadToR2(optimized, key, 'image/jpeg');
    }
  } else if (avatarSrc.includes(process.env.R2_PUBLIC_URL || '___none___')) {
    avatarR2 = avatarSrc;
  }

  const headerSrc = creator.header || '';
  if (headerSrc && !headerSrc.includes(process.env.R2_PUBLIC_URL || '___none___')) {
    const buf = await downloadImage(headerSrc);
    if (buf) {
      const optimized = await optimizeAndBrand(buf);
      const key = `onlyfanssearch/${slug}-onlyfans2.jpg`;
      headerR2 = await uploadToR2(optimized, key, 'image/jpeg');
    }
  } else if (headerSrc.includes(process.env.R2_PUBLIC_URL || '___none___')) {
    headerR2 = headerSrc;
  }

  const updateFields: Record<string, string> = {};
  if (avatarR2) updateFields.avatar = avatarR2;
  if (headerR2) updateFields.header = headerR2;

  if (Object.keys(updateFields).length > 0) {
    await OnlyFansCreator.updateOne({ slug }, { $set: updateFields });
  }

  return { avatarR2, headerR2 };
}

/**
 * Bulk-process images for multiple creators.
 * Returns a summary of results per creator.
 */
export async function bulkProcessCreatorImages(slugs: string[]): Promise<
  { slug: string; avatarR2: string | null; headerR2: string | null; error?: string }[]
> {
  const results: { slug: string; avatarR2: string | null; headerR2: string | null; error?: string }[] = [];

  for (const slug of slugs) {
    try {
      const r = await processCreatorImages(slug);
      results.push({ slug, ...r });
    } catch (e: any) {
      results.push({ slug, avatarR2: null, headerR2: null, error: e.message });
    }
  }

  return results;
}
