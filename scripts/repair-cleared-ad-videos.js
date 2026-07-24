/**
 * Re-migrate videos that were cleared after a failed ffmpeg pass.
 * Run: node --env-file=.env.local scripts/repair-cleared-ad-videos.js
 */
const mongoose = require('mongoose');
const { writeFile, readFile, unlink } = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'erogramimages';
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const REPAIRS = [
  {
    sourceUrl: 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/campaigns/videos/1b68aee4-afd2-4d62-8626-36df50574c0a.mp4',
    advertiserName: 'cpamatica',
    niche: 'wild-nights',
    campaignName: 'Craving Wild Nights?',
    disambiguator: 'd7476a',
    matchNames: ['Craving Wild Nights?', 'Your personal AI fuckdoll just came online… (copy)'],
  },
  {
    sourceUrl: 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/campaigns/videos/08c251cf-7955-47ca-ac9f-019112df6521.mp4',
    advertiserName: 'cpamatica',
    niche: 'pure-lust-zero-drama',
    campaignName: 'Pure Lust, Zero Drama',
    disambiguator: 'd74779',
    matchNames: ['Pure Lust, Zero Drama'],
  },
];

function slugify(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function buildSlug(advertiserName, niche, disambiguator) {
  return `${slugify(advertiserName)}-${slugify(niche)}-erogram-ad-${disambiguator}`.slice(0, 120);
}

async function uploadVideo(buffer, key, meta) {
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: 'video/mp4',
    ContentDisposition: `inline; filename="${key.split('/').pop()}"`,
    Metadata: {
      advertiser: slugify(meta.advertiserName).slice(0, 120),
      niche: slugify(meta.niche).slice(0, 120),
      platform: 'erogram',
      campaign: slugify(meta.campaignName).slice(0, 120),
    },
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const col = mongoose.connection.db.collection('campaigns');

  for (const item of REPAIRS) {
    const res = await fetch(item.sourceUrl);
    if (!res.ok) throw new Error(`Download failed for ${item.campaignName}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const key = `campaigns/videos/${buildSlug(item.advertiserName, item.niche, item.disambiguator)}.mp4`;
    const url = await uploadVideo(buf, key, item);
    const update = await col.updateMany(
      { name: { $in: item.matchNames } },
      { $set: { videoUrl: url } },
    );
    console.log(`✓ ${item.campaignName}: ${(buf.length / 1024 / 1024).toFixed(2)}MB → ${url}`);
    console.log(`  updated ${update.modifiedCount} campaigns`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
