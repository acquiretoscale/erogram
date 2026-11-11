import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import dotenv from 'dotenv';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SRC = '/Users/themaf/.cursor/projects/Users-themaf-Desktop-ErogramPRO/assets';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const R2_PUBLIC = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'erogramimages';

if (!accountId || !accessKeyId || !secretAccessKey || !R2_PUBLIC) {
  console.error('Missing R2 env vars');
  process.exit(1);
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

async function compressArticleImage(buf) {
  let compressed = await sharp(buf)
    .rotate()
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  if (compressed.length > 200 * 1024) {
    compressed = await sharp(buf)
      .rotate()
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 55 })
      .toBuffer();
  }
  if (compressed.length > 200 * 1024) {
    compressed = await sharp(buf)
      .rotate()
      .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 45 })
      .toBuffer();
  }
  return compressed;
}

const files = [
  {
    src: 'luciddreams_bot-1-aa0da122-e6c4-4833-87eb-6e2789e7d5c2.png',
    key: 'articles/lucid-dreams-characters-catalog.webp',
  },
  {
    src: 'luciddreams_bot-2-bcbe2bc1-4b25-4b1f-af7a-c31c3f124ff8.png',
    key: 'articles/lucid-dreams-items-shop.webp',
  },
];

for (const f of files) {
  const raw = fs.readFileSync(path.join(SRC, f.src));
  const webp = await compressArticleImage(raw);
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: f.key,
      Body: webp,
      ContentType: 'image/webp',
    }),
  );
  console.log(`${f.key} ${webp.length}b ${R2_PUBLIC}/${f.key}`);
}
