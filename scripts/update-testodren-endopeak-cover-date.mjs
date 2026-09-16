import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SRC = '/Users/themaf/.cursor/projects/Users-themaf-Desktop-ErogramPRO/assets/1932220.width-932-33ecad7b-6471-48e6-8208-8c56d2d7a7da.jpg';
const SLUG = 'testodren-vs-endopeak';
const KEY = 'articles/testodren-vs-endopeak-cover.webp';
const PUBLISHED_AT = new Date('2026-08-30T12:00:00.000Z');

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

const raw = fs.readFileSync(SRC);
let webp = await sharp(raw)
  .rotate()
  .resize(1200, 675, { fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 82 })
  .toBuffer();
if (webp.length > 180 * 1024) {
  webp = await sharp(raw)
    .rotate()
    .resize(1200, 675, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 58 })
    .toBuffer();
}

await r2.send(new PutObjectCommand({
  Bucket: R2_BUCKET,
  Key: KEY,
  Body: webp,
  ContentType: 'image/webp',
}));

const coverUrl = `${R2_PUBLIC}/${KEY}`;
console.log(`cover ${webp.length}b ${coverUrl}`);

await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
const col = mongoose.connection.db.collection('articles');

const res = await col.updateOne(
  { slug: SLUG },
  {
    $set: {
      featuredImage: coverUrl,
      ogImage: coverUrl,
      twitterImage: coverUrl,
      publishedAt: PUBLISHED_AT,
    },
  },
);
console.log('matched', res.matchedCount, 'modified', res.modifiedCount);

const hub = await col.find({ status: 'published' })
  .project({ slug: 1, publishedAt: 1, title: 1 })
  .sort({ publishedAt: -1, createdAt: -1 })
  .limit(3)
  .toArray();
console.log('blog hub top 3:', hub.map((a) => `${a.slug} (${a.publishedAt?.toISOString?.().slice(0, 10) || 'no date'})`));

await mongoose.disconnect();
console.log('http://127.0.0.1:3939/blog/' + SLUG);
