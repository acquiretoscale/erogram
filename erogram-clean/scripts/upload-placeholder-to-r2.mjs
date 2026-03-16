/**
 * Upload the placeholder "no image" asset to R2 at a fixed key so the app
 * can use it for broken/missing images (SEO-friendly, no broken image icons).
 *
 * Usage: node --env-file=.env.local scripts/upload-placeholder-to-r2.mjs
 *
 * Then set in your env (e.g. Vercel):
 *   NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL=https://your-r2-public-url/placeholders/no-image.png
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'erogramimages';
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_URL) {
  console.error('Missing: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL');
  console.error('Run with: node --env-file=.env.local scripts/upload-placeholder-to-r2.mjs');
  process.exit(1);
}

const localPath = path.join(__dirname, '..', 'public', 'assets', 'placeholder-no-image.png');
if (!fs.existsSync(localPath)) {
  console.error('File not found:', localPath);
  process.exit(1);
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const KEY = 'placeholders/no-image.png';

async function main() {
  const buffer = fs.readFileSync(localPath);
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: KEY,
      Body: buffer,
      ContentType: 'image/png',
    })
  );
  const url = `${R2_PUBLIC_URL}/${KEY}`;
  console.log('Uploaded placeholder image to R2.');
  console.log('URL:', url);
  console.log('\nSet in your environment (e.g. Vercel):');
  console.log('  NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL=' + url);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
