/**
 * Upload the PornCreate / DENUDE AI ad video to R2 with SEO name + Erogram.pro metadata,
 * then backfill the same site/copyright metadata onto every existing ad video.
 *
 * Run: node --env-file=.env.local scripts/upload-porncreate-video.js <path-to-video>
 */
const { readFile, writeFile, unlink } = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'erogramimages';
const VIDEO_PREFIX = 'campaigns/videos';

const ADVERTISER = 'porncreate';
const NICHE = 'denude-ai-nsfw-tool';
const CAMPAIGN_NAME = 'DENUDE AI NSFW tool';
const DESTINATION = 'https://porncreate.app/';

if (!R2_PUBLIC_URL) {
  console.error('R2_PUBLIC_URL not set');
  process.exit(1);
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

let ffmpeg;
try {
  ffmpeg = require('fluent-ffmpeg');
  ffmpeg.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path);
} catch {
  ffmpeg = null;
}

function slugify(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function buildMetadata({ advertiser, niche, campaign }) {
  return {
    advertiser: slugify(advertiser).slice(0, 120),
    niche: slugify(niche).slice(0, 120),
    platform: 'erogram',
    site: 'erogram.pro',
    copyright: 'Erogram.pro',
    campaign: slugify(campaign || '').slice(0, 120),
  };
}

function compressVideo(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .audioBitrate('128k')
      .outputOptions([
        '-crf', '22',
        '-preset', 'fast',
        '-vf', 'scale=-2:\'min(720,ih)\'',
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
      ])
      .format('mp4')
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath);
  });
}

async function uploadNewVideo(sourcePath) {
  const slug = `${ADVERTISER}-${NICHE}-erogram-ad`;
  const key = `${VIDEO_PREFIX}/${slug}.mp4`;
  const id = randomUUID();
  const tmpIn = path.join('/tmp', `${id}-in.mp4`);
  const tmpOut = path.join('/tmp', `${id}-out.mp4`);

  const raw = await readFile(sourcePath);
  console.log(`Source: ${sourcePath} (${(raw.length / 1024 / 1024).toFixed(2)} MB)`);

  let finalBuffer = raw;
  if (ffmpeg) {
    try {
      await writeFile(tmpIn, raw);
      await compressVideo(tmpIn, tmpOut);
      finalBuffer = await readFile(tmpOut);
      console.log(`Optimized: ${(finalBuffer.length / 1024 / 1024).toFixed(2)} MB (720p, faststart)`);
    } catch (err) {
      console.log(`ffmpeg failed, uploading source bytes: ${err.message}`);
      finalBuffer = raw;
    }
  }

  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: finalBuffer,
    ContentType: 'video/mp4',
    ContentDisposition: `inline; filename="${slug}.mp4"`,
    CacheControl: 'public, max-age=31536000, immutable',
    Metadata: buildMetadata({ advertiser: ADVERTISER, niche: NICHE, campaign: CAMPAIGN_NAME }),
  }));

  unlink(tmpIn).catch(() => {});
  unlink(tmpOut).catch(() => {});

  return `${R2_PUBLIC_URL}/${key}`;
}

async function backfillMetadata(skipKey) {
  let token;
  let updated = 0;
  do {
    const res = await r2.send(new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: `${VIDEO_PREFIX}/`,
      MaxKeys: 1000,
      ContinuationToken: token,
    }));

    for (const obj of res.Contents || []) {
      if (!obj.Key || !obj.Key.endsWith('.mp4')) continue;
      if (obj.Key === skipKey) continue;
      if (!/-erogram-ad(?:-[a-z0-9]+)?\.mp4$/i.test(obj.Key)) continue;

      const head = await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: obj.Key }));
      const existing = head.Metadata || {};
      if (existing.site === 'erogram.pro' && existing.copyright === 'Erogram.pro') continue;

      await r2.send(new CopyObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: obj.Key,
        CopySource: `${R2_BUCKET_NAME}/${encodeURIComponent(obj.Key).replace(/%2F/g, '/')}`,
        MetadataDirective: 'REPLACE',
        ContentType: 'video/mp4',
        ContentDisposition: `inline; filename="${obj.Key.split('/').pop()}"`,
        CacheControl: 'public, max-age=31536000, immutable',
        Metadata: {
          ...existing,
          platform: existing.platform || 'erogram',
          site: 'erogram.pro',
          copyright: 'Erogram.pro',
        },
      }));
      updated++;
      console.log(`  + ${obj.Key.split('/').pop()}`);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);

  return updated;
}

async function main() {
  const sourcePath = process.argv[2];
  if (!sourcePath) {
    console.error('Usage: node scripts/upload-porncreate-video.js <path-to-video>');
    process.exit(1);
  }

  const url = await uploadNewVideo(sourcePath);
  console.log(`\n✓ Uploaded: ${url}`);
  console.log(`  Advertiser: ${ADVERTISER}`);
  console.log(`  Niche: ${NICHE}`);
  console.log(`  Destination: ${DESTINATION}`);

  console.log('\nBackfilling Erogram.pro metadata on existing ad videos...');
  const key = url.replace(`${R2_PUBLIC_URL}/`, '');
  const updated = await backfillMetadata(key);
  console.log(`✓ Metadata updated on ${updated} existing videos`);

  console.log(`\nCAMPAIGN VIDEO URL:\n${url}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
