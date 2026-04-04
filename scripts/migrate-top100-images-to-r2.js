const mongoose = require('mongoose');
const sharp = require('sharp');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'erogramimages';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_URL) {
  console.error('R2 env vars not set'); process.exit(1);
}

const EXIF_COPYRIGHT = '© Erogram.pro';
const EXIF_ARTIST = 'Erogram.pro';
const JPG_QUALITY = 95;

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

async function downloadImage(url) {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(20000) });
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
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

function isOnR2(url) {
  return url && url.includes(R2_PUBLIC_URL);
}

async function processOneImage(srcUrl, r2Key, label) {
  if (!srcUrl || isOnR2(srcUrl)) return srcUrl || null;
  const buf = await downloadImage(srcUrl);
  if (!buf) {
    console.log(`    ⚠ ${label}: download failed`);
    return null;
  }
  const optimized = await optimizeAndBrand(buf);
  const url = await uploadToR2(optimized, r2Key);
  const sizeMB = (optimized.length / 1024 / 1024).toFixed(2);
  console.log(`    ✓ ${label}: ${sizeMB}MB → ${r2Key}`);
  return url;
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const col = mongoose.connection.db.collection('onlyfanscreators');

  const creators = await col.find(
    { adminImported: true, deleted: { $ne: true } },
    { projection: { slug: 1, username: 1, avatar: 1, avatarThumbC50: 1, avatarThumbC144: 1, header: 1, extraPhotos: 1 } }
  ).sort({ likesCount: -1 }).toArray();

  console.log(`\nFound ${creators.length} adminImported creators\n`);

  const needsWork = creators.filter(c =>
    (c.avatar && !isOnR2(c.avatar)) ||
    (c.header && !isOnR2(c.header)) ||
    (c.extraPhotos || []).some(p => p && !isOnR2(p))
  );

  const alreadyDone = creators.length - needsWork.length;
  console.log(`Already on R2: ${alreadyDone}`);
  console.log(`Need processing: ${needsWork.length}\n`);

  let processed = 0;
  let errors = 0;

  for (const c of needsWork) {
    const slug = c.slug;
    console.log(`[${processed + 1}/${needsWork.length}] Processing @${c.username || slug}...`);

    try {
      const updates = {};

      const avatarR2 = await processOneImage(c.avatar, `onlyfanssearch/${slug}-onlyfans.jpg`, 'avatar');
      if (avatarR2 && !isOnR2(c.avatar)) {
        updates.avatar = avatarR2;
        updates.avatarThumbC50 = avatarR2;
        updates.avatarThumbC144 = avatarR2;
      }

      const headerR2 = await processOneImage(c.header, `onlyfanssearch/${slug}-onlyfans-header.jpg`, 'header');
      if (headerR2 && !isOnR2(c.header)) {
        updates.header = headerR2;
      }

      const extras = c.extraPhotos || [];
      if (extras.length > 0) {
        const newExtras = [];
        for (let i = 0; i < extras.length; i++) {
          const r2Url = await processOneImage(extras[i], `onlyfanssearch/${slug}-onlyfans-${i + 1}.jpg`, `extra[${i}]`);
          newExtras.push(r2Url || extras[i]);
        }
        if (newExtras.some((u, i) => u !== extras[i])) {
          updates.extraPhotos = newExtras;
        }
      }

      if (Object.keys(updates).length > 0) {
        await col.updateOne({ _id: c._id }, { $set: updates });
        console.log(`    ✅ DB updated (${Object.keys(updates).join(', ')})\n`);
      } else {
        console.log(`    ℹ Nothing to update\n`);
      }

      processed++;
    } catch (err) {
      console.error(`    ❌ Error: ${err.message}\n`);
      errors++;
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`DONE: ${processed} processed, ${errors} errors, ${alreadyDone} already on R2`);
  console.log(`Total: ${creators.length} creators`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
