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
const SLUG = 'the-ai-girlfriend-app-thousands-are-switching-to';

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
    src: 'horneydreams_ai_-_ai_girlfriend_app_voice-711e4ae4-9142-4a61-99d9-c5980d2e41e3.png',
    key: 'articles/horneydreams-ai-ai-girlfriend-app-voice.webp',
    id: 'voice',
  },
  {
    src: 'horneydreams_ai_-_ai_girlfriend_app_relationship_style-094a1b88-0713-4a90-a72f-ebb3895ffdcb.png',
    key: 'articles/horneydreams-ai-ai-girlfriend-app-relationship-style.webp',
    id: 'relationship',
  },
  {
    src: 'horneydreams_ai_-_ai_girlfriend_app_-_kink-da7ece37-acff-46be-b810-3ead3132f775.png',
    key: 'articles/horneydreams-ai-ai-girlfriend-app-kink.webp',
    id: 'kink',
  },
  {
    src: 'horneydreams_ai_-_ai_girlfriend_app-creatjion-356ff7df-176d-4bdb-ab3b-bdcb6dab4ac8.jpg',
    key: 'articles/horneydreams-ai-ai-girlfriend-app-creatjion.webp',
    id: 'creatjion',
  },
  {
    src: 'horneydreams_ai_-_ai_girlfriend_app-7ed245e5-d33f-4a9a-9a03-255551855220.jpg',
    key: 'articles/horneydreams-ai-ai-girlfriend-app.webp',
    id: 'app',
  },
  {
    src: 'horneydreams_ai_-_ai_girlfriend_app_create-be9da29f-8345-4679-90c9-ef0cadc2624d.jpg',
    key: 'articles/horneydreams-ai-ai-girlfriend-app-create.webp',
    id: 'create',
  },
  {
    src: 'horneydreams_ai_-_ai_girlfriend_app_ffee-f055fd3a-d96f-4314-b7b4-8637a319c5af.jpg',
    key: 'articles/horneydreams-ai-ai-girlfriend-app-ffee.webp',
    id: 'ffee',
  },
];

const urls = {};
const alts = {};

for (const f of files) {
  const raw = fs.readFileSync(path.join(SRC, f.src));
  const webp = await compressArticleImage(raw);
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: f.key,
    Body: webp,
    ContentType: 'image/webp',
  }));
  const url = `${R2_PUBLIC}/${f.key}`;
  const alt = path.basename(f.key, '.webp');
  urls[f.id] = url;
  alts[f.id] = alt;
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
content = content.replace(/\n\n!\[[^\]]*horneydreams-ai-ai-girlfriend-app[^\]]*\]\([^)]+\)/g, '');

const inserts = [
  [
    'The result is not a generic AI slut off a shelf. It is one shaped specifically around the user.',
    `\n\n${md('creatjion')}\n\n${md('create')}\n\n${md('relationship')}\n\n${md('kink')}`,
  ],
  [
    'Users can add Hornydreams AI to the home screen and use it like a native app.',
    `\n\n${md('app')}`,
  ],
  [
    'This is where Hornydreams AI goes past text and into something that feels alive.',
    `\n\n${md('voice')}`,
  ],
  [
    'The image quality is high, with strong photorealism, accurate anatomy, and consistent facial features that match the avatar every time.',
    `\n\n${md('ffee')}`,
  ],
];

for (const [anchor, extra] of inserts) {
  if (!content.includes(anchor)) {
    console.error('Missing anchor:', anchor.slice(0, 60));
    process.exit(1);
  }
  content = content.replace(anchor, `${anchor}${extra}`);
}

const res = await col.updateOne(
  { slug: SLUG },
  {
    $set: {
      content,
      featuredImage: urls.app,
      ogImage: urls.app,
      twitterImage: urls.app,
    },
  },
);
console.log('matched', res.matchedCount, 'modified', res.modifiedCount);
await mongoose.disconnect();
console.log('http://127.0.0.1:3939/blog/' + SLUG);
