/**
 * Re-process heavy group images: WebP + groups/{slug}-porn-telegram-group.webp
 *
 * Usage:
 *   node --env-file=.env.local scripts/migrate-heavy-group-images.mjs
 *   node --env-file=.env.local scripts/migrate-heavy-group-images.mjs --min-kb=150
 *   node --env-file=.env.local scripts/migrate-heavy-group-images.mjs --dry-run
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { MongoClient } from 'mongodb';
import sharp from 'sharp';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'erogramimages';
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
const MONGODB_URI = process.env.MONGODB_URI;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  }),
);
const MIN_KB = parseInt(args['min-kb'] || '150', 10);
const DRY_RUN = args['dry-run'] === 'true';

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_URL || !MONGODB_URI) {
  console.error('Missing env. Run: node --env-file=.env.local scripts/migrate-heavy-group-images.mjs');
  process.exit(1);
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

function slugify(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function groupImageKey(slug) {
  const base = slugify(slug).slice(0, 80) || 'group';
  return `groups/${base}-porn-telegram-group.webp`;
}

async function compress(buffer) {
  let out = await sharp(buffer, { animated: false })
    .rotate()
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  if (out.length > 200 * 1024) {
    out = await sharp(buffer, { animated: false })
      .rotate()
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 55 })
      .toBuffer();
  }
  if (out.length > 200 * 1024) {
    out = await sharp(buffer, { animated: false })
      .rotate()
      .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 45 })
      .toBuffer();
  }
  return out;
}

async function fetchImage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ErogramMigrate/1.0', Referer: 'https://erogram.pro/' },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function upload(key, buffer) {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  return `${R2_PUBLIC_URL}/${key}`;
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const groups = await client.db().collection('groups').find({
    image: { $regex: /^https:\/\//i },
    status: { $ne: 'deleted' },
  }).project({ name: 1, slug: 1, image: 1 }).toArray();

  console.log(`Checking ${groups.length} groups (min ${MIN_KB} KB)${DRY_RUN ? ' [DRY RUN]' : ''}...`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const g of groups) {
    const url = g.image;
    if (!url || url.includes('placeholder')) {
      skipped++;
      continue;
    }
    if (url.includes('-porn-telegram-group.webp')) {
      skipped++;
      continue;
    }

    try {
      const buf = await fetchImage(url);
      const kb = buf.length / 1024;
      if (kb < MIN_KB) {
        skipped++;
        continue;
      }

      const key = groupImageKey(g.slug || g.name);
      const compressed = await compress(buf);
      const newKb = compressed.length / 1024;

      if (DRY_RUN) {
        console.log(`[dry] ${g.name} | ${kb.toFixed(0)}KB -> ${newKb.toFixed(0)}KB | ${key}`);
        migrated++;
        continue;
      }

      const newUrl = await upload(key, compressed);
      await client.db().collection('groups').updateOne(
        { _id: g._id },
        { $set: { image: newUrl, updatedAt: new Date() } },
      );
      console.log(`OK ${g.slug} | ${kb.toFixed(0)}KB -> ${newKb.toFixed(0)}KB | ${newUrl}`);
      migrated++;
    } catch (err) {
      console.error(`FAIL ${g.slug}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. migrated=${migrated} skipped=${skipped} failed=${failed}`);
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
