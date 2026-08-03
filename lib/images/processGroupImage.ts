import sharp from 'sharp';
import { uploadToR2 } from '@/lib/r2';
import { slugify } from '@/lib/utils/slugify';

/** R2 object key: groups/{slug}-porn-telegram-group.webp */
export function groupImageR2Key(slug: string): string {
  const base = slugify(slug).slice(0, 80) || 'group';
  return `groups/${base}-porn-telegram-group.webp`;
}

/** Compress to WebP, max 800px, target under 200KB. */
export async function compressGroupImageBuffer(buffer: Buffer): Promise<Buffer> {
  let compressed = await sharp(buffer, { animated: false })
    .rotate()
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  if (compressed.length > 200 * 1024) {
    compressed = await sharp(buffer, { animated: false })
      .rotate()
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 55 })
      .toBuffer();
  }
  if (compressed.length > 200 * 1024) {
    compressed = await sharp(buffer, { animated: false })
      .rotate()
      .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 45 })
      .toBuffer();
  }
  return compressed;
}

export async function processAndUploadGroupImage(buffer: Buffer, slug: string): Promise<string> {
  const compressed = await compressGroupImageBuffer(buffer);
  const key = groupImageR2Key(slug);
  return uploadToR2(compressed, key, 'image/webp');
}

/** R2 object key: bots/{slug}-porn-telegram-bot.webp */
export function botImageR2Key(slug: string): string {
  const base = slugify(slug).slice(0, 80) || 'bot';
  return `bots/${base}-porn-telegram-bot.webp`;
}

export async function processAndUploadBotImage(buffer: Buffer, slug: string): Promise<string> {
  const compressed = await compressGroupImageBuffer(buffer);
  const key = botImageR2Key(slug);
  return uploadToR2(compressed, key, 'image/webp');
}

export function isGroupImageOptimized(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.includes('-porn-telegram-group.webp');
}
