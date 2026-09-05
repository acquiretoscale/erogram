/**
 * Copy AISLUTBOT Telegram Stars tutorial screenshots to Erogram R2.
 * node --env-file=.env.local scripts/upload-stars-tutorial-assets.mjs
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

const FILES = [
  {
    src: 'https://aislutbot.com/payments/tutorials/stars/stars-step-2.avif',
    key: 'premium/tutorials/stars/stars-step-2.avif',
    type: 'image/avif',
  },
  {
    src: 'https://aislutbot.com/payments/tutorials/stars/tg-stars-variants.avif',
    key: 'premium/tutorials/stars/tg-stars-variants.avif',
    type: 'image/avif',
  },
  {
    src: 'https://aislutbot.com/payments/tutorials/stars/tg-stars-apple-confirm.avif',
    key: 'premium/tutorials/stars/tg-stars-apple-confirm.avif',
    type: 'image/avif',
  },
];

const out = {};
for (const f of FILES) {
  const res = await fetch(f.src);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${f.src}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: f.key,
      Body: buf,
      ContentType: f.type,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  out[f.key] = `${R2_PUBLIC}/${f.key}`;
  console.log(`${out[f.key]} (${buf.length} bytes)`);
}

console.log(JSON.stringify(out, null, 2));
