import sharp from 'sharp';

/** User avatars: max 500px, WebP. */
export async function compressUserAvatar(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer, { animated: false })
    .rotate()
    .resize(500, 500, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}

export function presetAvatarKey(n: number): string {
  return `avatars/presets/erogramx-user${n}.webp`;
}

export function customAvatarKey(username: string): string {
  const safe = username.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'user';
  return `avatars/users/erogramx-${safe}.webp`;
}

export function publicAvatarUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL || '';
  return base ? `${base}/${key}` : '';
}
