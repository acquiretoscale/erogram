/**
 * Fetch missing images: match groups/bots/adverts with placeholder or invalid
 * images to files in the "missing images" folder, upload to R2, and update MongoDB.
 *
 * Usage:
 *   node --env-file=.env.local scripts/fetch-missing-images.mjs
 *   node --env-file=.env.local scripts/fetch-missing-images.mjs --dir="/path/to/missing images"
 *   node --env-file=.env.local scripts/fetch-missing-images.mjs --dry-run   # preview only, no uploads
 *
 * For live website: run with .env pointing to production MONGODB_URI and R2.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

// --- Parse args ---
const args = process.argv.slice(2);
let missingImagesDir = path.join(PROJECT_ROOT, '..', 'missing images');
const dirArg = args.find((a) => a.startsWith('--dir='));
if (dirArg) {
  missingImagesDir = dirArg.slice('--dir='.length).replace(/^["']|["']$/g, '');
}
const DRY_RUN = args.includes('--dry-run');

// --- Config ---
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'erogramimages';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const MONGODB_URI = process.env.MONGODB_URI;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_URL || !MONGODB_URI) {
  console.error('Missing env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL, MONGODB_URI');
  console.error('Run with: node --env-file=.env.local scripts/fetch-missing-images.mjs');
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

const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

function isMissingImage(stored) {
  if (!stored || typeof stored !== 'string') return true;
  if (stored.startsWith('https://')) return false;
  return true; // placeholder, /assets/image.jpg, /uploads/..., etc.
}

/** Build map: base name (no ext) -> [{ path, ext }]. Prefer exact slug match. */
function buildFileMap(dirPath) {
  const map = new Map(); // baseName -> [{ path, ext }]
  if (!fs.existsSync(dirPath)) return map;
  const files = fs.readdirSync(dirPath).filter((f) => !f.startsWith('.'));
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!EXTENSIONS.includes(ext)) continue;
    const base = path.basename(file, ext).toLowerCase();
    const fullPath = path.join(dirPath, file);
    if (!map.has(base)) map.set(base, []);
    map.get(base).push({ path: fullPath, ext });
  }
  return map;
}

/** Build a list of all image files from a folder (for fallback pool). Each used once. */
function buildAdvertFallbackPool() {
  const dirPath = path.join(missingImagesDir, 'adverts');
  const pool = [];
  if (!fs.existsSync(dirPath)) return pool;
  const files = fs.readdirSync(dirPath).filter((f) => !f.startsWith('.'));
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!EXTENSIONS.includes(ext)) continue;
    pool.push({ path: path.join(dirPath, file), ext });
  }
  return pool;
}

/** Find best matching file for slug. Returns { path, ext } or null. */
function findMatch(slug, fileMap, manualMap, dirName) {
  const slugLower = slug.toLowerCase();
  // 0) Manual mapping (slug -> filename e.g. "private-uncensored" -> "beurette-uncensored.jpg")
  if (manualMap && manualMap[slugLower]) {
    const filename = manualMap[slugLower];
    const fullPath = path.join(missingImagesDir, dirName, path.basename(filename));
    if (fs.existsSync(fullPath)) {
      const ext = path.extname(filename).toLowerCase();
      return { path: fullPath, ext };
    }
  }
  // 1) Exact match (e.g. slug "ai-nsfw" and file "ai-nsfw.jpg")
  if (fileMap.has(slugLower)) {
    const arr = fileMap.get(slugLower);
    return arr[0];
  }
  // 2) Slug starts with a file base (e.g. slug "ai-nsfw-18" matches file base "ai-nsfw")
  let entries = [...fileMap.entries()].filter(([base]) => slugLower.startsWith(base));
  if (entries.length > 0) {
    entries.sort((a, b) => b[0].length - a[0].length);
    return entries[0][1][0];
  }
  // 3) File base starts with slug (e.g. slug "nsfw-collection" matches "nsfw-collection-1.webp")
  entries = [...fileMap.entries()].filter(([base]) => base.startsWith(slugLower));
  if (entries.length > 0) {
    entries.sort((a, b) => a[0].length - b[0].length); // prefer shortest (exact-ish)
    return entries[0][1][0];
  }
  return null;
}

