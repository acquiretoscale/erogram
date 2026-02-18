/**
 * Migration script: Upload existing images from public/uploads/ to Cloudflare R2
 * and update MongoDB references.
 *
 * Usage: node scripts/migrate-images-to-r2.mjs
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

// --- Configuration ---
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'erogramimages';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const MONGODB_URI = process.env.MONGODB_URI;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_URL || !MONGODB_URI) {
  console.error('Missing environment variables. Make sure .env.local is loaded.');
  console.error('Run with: node --env-file=.env.local scripts/migrate-images-to-r2.mjs');
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

const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

async function fileExistsInR2(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadFile(localPath, r2Key) {
  const exists = await fileExistsInR2(r2Key);
  if (exists) {
    return `${R2_PUBLIC_URL}/${r2Key}`;
  }

  const fileBuffer = fs.readFileSync(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: r2Key,
      Body: fileBuffer,
      ContentType: contentType,
    })
  );

  return `${R2_PUBLIC_URL}/${r2Key}`;
}

async function migrateDirectory(dirName) {
  const localDir = path.join(PROJECT_ROOT, 'public', 'uploads', dirName);
  if (!fs.existsSync(localDir)) {
    console.log(`  Skipping ${dirName}/ (directory not found)`);
    return {};
  }

  const files = fs.readdirSync(localDir).filter(f => !f.startsWith('.'));
  const mapping = {};
  let uploaded = 0;
  let skipped = 0;

  for (const file of files) {
    const localPath = path.join(localDir, file);
    const r2Key = `${dirName}/${file}`;
    const oldDbPath = `/uploads/${dirName}/${file}`;

    try {
      const r2Url = await uploadFile(localPath, r2Key);
      mapping[oldDbPath] = r2Url;
      uploaded++;
      if (uploaded % 20 === 0) {
        console.log(`  ${dirName}: ${uploaded}/${files.length} uploaded...`);
      }
    } catch (err) {
      console.error(`  Failed to upload ${file}:`, err.message);
      skipped++;
    }
  }

  console.log(`  ${dirName}: ${uploaded} uploaded, ${skipped} failed (${files.length} total)`);
  return mapping;
}

async function updateDatabase(mapping, collectionName, mongo) {
  const db = mongo.db();
  const collection = db.collection(collectionName);

  let updated = 0;
  for (const [oldPath, newUrl] of Object.entries(mapping)) {
    const result = await collection.updateMany(
      { image: oldPath },
      { $set: { image: newUrl } }
    );
    if (result.modifiedCount > 0) {
      updated += result.modifiedCount;
    }
  }

  console.log(`  ${collectionName}: ${updated} documents updated`);
  return updated;
}

async function migrateBase64Images(mongo) {
  const db = mongo.db();
  const collections = ['groups', 'adverts', 'bots'];
  let totalMigrated = 0;

  for (const collName of collections) {
    const collection = db.collection(collName);
    const docs = await collection
      .find({ image: { $regex: '^data:image/' } })
      .project({ _id: 1, image: 1 })
      .toArray();

    if (docs.length === 0) {
      console.log(`  ${collName}: no base64 images found`);
      continue;
    }

    console.log(`  ${collName}: found ${docs.length} base64 images, migrating...`);

    for (const doc of docs) {
      try {
        const matches = doc.image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) continue;

        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const contentType = `image/${matches[1]}`;
        const key = `uploads/${doc._id.toString()}.${ext}`;

        const exists = await fileExistsInR2(key);
        if (!exists) {
          await r2.send(
            new PutObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: key,
              Body: buffer,
              ContentType: contentType,
            })
          );
        }

        const r2Url = `${R2_PUBLIC_URL}/${key}`;
        await collection.updateOne(
          { _id: doc._id },
          { $set: { image: r2Url } }
        );
        totalMigrated++;
      } catch (err) {
        console.error(`  Failed to migrate base64 for ${doc._id}:`, err.message);
      }
    }

    console.log(`  ${collName}: ${totalMigrated} base64 images migrated`);
  }

  return totalMigrated;
}

async function main() {
  console.log('=== Erogram Image Migration to Cloudflare R2 ===\n');

  // Step 1: Upload files from public/uploads/ to R2
  console.log('Step 1: Uploading local files to R2...');
  const groupsMapping = await migrateDirectory('groups');
  const advertsMapping = await migrateDirectory('adverts');
  const botsMapping = await migrateDirectory('bots');

  // Step 2: Connect to MongoDB and update references
  console.log('\nStep 2: Connecting to MongoDB...');
  const mongo = new MongoClient(MONGODB_URI);
  await mongo.connect();
  console.log('  Connected to MongoDB');

  // Step 3: Update DB paths from /uploads/... to R2 URLs
  console.log('\nStep 3: Updating database references (file paths)...');
  await updateDatabase(groupsMapping, 'groups', mongo);
  await updateDatabase(advertsMapping, 'adverts', mongo);
  await updateDatabase(botsMapping, 'bots', mongo);

  // Step 4: Migrate base64 images stored directly in MongoDB
  console.log('\nStep 4: Migrating base64 images from MongoDB to R2...');
  await migrateBase64Images(mongo);

  await mongo.close();
  console.log('\n=== Migration complete! ===');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
