/**
 * Upload Free Nudifier hero + gallery previews to R2.
 * Run: node --env-file=.env.local scripts/upload-free-nudifier-images.mjs
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '..', 'tmp', 'free-nudifier-images');

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const bucket = process.env.R2_BUCKET_NAME || 'erogramimages';
const base = process.env.R2_PUBLIC_URL.replace(/\/$/, '');

const files = [
  { local: 'free-nudifier-undress-ai.webp', key: 'ainsfw/free-nudifier-undress-ai.webp' },
  { local: 'free-nudifier-undress-ai-1.webp', key: 'ainsfw/gallery/free-nudifier-undress-ai-1.webp' },
  { local: 'free-nudifier-undress-ai-2.webp', key: 'ainsfw/gallery/free-nudifier-undress-ai-2.webp' },
  { local: 'free-nudifier-undress-ai-3.webp', key: 'ainsfw/gallery/free-nudifier-undress-ai-3.webp' },
];

for (const f of files) {
  const body = fs.readFileSync(path.join(dir, f.local));
  await r2.send(new PutObjectCommand({ Bucket: bucket, Key: f.key, Body: body, ContentType: 'image/webp' }));
  console.log(`${base}/${f.key}`);
}

console.log('Done.');
