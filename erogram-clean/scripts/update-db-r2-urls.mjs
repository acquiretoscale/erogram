/**
 * Update MongoDB image references from /uploads/... paths to R2 URLs.
 * Also migrates base64 images.
 *
 * Usage: node --env-file=.env.local scripts/update-db-r2-urls.mjs
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'erogramimages';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI || !R2_PUBLIC_URL || !R2_ACCOUNT_ID) {
  console.error('Missing env vars. Run: node --env-file=.env.local scripts/update-db-r2-urls.mjs');
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

async function main() {
  console.log('Connecting to MongoDB Atlas...');
  const mongo = new MongoClient(MONGODB_URI);
  await mongo.connect();
  const db = mongo.db();
  console.log('Connected!\n');

  const collections = ['groups', 'adverts', 'bots'];

  // Step 1: Update /uploads/ paths to R2 URLs
  console.log('=== Step 1: Update /uploads/ paths to R2 URLs ===');
  for (const collName of collections) {
    const coll = db.collection(collName);

    const docs = await coll
      .find({ image: { $regex: '^/uploads/' } })
      .project({ _id: 1, image: 1 })
      .toArray();

    if (docs.length === 0) {
      console.log(`  ${collName}: no /uploads/ paths found`);
      continue;
    }

    console.log(`  ${collName}: found ${docs.length} docs with /uploads/ paths`);
    let updated = 0;

    for (const doc of docs) {
      // /uploads/groups/foo.jpg → groups/foo.jpg
      const r2Key = doc.image.replace(/^\/uploads\//, '');
      const r2Url = `${R2_PUBLIC_URL}/${r2Key}`;

      await coll.updateOne({ _id: doc._id }, { $set: { image: r2Url } });
      updated++;
    }

    console.log(`  ${collName}: updated ${updated} documents`);
  }

  // Step 2: Migrate base64 data URIs to R2
  console.log('\n=== Step 2: Migrate base64 images to R2 ===');
  for (const collName of collections) {
    const coll = db.collection(collName);

    const docs = await coll
      .find({ image: { $regex: '^data:image/' } })
      .project({ _id: 1, image: 1 })
      .toArray();

    if (docs.length === 0) {
      console.log(`  ${collName}: no base64 images`);
      continue;
    }

    console.log(`  ${collName}: found ${docs.length} base64 images`);
    let migrated = 0;

    for (const doc of docs) {
      try {
        const matches = doc.image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) continue;

        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const contentType = `image/${matches[1]}`;
        const key = `uploads/${doc._id.toString()}.${ext}`;

        await r2.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: contentType,
          })
        );

        const r2Url = `${R2_PUBLIC_URL}/${key}`;
        await coll.updateOne({ _id: doc._id }, { $set: { image: r2Url } });
        migrated++;
      } catch (err) {
        console.error(`  Error migrating ${doc._id}:`, err.message);
      }
    }

    console.log(`  ${collName}: migrated ${migrated} base64 images`);
  }

  // Step 3: Migrate /api/images/ references
  console.log('\n=== Step 3: Check for /api/images/ references ===');
  for (const collName of collections) {
    const coll = db.collection(collName);
    const count = await coll.countDocuments({ image: { $regex: '^/api/images/' } });
    if (count > 0) {
      console.log(`  ${collName}: found ${count} docs with /api/images/ paths (MongoDB binary)`);
      console.log(`  NOTE: these need the old Image collection data to migrate`);
    } else {
      console.log(`  ${collName}: no /api/images/ paths`);
    }
  }

  // Summary: show remaining non-R2 images
  console.log('\n=== Summary: Remaining non-R2 image references ===');
  for (const collName of collections) {
    const coll = db.collection(collName);
    const nonR2 = await coll.countDocuments({
      image: { $exists: true, $ne: null, $not: { $regex: '^https://' } },
    });
    const total = await coll.countDocuments({ image: { $exists: true, $ne: null } });
    console.log(`  ${collName}: ${total} total with images, ${nonR2} still non-R2`);
  }

  await mongo.close();
  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
