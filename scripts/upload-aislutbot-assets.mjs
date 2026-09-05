/**
 * One-off: fetch AISLUTBOT combined before/after → R2.
 * Usage: node --env-file=.env.local scripts/upload-aislutbot-assets.mjs
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SLUG = 'aislutbot-ai-nude-generator';
const BASE = 'https://aislutbot.com';
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'erogramimages';
const R2_PUBLIC = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!accountId || !accessKeyId || !secretAccessKey || !R2_PUBLIC) {
  console.error('Missing R2 env vars');
  process.exit(1);
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

async function fetchBuf(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ErogramBot/1.0)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function toWebp(buffer, maxW = 1400) {
  return sharp(buffer)
    .rotate()
    .resize(maxW, undefined, { withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
}

async function stitchBeforeAfter(beforeBuf, afterBuf) {
  const before = sharp(beforeBuf).rotate();
  const after = sharp(afterBuf).rotate();
  const [bMeta, aMeta] = await Promise.all([before.metadata(), after.metadata()]);
  const height = Math.max(bMeta.height || 0, aMeta.height || 0);
  const bResized = await before
    .resize({ height, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .toBuffer();
  const aResized = await after
    .resize({ height, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .toBuffer();
  const [bf, af] = await Promise.all([sharp(bResized).metadata(), sharp(aResized).metadata()]);
  const totalW = (bf.width || 0) + (af.width || 0);
  return sharp({
    create: { width: totalW, height, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .composite([
      { input: bResized, left: 0, top: 0 },
      { input: aResized, left: bf.width || 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

async function upload(key, body, contentType) {
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  return `${R2_PUBLIC}/${key}`;
}

const pairs = ['01', '02', '03', '04', '05', '06'];
const hasCombined = new Set(['02', '05', '06']);
const out = { gallery: [] };

for (const n of pairs) {
  let raw;
  if (hasCombined.has(n)) {
    const url = `${BASE}/examples/before-after/pair-${n}-combined.jpg`;
    console.log(`Fetching combined ${url}`);
    raw = await fetchBuf(url);
  } else {
    console.log(`Stitching pair-${n} before+after`);
    const before = await fetchBuf(`${BASE}/examples/before-after/pair-${n}-before.jpg`);
    const after = await fetchBuf(`${BASE}/examples/before-after/pair-${n}-after.jpg`);
    raw = await stitchBeforeAfter(before, after);
  }
  const webp = await toWebp(raw);
  const key = `ainsfw/gallery/${SLUG}-combined-${n}.webp`;
  const publicUrl = await upload(key, webp, 'image/webp');
  out.gallery.push(publicUrl);
  console.log(`  → ${publicUrl}`);
}

console.log('\n--- JSON ---');
console.log(JSON.stringify(out, null, 2));
