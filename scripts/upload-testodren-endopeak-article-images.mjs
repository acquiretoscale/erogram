import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SRC = '/Users/themaf/.cursor/projects/Users-themaf-Desktop-ErogramPRO/assets';
const SLUG = 'testodren-vs-endopeak';

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

async function compressArticleImage(buf, { maxWidth = 900, maxHeight = 900, quality = 80 } = {}) {
  let compressed = await sharp(buf)
    .rotate()
    .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
  if (compressed.length > 220 * 1024) {
    compressed = await sharp(buf)
      .rotate()
      .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 55 })
      .toBuffer();
  }
  if (compressed.length > 220 * 1024) {
    compressed = await sharp(buf)
      .rotate()
      .resize(Math.round(maxWidth * 0.75), Math.round(maxHeight * 0.75), { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 45 })
      .toBuffer();
  }
  return compressed;
}

const files = [
  {
    src: 'endopeak-37c599d2-f6f1-4291-8e22-5583ac606097.jpg',
    key: 'articles/low-testosterone-symptoms-endopeak-review-products.webp',
    id: 'endopeak-products',
    alt: 'Low testosterone symptoms - endopeak review',
  },
  {
    src: 'endopeak2-64183924-84f8-4c88-b99e-798707922691.webp',
    key: 'articles/low-testosterone-symptoms-endopeak-review-cover.webp',
    id: 'cover',
    alt: 'Low testosterone symptoms - endopeak review',
    cover: true,
    maxWidth: 1200,
    maxHeight: 675,
  },
  {
    src: 'endopeak1-1ea98186-b5f2-4cd8-abf5-dec55dd0d47e.jpg',
    key: 'articles/low-testosterone-symptoms-endopeak-review-truth.webp',
    id: 'endopeak-truth',
    alt: 'Low testosterone symptoms - endopeak review',
  },
  {
    src: 'endropeak_testimonials-ef88f54c-a2f3-4df6-968a-53cf5162380d.jpg',
    key: 'articles/low-testosterone-symptoms-testodren-review-testimonials.webp',
    id: 'testodren-testimonials',
    alt: 'Low testosterone symptoms - Testodren review',
  },
];

const urls = {};
const alts = {};

for (const f of files) {
  const raw = fs.readFileSync(path.join(SRC, f.src));
  const webp = await compressArticleImage(raw, {
    maxWidth: f.maxWidth || 900,
    maxHeight: f.maxHeight || 900,
  });
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: f.key,
    Body: webp,
    ContentType: 'image/webp',
  }));
  const url = `${R2_PUBLIC}/${f.key}`;
  urls[f.id] = url;
  alts[f.id] = f.alt;
  console.log(`${f.id} ${webp.length}b ${url}`);
}

function md(id) {
  return `![${alts[id]}](${urls[id]})`;
}

await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
const col = mongoose.connection.db.collection('articles');
const article = await col.findOne({ slug: SLUG });
if (!article) {
  console.error('Article not found');
  process.exit(1);
}

let content = article.content;
content = content.replace(/\n\n!\[Low testosterone symptoms[^\]]*\]\([^)]+\)/g, '');

const inserts = [
  [
    "And that's where I started.",
    `\n\n${md('endopeak-truth')}`,
  ],
  [
    'EndoPeak is almost the opposite.',
    `\n\n${md('endopeak-products')}`,
  ],
];

for (const [anchor, extra] of inserts) {
  if (!content.includes(anchor)) {
    console.error('Missing anchor:', anchor.slice(0, 80));
    process.exit(1);
  }
  content = content.replace(anchor, `${anchor}${extra}`);
}

const coverUrl = urls.cover;
const res = await col.updateOne(
  { slug: SLUG },
  {
    $set: {
      content,
      featuredImage: coverUrl,
      ogImage: coverUrl,
      twitterImage: coverUrl,
    },
  },
);
console.log('matched', res.matchedCount, 'modified', res.modifiedCount);
await mongoose.disconnect();
console.log('http://127.0.0.1:3939/blog/' + SLUG);
