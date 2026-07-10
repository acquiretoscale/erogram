/**
 * reoptimize-rename-of-creator-images.js
 *
 * Re-optimizes EVERY OnlyFans creator image (avatar, header, extraPhotos) and
 * renames it to SEO-friendly, index-alternating keys, then updates the DB.
 *
 * WHAT IT DOES (per creator):
 *   - Downloads the current avatar, header, and each extraPhotos[] (from R2 or anywhere)
 *   - Resizes to max 1400x1400 (never enlarges)
 *   - Encodes JPG, stepping quality down until the file lands ~150–300KB
 *   - Keeps EXIF "© Erogram.pro" branding (mozjpeg)
 *   - Uploads under NEW index-alternating keys:
 *        #1 → onlyfanssearch/{slug}-onlyfans-model.jpg
 *        #2 → onlyfanssearch/{slug}-onlyfans-creator.jpg
 *        #3 → onlyfanssearch/{slug}-onlyfans-model-3.jpg
 *        #4 → onlyfanssearch/{slug}-onlyfans-creator-4.jpg   ...
 *     (avatar = #1, header = #2, extraPhotos continue #3, #4, ...)
 *   - Updates DB: avatar, avatarThumbC50, avatarThumbC144, header, extraPhotos[]
 *     ORDER PRESERVED. avatarThumbC50/144 = new avatar URL.
 *
 * DELIBERATELY DOES NOT (owner decision):
 *   - Touch ads / paid rotation (TrendingOFCreator.pausedImageUrls left as-is).
 *     Renaming changes URLs, so any paused image will un-pause. Accepted.
 *
 * SAFE BY DEFAULT:
 *   - Old R2 files are NOT deleted (no mid-run 404s).
 *   - Skips the of-purged-creators blacklist.
 *   - Idempotent: skips images already on the new "-model/-creator" scheme.
 *
 * Usage:
 *   node --env-file=.env.local scripts/reoptimize-rename-of-creator-images.js --dry-run
 *   node --env-file=.env.local scripts/reoptimize-rename-of-creator-images.js --slug=some-creator
 *   node --env-file=.env.local scripts/reoptimize-rename-of-creator-images.js --slug=some-creator   (live, one creator)
 *   node --env-file=.env.local scripts/reoptimize-rename-of-creator-images.js                        (live, ALL)
 *   node --env-file=.env.local scripts/reoptimize-rename-of-creator-images.js --concurrency=4 --limit=100
 *
 * Flags:
 *   --dry-run        Log old→new + KB estimates, write NOTHING (no R2 upload, no DB write)
 *   --slug=X         Only this one creator (best for the first live test)
 *   --concurrency=N  Parallel creators (default 3, max 8)
 *   --limit=N        Only first N creators
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
const ONLY_SLUG = (args.find(a => a.startsWith('--slug=')) || '').replace('--slug=', '') || '';
const CONCURRENCY = Math.min(
  parseInt((args.find(a => a.startsWith('--concurrency=')) || '').replace('--concurrency=', '') || '3', 10),
  8
);
const LIMIT = parseInt((args.find(a => a.startsWith('--limit=')) || '').replace('--limit=', '') || '0', 10);

// ── Constants ────────────────────────────────────────────────────────────────
const EXIF_COPYRIGHT = '© Erogram.pro';
const EXIF_ARTIST = 'Erogram.pro';
const MAX_DIM = 1400;
// Owner priority: 150KB hard ceiling (file size over dimension). Quality won't suffer much.
const TARGET_MAX_BYTES = 150 * 1024;
// High → low. We pick the HIGHEST quality that is ≤150KB; if all steps are >150KB, take the smallest.
const QUALITY_STEPS = [90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40];
const DOWNLOAD_TIMEOUT_MS = 20000;

// of-purged-creators blacklist (brain). Never re-upload these.
const PURGED = new Set([
  'francety', 'ashleyyyreyyy', 'gem101', 'stellabrooks', 'babydollll',
  'amibuefree', 'amibuexo', 'pennylondon', 'pennylondonvip', 'melthewhale',
  'melthewhalefree', 'thevivonline', 'luciddreamexe', 'lu2hot', 'your_fatale',
  'bellajynx.free', 'kassqueen98', 'kassqueen98_free', 'yeah_bamby',
  'charlotte_rachel', 'bellebrooksxo', 'lioqueen', 'natashatosini', 'jocy_cosplay',
].map(u => u.toLowerCase()));

// ── R2 client ────────────────────────────────────────────────────────────────
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

// ── Helpers ──────────────────────────────────────────────────────────────────
/** Base slug without a trailing "-onlyfans" (some creator slugs already carry it). */
function baseSlug(slug) {
  return slug.endsWith('-onlyfans') ? slug.slice(0, -'-onlyfans'.length) : slug;
}