async function uploadToR2(localPath, r2Key) {
  const buffer = fs.readFileSync(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || 'image/jpeg';
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: r2Key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return `${R2_PUBLIC_URL.replace(/\/$/, '')}/${r2Key}`;
}

async function processCollection(mongo, collectionName, dirName, manualMap, advertFallbackPool) {
  const db = mongo.db();
  const coll = db.collection(collectionName);
  const dirPath = path.join(missingImagesDir, dirName);
  const fileMap = buildFileMap(dirPath);
  const mapForCollection = manualMap && manualMap[collectionName] ? manualMap[collectionName] : null;
  const useAdvertFallback = Array.isArray(advertFallbackPool) && (collectionName === 'groups' || collectionName === 'bots');

  const docs = await coll
    .find({ $or: [{ image: { $exists: false } }, { image: '' }, { image: '/assets/image.jpg' }, { image: { $not: { $regex: '^https://' } } }] })
    .project({ _id: 1, slug: 1, name: 1, image: 1 })
    .toArray();

  let updated = 0;
  let skipped = 0;
  let fallbackUsed = 0;

  for (const doc of docs) {
    const slug = doc.slug;
    if (!slug) {
      skipped++;
      continue;
    }
    let match = findMatch(slug, fileMap, mapForCollection, dirName);
    let usedFallback = false;
    if (!match && useAdvertFallback && advertFallbackPool.length > 0) {
      match = advertFallbackPool.shift();
      fallbackUsed++;
      usedFallback = true;
    }
    if (!match) {
      if (updated + skipped <= 5 || skipped < 3) console.log(`  No file for slug: ${slug} (${doc.name})`);
      skipped++;
      continue;
    }
    const ext = match.ext;
    const r2Key = `${dirName}/${slug}${ext}`;
    try {
      if (DRY_RUN) {
        console.log(`  [dry-run] would set ${collectionName} ${slug} -> ${r2Key}`);
        if (usedFallback) {
          console.log(`           (filled from adverts fallback: ${path.basename(match.path)})`);
        }
        updated++;
      } else {
        if (usedFallback) {
          console.log(`  ${collectionName}: filling ${slug} from adverts fallback: ${path.basename(match.path)}`);
        }
        const url = await uploadToR2(match.path, r2Key);
        await coll.updateOne({ _id: doc._id }, { $set: { image: url } });
        updated++;
        if (updated % 10 === 0) console.log(`  ${collectionName}: ${updated} updated...`);
      }
    } catch (err) {
      console.error(`  Failed ${collectionName} ${slug}:`, err.message);
      skipped++;
      if (usedFallback) {
        advertFallbackPool.unshift(match);
        fallbackUsed--;
      }
    }
  }

  if (fallbackUsed > 0) console.log(`  ${collectionName}: ${fallbackUsed} filled from adverts fallback`);
  console.log(`  ${collectionName}: ${updated} updated, ${skipped} skipped (${docs.length} with missing image)`);
  return { updated, skipped };
}

async function main() {
  console.log('=== Fetch missing images → R2 + MongoDB ===\n');
  if (DRY_RUN) console.log('DRY RUN (no uploads or DB updates)\n');
  console.log('Missing images dir:', missingImagesDir);
  if (!fs.existsSync(missingImagesDir)) {
    console.error('Directory not found:', missingImagesDir);
    console.error('Use --dir="/path/to/missing images" if needed.');
    process.exit(1);
  }

  // Optional: load manual slug -> filename mapping (e.g. for groups with no matching file in folder)
  let manualMapping = null;
  const mappingPath = path.join(PROJECT_ROOT, 'scripts', 'missing-images-mapping.json');
  if (fs.existsSync(mappingPath)) {
    try {
      manualMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
      console.log('Loaded manual mapping from scripts/missing-images-mapping.json\n');
    } catch (e) {
      console.warn('Could not parse missing-images-mapping.json:', e.message);
    }
  }

  const advertFallbackPool = buildAdvertFallbackPool();
  if (advertFallbackPool.length > 0) {
    console.log(`Advert fallback pool: ${advertFallbackPool.length} images (used only for groups/bots with no match, each image once)\n`);
  }

  const mongo = new MongoClient(MONGODB_URI);
  await mongo.connect();
  console.log('Connected to MongoDB\n');

  let totalUpdated = 0;
  totalUpdated += (await processCollection(mongo, 'groups', 'groups', manualMapping, advertFallbackPool)).updated;
  totalUpdated += (await processCollection(mongo, 'bots', 'bots', manualMapping, advertFallbackPool)).updated;
  totalUpdated += (await processCollection(mongo, 'adverts', 'adverts', manualMapping, null)).updated;

  await mongo.close();
  console.log('\n=== Done. Total documents updated:', totalUpdated, '===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
