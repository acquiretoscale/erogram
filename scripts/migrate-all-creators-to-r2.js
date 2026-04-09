/**
 * migrate-all-creators-to-r2.js
 *
 * Migrates ALL creator images (avatar, header, extraPhotos) from public.onlyfans.com
 * (or any non-R2 host) to Cloudflare R2, with Erogram EXIF branding.
 *
 * Naming convention:
 *   avatar  → onlyfanssearch/{slug}-onlyfans.jpg
 *   header  → onlyfanssearch/{slug}-onlyfans-header.jpg
 *   extras  → onlyfanssearch/{slug}-onlyfans-1.jpg, ...-2.jpg, etc.
 *
 * Usage:
 *   node --env-file=.env.local scripts/migrate-all-creators-to-r2.js
 *   node --env-file=.env.local scripts/migrate-all-creators-to-r2.js --dry-run
 *   node --env-file=.env.local scripts/migrate-all-creators-to-r2.js --concurrency=5
 *   node --env-file=.env.local scripts/migrate-all-creators-to-r2.js --limit=500
 *
 * Flags:
 *   --dry-run       Show what would be processed without uploading or updating DB
 *   --concurrency=N Process N creators in parallel (default: 3, max: 8)
 *   --limit=N       Only process first N un-migrated creators (useful for testing)
 */

const mongoose = require('mongoose');
const sharp = require('sharp');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

// ── Config ──────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'erogramimages';
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

if (!MONGO_URI) { console.error('❌ MONGODB_URI not set'); process.exit(1); }
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_URL) {
  console.error('❌ R2 env vars missing (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL)');
  process.exit(1);
}

// ── Parse args ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const CONCURRENCY = Math.min(
  parseInt((args.find(a => a.startsWith('--concurrency=')) || '').replace('--concurrency=', '') || '3', 10),
  8
);
const LIMIT = parseInt((args.find(a => a.startsWith('--limit=')) || '').replace('--limit=', '') || '0', 10);

// ── Constants ────────────────────────────────────────────────────────────────
const EXIF_COPYRIGHT = '© Erogram.pro';
const EXIF_ARTIST = 'Erogram.pro';
const JPG_QUALITY = 95;
const DOWNLOAD_TIMEOUT_MS = 20000;

// ── R2 client ────────────────────────────────────────────────────────────────
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function isOnR2(url) {
  return !!(url && url.includes(R2_PUBLIC_URL));
}

async function downloadImage(url) {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
    if (!resp.ok) return null;
    return Buffer.from(await resp.arrayBuffer());
  } catch {
    return null;
  }
}

async function optimizeAndBrand(buf) {
  return sharp(buf)
    .jpeg({ quality: JPG_QUALITY, mozjpeg: true })
    .withMetadata({
      exif: {
        IFD0: {
          Copyright: EXIF_COPYRIGHT,
          Artist: EXIF_ARTIST,
          ImageDescription: 'Erogram.pro - OnlyFans Creator Directory',
        },
      },
    })
    .toBuffer();
}

