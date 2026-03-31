/**
 * Bulk-process R2 images for top N creators in a category.
 * Usage: node scripts/process-images-category.js --category=streamer --limit=100
 * Skips creators that already have R2 images.
 */

const mongoose = require('mongoose');
const sharp = require('sharp');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const args = Object.fromEntries(
  process.argv.slice(2).map(a => a.replace('--', '').split('='))
);
const CATEGORY = args.category || 'streamer';
const LIMIT = parseInt(args.limit || '100', 10);

async function downloadImage(url) {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!resp.ok) return null;
    return Buffer.from(await resp.arrayBuffer());
  } catch { return null; }
}

async function optimizeAndUpload(buf, key) {
  const optimized = await sharp(buf)
    .jpeg({ quality: 95, mozjpeg: true })
    .withMetadata({ exif: { IFD0: { Copyright: '© Erogram.pro', Artist: 'Erogram.pro' } } })
    .toBuffer();
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || 'erogramimages',
    Key: key,
    Body: optimized,
    ContentType: 'image/jpeg',
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const creators = await db.collection('onlyfanscreators')
    .find({
      categories: CATEGORY,
      avatar: { $exists: true, $ne: '', $not: { $regex: 'r2.dev' } },
    })
    .sort({ likesCount: -1 })
    .limit(LIMIT)
    .project({ slug: 1, avatar: 1, header: 1 })
    .toArray();

  console.log(`Processing images for top ${creators.length} "${CATEGORY}" creators (sorted by likes)\n`);

  let ok = 0, failed = 0;

  for (const [i, c] of creators.entries()) {
    const updates = {};

    const avatarBuf = await downloadImage(c.avatar);
    if (avatarBuf) {
      try {
        updates.avatar = await optimizeAndUpload(avatarBuf, `onlyfanssearch/${c.slug}-onlyfans.jpg`);
      } catch (e) { failed++; }
    }

    if (c.header && !c.header.includes('r2.dev')) {
      const headerBuf = await downloadImage(c.header);
      if (headerBuf) {
        try {
          updates.header = await optimizeAndUpload(headerBuf, `onlyfanssearch/${c.slug}-onlyfans2.jpg`);
        } catch (e) { failed++; }
      }
    }

    if (Object.keys(updates).length) {
      await db.collection('onlyfanscreators').updateOne({ _id: c._id }, { $set: updates });
      ok++;
      process.stdout.write(`\r[${i + 1}/${creators.length}] Done: ${ok} ok, ${failed} failed`);
    } else {
      process.stdout.write(`\r[${i + 1}/${creators.length}] Skip: ${c.slug}`);
    }
  }

  console.log(`\n\nDone. ${ok} processed, ${failed} failed.`);
  await mongoose.disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
