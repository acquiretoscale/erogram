import sharp from 'sharp';

/** R2 object key: partners/{slug}-erogram-partner.webp */
export function partnerLogoR2Key(slug: string): string {
  const base = slug
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `partners/${base || 'partner'}-erogram-partner.webp`;
}

/** Partner card logos: WebP on R2, max width 520px, target under 150KB. */
export async function compressPartnerLogoBuffer(buffer: Buffer): Promise<Buffer> {
  const MAX = 150 * 1024;
  const attempts = [
    { w: 520, q: 86 },
    { w: 480, q: 78 },
    { w: 400, q: 70 },
    { w: 360, q: 62 },
  ];
  let compressed: Buffer = buffer;
  for (const { w, q } of attempts) {
    compressed = await sharp(buffer, { animated: false })
      .rotate()
      .resize(w, w, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: q })
      .toBuffer();
    if (compressed.length <= MAX) break;
  }
  return compressed;
}