/** Index-alternating SEO key: even index → -model, odd index → -creator. i is 0-based. */
function keyForIndex(slug, i) {
  const role = i % 2 === 0 ? 'model' : 'creator';
  const suffix = i < 2 ? '' : `-${i + 1}`; // #1/#2 have no number; #3+ get their position
  return `onlyfanssearch/${baseSlug(slug)}-onlyfans-${role}${suffix}.jpg`;
}

/** True if a URL already points at a new-scheme key (idempotency guard). */
function isAlreadyRenamed(url, slug) {
  if (!url) return false;
  const b = baseSlug(slug);
  return url.includes(`/onlyfanssearch/${b}-onlyfans-model`) ||
         url.includes(`/onlyfanssearch/${b}-onlyfans-creator`);
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

function encode(buf, q) {
  return sharp(buf)
    .rotate()
    .resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: q, mozjpeg: true })
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

/**
 * Resize ≤1400px and choose the quality that best lands in the 150–300KB band.
 * Strategy: encode from highest→lowest quality; take the FIRST (highest-quality)
 * result that is ≤300KB. That naturally sits as close to 300KB as quality allows,
 * keeping most images in the 150–300KB band. If every step is >300KB, take the
 * smallest. If even the top step is <150KB, the source is just small — keep it.
 */