async function uploadToR2(buffer, key) {
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: 'image/jpeg',
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

async function processOneImage(srcUrl, r2Key, label) {
  if (!srcUrl || isOnR2(srcUrl)) return null; // null = nothing to do
  if (DRY_RUN) {
    console.log(`    [dry-run] ${label}: ${srcUrl.substring(0, 60)}... → ${r2Key}`);
    return `${R2_PUBLIC_URL}/${r2Key}`; // fake URL for dry-run counting
  }
  const buf = await downloadImage(srcUrl);
  if (!buf) {
    return 'FAILED';
  }
  try {
    const optimized = await optimizeAndBrand(buf);
    const url = await uploadToR2(optimized, r2Key);
    const sizekB = (optimized.length / 1024).toFixed(0);
    console.log(`    ✓ ${label}: ${sizekB}kB → ${r2Key}`);
    return url;
  } catch (e) {
    console.log(`    ✗ ${label}: upload failed — ${e.message}`);
    return 'FAILED';
  }
}

// ── Process one creator ──────────────────────────────────────────────────────
async function processCreator(c, col, index, total) {
  const slug = c.slug;
  const tag = `[${index}/${total}] @${c.username || slug}`;

  const updates = {};
  let anyWork = false;

  // Avatar
  const avatarR2 = await processOneImage(c.avatar, `onlyfanssearch/${slug}-onlyfans.jpg`, 'avatar');
  if (avatarR2 && avatarR2 !== 'FAILED') {
    updates.avatar = avatarR2;
    updates.avatarThumbC50 = avatarR2;
    updates.avatarThumbC144 = avatarR2;
    anyWork = true;
  }

  // Header
  const headerR2 = await processOneImage(c.header, `onlyfanssearch/${slug}-onlyfans-header.jpg`, 'header');
  if (headerR2 && headerR2 !== 'FAILED') {
    updates.header = headerR2;
    anyWork = true;
  }

  // Extra photos
  const extras = c.extraPhotos || [];
  if (extras.length > 0) {
    const newExtras = [];
    let extrasChanged = false;
    for (let i = 0; i < extras.length; i++) {
      if (!extras[i] || isOnR2(extras[i])) {
        newExtras.push(extras[i]);
        continue;
      }
      const r2Url = await processOneImage(extras[i], `onlyfanssearch/${slug}-onlyfans-${i + 1}.jpg`, `extra[${i + 1}]`);
      if (r2Url && r2Url !== 'FAILED') {
        newExtras.push(r2Url);
        extrasChanged = true;
        anyWork = true;
      } else {
        newExtras.push(extras[i]); // keep original if failed
      }
    }
    if (extrasChanged) updates.extraPhotos = newExtras;
  }

  if (anyWork && !DRY_RUN && Object.keys(updates).length > 0) {
    await col.updateOne({ _id: c._id }, { $set: updates });
    console.log(`  ${tag} ✅ updated (${Object.keys(updates).join(', ')})`);
  } else if (anyWork && DRY_RUN) {
    console.log(`  ${tag} [dry-run] would update (${Object.keys(updates).join(', ')})`);
  } else if (!anyWork) {
    // nothing needed (already R2 or all downloads failed)
  }

  return anyWork;
}

// ── Run N tasks in parallel pools ────────────────────────────────────────────
async function runWithConcurrency(items, fn, concurrency) {
  let index = 0;
  let done = 0;
  let worked = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      const result = await fn(items[i], i + 1, items.length);
      if (result) worked++;
      done++;
      if (done % 50 === 0) {
        console.log(`\n  ── Progress: ${done}/${items.length} processed (${worked} migrated) ──\n`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return worked;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   Erogram — Migrate ALL Creator Images to Cloudflare R2  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  if (DRY_RUN) console.log('\n⚠️  DRY RUN — no uploads or DB writes\n');
  console.log(`R2 host: ${R2_PUBLIC_URL}`);
  console.log(`Concurrency: ${CONCURRENCY}${LIMIT ? ` | Limit: ${LIMIT}` : ''}`);
  console.log('');

  await mongoose.connect(MONGO_URI);
  const col = mongoose.connection.db.collection('onlyfanscreators');

  // Find ALL creators with at least one image NOT on R2
  const query = {
    deleted: { $ne: true },
    $or: [
      { avatar: { $exists: true, $ne: '', $not: { $regex: R2_PUBLIC_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') } } },
      { header: { $exists: true, $ne: '', $not: { $regex: R2_PUBLIC_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') } } },
      { 'extraPhotos.0': { $exists: true, $not: { $regex: R2_PUBLIC_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') } } },
    ],
  };

  const totalCreators = await col.countDocuments({ deleted: { $ne: true } });
  let cursor = col.find(query, {
    projection: { slug: 1, username: 1, avatar: 1, avatarThumbC50: 1, avatarThumbC144: 1, header: 1, extraPhotos: 1 },
  }).sort({ likesCount: -1 });

  let needsWork = await cursor.toArray();

  const alreadyOnR2 = totalCreators - needsWork.length;
  console.log(`Total creators in DB:  ${totalCreators}`);
  console.log(`Already fully on R2:   ${alreadyOnR2}`);
  console.log(`Need migration:        ${needsWork.length}`);

  if (LIMIT > 0) {
    needsWork = needsWork.slice(0, LIMIT);
    console.log(`(limited to first ${LIMIT})`);
  }

  if (needsWork.length === 0) {
    console.log('\n✅ Nothing to do — all creators are already on R2!');
    await mongoose.disconnect();
    return;
  }

  console.log('\nStarting migration...\n');

  const migrated = await runWithConcurrency(
    needsWork,
    (c, i, total) => processCreator(c, col, i, total),
    CONCURRENCY
  );

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log(`║  DONE: ${migrated} migrated, ${needsWork.length - migrated} skipped/failed (${needsWork.length} total)`.padEnd(59) + '║');
  console.log(`║  Already on R2 before run: ${alreadyOnR2}`.padEnd(59) + '║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
