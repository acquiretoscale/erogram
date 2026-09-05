/**
 * Copy AISLUTBOT checkout promo video + poster to Erogram R2.
 * node --env-file=.env.local scripts/upload-premium-checkout-video.mjs
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

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

const SRC_BASE = 'https://pub-17aa5d996caf4f7086190be5ee8807c5.r2.dev';
const FILES = [
  {
    src: `${SRC_BASE}/slutbot.ai/checkout/swipey-promo.mp4`,
    key: 'premium/checkout/swipey-promo.mp4',
    type: 'video/mp4',
  },
  {
    src: `${SRC_BASE}/slutbot.ai/checkout/swipey-promo.jpg`,
    key: 'premium/checkout/swipey-promo.jpg',
    type: 'image/jpeg',
  },
];

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

const out = {};
for (const f of FILES) {
  console.log(`Fetching ${f.src}`);
  const res = await fetch(f.src);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${f.src}`);
  const buf = Buffer.from(await res.arrayBuffer());
  out[f.key] = await upload(f.key, buf, f.type);
  console.log(`  → ${out[f.key]} (${buf.length} bytes)`);
}

console.log('\n--- URLs ---');
console.log(JSON.stringify(out, null, 2));