async function optimizeJpg(buf) {
  let firstUnderMax = null;
  let smallest = null;
  for (const q of QUALITY_STEPS) {
    const out = await encode(buf, q);
    if (!smallest || out.length < smallest.length) smallest = out;
    if (out.length <= TARGET_MAX_BYTES) { firstUnderMax = out; break; }
  }
  return firstUnderMax || smallest;
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

/** Process one source image into its target key. Returns URL, null (skip), or 'FAILED'. */
async function processOneImage(srcUrl, slug, i, label) {
  if (!srcUrl) return null;
  if (isAlreadyRenamed(srcUrl, slug)) return srcUrl; // already new scheme, keep as-is
  const key = keyForIndex(slug, i);

  if (DRY_RUN) {
    console.log(`    [dry-run] ${label} (#${i + 1}): ${srcUrl.substring(0, 55)}... → ${key}`);
    return `${R2_PUBLIC_URL}/${key}`;
  }

  const buf = await downloadImage(srcUrl);
  if (!buf) return 'FAILED';

  try {
    const optimized = await optimizeJpg(buf);
    const url = await uploadToR2(optimized, key);
    const kb = (optimized.length / 1024).toFixed(0);
    console.log(`    ✓ ${label} (#${i + 1}): ${kb}kB → ${key}`);
    return url;
  } catch (e) {
    console.log(`    ✗ ${label} (#${i + 1}): ${e.message}`);
    return 'FAILED';
  }
}

// ── Process one creator ──────────────────────────────────────────────────────
async function processCreator(c, col, index, total) {
  const slug = c.slug;
  const uname = (c.username || slug || '').toLowerCase();
  const tag = `[${index}/${total}] @${uname}`;

  if (PURGED.has(uname)) {
    console.log(`  ${tag} ⛔ blacklisted — skipped`);
    return false;
  }
  if (!slug) {
    console.log(`  ${tag} ⚠️ no slug — skipped`);
    return false;
  }

  const updates = {};
  let anyWork = false;

  // The full ordered set: [avatar, header, ...extraPhotos]. Indices are stable & alternate.
  // avatar = #1 (index 0), header = #2 (index 1), extras start at #3 (index 2).
  const avatarUrl = await processOneImage(c.avatar, slug, 0, 'avatar');
  if (avatarUrl && avatarUrl !== 'FAILED') {
    updates.avatar = avatarUrl;
    updates.avatarThumbC50 = avatarUrl;
    updates.avatarThumbC144 = avatarUrl;
    anyWork = true;
  }

  const headerUrl = await processOneImage(c.header, slug, 1, 'header');
  if (headerUrl && headerUrl !== 'FAILED') {
    updates.header = headerUrl;
    anyWork = true;
  }

  const extras = c.extraPhotos || [];
  if (extras.length > 0) {
    const newExtras = [];
    let extrasChanged = false;
    for (let j = 0; j < extras.length; j++) {
      const globalIdx = j + 2; // continues after avatar(0) + header(1)
      const r2Url = await processOneImage(extras[j], slug, globalIdx, `extra[${j + 1}]`);
      if (r2Url === 'FAILED' || r2Url == null) {
        newExtras.push(extras[j]); // keep original on failure/empty
      } else {
        newExtras.push(r2Url);
        if (r2Url !== extras[j]) { extrasChanged = true; anyWork = true; }
      }
    }
    if (extrasChanged) updates.extraPhotos = newExtras;
  }

  if (anyWork && !DRY_RUN && Object.keys(updates).length > 0) {
    await col.updateOne({ _id: c._id }, { $set: updates });
    console.log(`  ${tag} ✅ updated (${Object.keys(updates).join(', ')})`);
  } else if (anyWork && DRY_RUN) {
    console.log(`  ${tag} [dry-run] would update (${Object.keys(updates).join(', ')})`);
  }

  return anyWork;
}

// ── Run N tasks in parallel pools ────────────────────────────────────────────
async function runWithConcurrency(items, fn, concurrency) {
  let index = 0, done = 0, worked = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      const result = await fn(items[i], i + 1, items.length);
      if (result) worked++;
      done++;
      if (done % 50 === 0) {
        console.log(`\n  ── Progress: ${done}/${items.length} processed (${worked} changed) ──\n`);
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
  console.log('║  Erogram — Re-optimize + Rename OF Creator Images        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  if (DRY_RUN) console.log('\n⚠️  DRY RUN — no uploads or DB writes\n');
  if (ONLY_SLUG) console.log(`\n🎯 Single creator: ${ONLY_SLUG}\n`);
  console.log(`R2 host: ${R2_PUBLIC_URL}`);
  console.log(`Max dim: ${MAX_DIM}px | Target: ≤${(TARGET_MAX_BYTES / 1024).toFixed(0)}KB | Quality steps: ${QUALITY_STEPS.join(',')}`);
  console.log(`Concurrency: ${ONLY_SLUG ? 1 : CONCURRENCY}${LIMIT ? ` | Limit: ${LIMIT}` : ''}`);
  console.log('');

  await mongoose.connect(MONGO_URI);
  const col = mongoose.connection.db.collection('onlyfanscreators');

  const query = ONLY_SLUG
    ? { slug: ONLY_SLUG }
    : {
        deleted: { $ne: true },
        $or: [
          { avatar: { $exists: true, $ne: '' } },
          { header: { $exists: true, $ne: '' } },
          { 'extraPhotos.0': { $exists: true } },
        ],
      };

  let items = await col.find(query, {
    projection: { slug: 1, username: 1, avatar: 1, avatarThumbC50: 1, avatarThumbC144: 1, header: 1, extraPhotos: 1 },
  }).sort({ likesCount: -1 }).toArray();

  console.log(`Creators to scan: ${items.length}`);
  if (LIMIT > 0) { items = items.slice(0, LIMIT); console.log(`(limited to first ${LIMIT})`); }

  if (items.length === 0) {
    console.log('\n✅ Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  console.log('\nStarting...\n');

  const changed = await runWithConcurrency(
    items,
    (c, i, total) => processCreator(c, col, i, total),
    ONLY_SLUG ? 1 : CONCURRENCY
  );

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log(`║  DONE: ${changed} changed of ${items.length} scanned`.padEnd(59) + '║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
