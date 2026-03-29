/**
 * Migrate MongoDB Image collection (binary Buffer) → Cloudflare R2.
 *
 * What this does:
 *   1. Reads every doc from the `images` collection (binary data stored in MongoDB)
 *   2. Uploads each to R2 with an SEO-friendly filename derived from the original
 *   3. Stores a redirect mapping in `imageredirects` collection (for 301 fallback)
 *   4. Scans ALL collections for `/api/images/{id}` references and replaces them
 *   5. Reports results — does NOT drop the images collection (you do that manually)
 *
 * Usage:
 *   node --env-file=.env.local scripts/migrate-mongo-images-to-r2.mjs
 *   node --env-file=.env.local scripts/migrate-mongo-images-to-r2.mjs --dry-run
 *
 * After verifying, drop the images collection manually in Atlas:
 *   db.images.drop()
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { MongoClient, ObjectId } from 'mongodb';

// --- Config ---
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'erogramimages';
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
const MONGODB_URI = process.env.MONGODB_URI;
const DRY_RUN = process.argv.includes('--dry-run');

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_URL || !MONGODB_URI) {
  console.error('Missing env vars. Run with:');
  console.error('  node --env-file=.env.local scripts/migrate-mongo-images-to-r2.mjs');
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

const EXT_MAP = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

async function r2KeyExists(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
    return true;
  } catch {
    return false;
  }
}

// All collection + field combos that could contain `/api/images/{id}` URLs
const FIELDS_TO_SCAN = [
  { collection: 'groups', fields: ['image'] },
  { collection: 'bots', fields: ['image'] },
  { collection: 'adverts', fields: ['image'] },
  { collection: 'articles', fields: ['featuredImage', 'ogImage'] },
  { collection: 'campaigns', fields: ['creative'] },
  { collection: 'advertisers', fields: ['logo'] },
  { collection: 'storyslidecontents', fields: ['mediaUrl'] },
  { collection: 'ainsfwsubmissions', fields: ['image'] },
];

async function main() {
  console.log('=== Migrate MongoDB Image blobs → Cloudflare R2 ===\n');
  if (DRY_RUN) console.log('*** DRY RUN — no uploads or DB writes ***\n');

  const mongo = new MongoClient(MONGODB_URI);
  await mongo.connect();
  const db = mongo.db();
  console.log('Connected to MongoDB\n');

  // ── Step 1: Read all Image documents ──
  const imagesColl = db.collection('images');
  const totalImages = await imagesColl.countDocuments();
  console.log(`Step 1: Found ${totalImages} documents in 'images' collection\n`);

  if (totalImages === 0) {
    console.log('Nothing to migrate. The images collection is empty.');
    await mongo.close();
    return;
  }

  const redirectColl = db.collection('imageredirects');
  const idToUrl = new Map(); // oldId string → new R2 URL
  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  const cursor = imagesColl.find({});
  let index = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    index++;
    const oldId = doc._id.toString();

    try {
      const contentType = doc.contentType || 'image/jpeg';
      const ext = EXT_MAP[contentType] || '.jpg';
      const originalName = doc.filename
        ? slugify(doc.filename.replace(/\.[^.]+$/, ''))
        : oldId.slice(-8);
      const key = `uploads/${originalName}-${oldId.slice(-6)}${ext}`;

      // Get binary data
      let buffer;
      if (Buffer.isBuffer(doc.data)) {
        buffer = doc.data;
      } else if (doc.data && doc.data.buffer) {
        buffer = Buffer.from(doc.data.buffer);
      } else if (doc.data) {
        buffer = Buffer.from(doc.data);
      } else {
        console.warn(`  [${index}/${totalImages}] ${oldId}: no binary data, skipping`);
        skipped++;
        continue;
      }

      const r2Url = `${R2_PUBLIC_URL}/${key}`;

      if (!DRY_RUN) {
        const exists = await r2KeyExists(key);
        if (!exists) {
          await r2.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: contentType,
          }));
        }

        await redirectColl.updateOne(
          { _id: doc._id },
          { $set: { url: r2Url, migratedAt: new Date() } },
          { upsert: true }
        );
      }

      idToUrl.set(oldId, r2Url);
      uploaded++;

      if (uploaded % 10 === 0 || index === totalImages) {
        console.log(`  [${index}/${totalImages}] Uploaded ${uploaded}, skipped ${skipped}, errors ${errors}`);
      }
    } catch (err) {
      console.error(`  [${index}/${totalImages}] ${oldId}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nStep 1 complete: ${uploaded} uploaded, ${skipped} skipped, ${errors} errors\n`);

  // ── Step 2: Update all /api/images/ references across collections ──
  console.log('Step 2: Updating /api/images/ references in all collections...\n');
  let totalUpdated = 0;

  for (const { collection, fields } of FIELDS_TO_SCAN) {
    const coll = db.collection(collection);

    for (const field of fields) {
      const docs = await coll
        .find({ [field]: { $regex: '/api/images/' } })
        .project({ _id: 1, [field]: 1 })
        .toArray();

      if (docs.length === 0) continue;

      console.log(`  ${collection}.${field}: found ${docs.length} references`);
      let fieldUpdated = 0;

      for (const doc of docs) {
        const oldValue = doc[field];
        if (!oldValue) continue;

        // Extract the MongoDB ObjectId from the URL: /api/images/{id}
        const match = oldValue.match(/\/api\/images\/([a-f0-9]{24})/);
        if (!match) continue;

        const oldImageId = match[1];
        const newUrl = idToUrl.get(oldImageId);

        if (!newUrl) {
          console.warn(`    ${collection} ${doc._id}: image ${oldImageId} not found in migration map`);
          continue;
        }

        if (!DRY_RUN) {
          await coll.updateOne({ _id: doc._id }, { $set: { [field]: newUrl } });
        }
        fieldUpdated++;
      }

      if (fieldUpdated > 0) {
        console.log(`    → updated ${fieldUpdated} documents`);
        totalUpdated += fieldUpdated;
      }
    }
  }

  // Also scan SiteConfig for nested image fields
  const siteConfigs = await db.collection('siteconfigs').find({}).toArray();
  for (const sc of siteConfigs) {
    const json = JSON.stringify(sc);
    if (!json.includes('/api/images/')) continue;

    const replaced = json.replace(/\/api\/images\/([a-f0-9]{24})/g, (full, id) => {
      return idToUrl.get(id) || full;
    });

    if (replaced !== json && !DRY_RUN) {
      const parsed = JSON.parse(replaced);
      delete parsed._id;
      await db.collection('siteconfigs').updateOne({ _id: sc._id }, { $set: parsed });
      console.log(`  siteconfigs: updated doc ${sc._id}`);
      totalUpdated++;
    }
  }

  console.log(`\nStep 2 complete: ${totalUpdated} references updated across all collections\n`);

  // ── Step 3: Summary ──
  console.log('=== Summary ===');
  console.log(`  Images uploaded to R2:        ${uploaded}`);
  console.log(`  Images skipped (no data):     ${skipped}`);
  console.log(`  Upload errors:                ${errors}`);
  console.log(`  DB references updated:        ${totalUpdated}`);
  console.log(`  Redirect mappings stored:     ${idToUrl.size} (in 'imageredirects' collection)`);
  console.log('');
  if (DRY_RUN) {
    console.log('This was a DRY RUN. No changes were made.');
    console.log('Remove --dry-run to execute for real.');
  } else {
    console.log('Migration complete! Next steps:');
    console.log('  1. Verify images load correctly on the site');
    console.log('  2. The /api/images/[id] route now 301-redirects to R2');
    console.log('  3. After a few weeks, drop the images collection:');
    console.log('     db.images.drop()');
    console.log('  4. Then remove /api/images/[id]/route.ts and the Image model');
  }

  await mongo.close();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
