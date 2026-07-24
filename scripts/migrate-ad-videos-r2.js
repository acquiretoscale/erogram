/**
 * Migrate all ad video URLs to optimized, SEO-named files on R2.
 * Run: node --env-file=.env.local scripts/migrate-ad-videos-r2.js
 */
const mongoose = require('mongoose');
const { writeFile, readFile, unlink } = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'erogramimages';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const VIDEO_PREFIX = 'campaigns/videos';
const TARGET_SIZE = 10 * 1024 * 1024;

if (!MONGO_URI || !R2_PUBLIC_URL) {
  console.error('Missing MONGODB_URI or R2_PUBLIC_URL');
  process.exit(1);
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
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

function resolveNiche(category, campaignName) {
  if (category && category !== 'All') return slugify(category);
  const fromName = slugify(campaignName)
    .split('-')
    .filter((w) => w && !['create', 'build', 'your', 'find', 'never', 'late', 'craving', 'horny', 'lets', 'copy'].includes(w))
    .slice(0, 4)
    .join('-');
  return fromName || 'nsfw-feed';
}

function buildSlug(advertiserName, niche, disambiguator) {
  let slug = `${slugify(advertiserName) || 'advertiser'}-${slugify(niche) || 'nsfw-feed'}-erogram-ad`;
  if (disambiguator) slug += `-${disambiguator}`;
  return slug.slice(0, 120);
}

function isSeoUrl(url) {
  return /\/campaigns\/videos\/[a-z0-9-]+-erogram-ad(?:-[a-z0-9]+)?\.mp4$/i.test(url || '');
}

function isBrokenVideoUrl(url) {
  return /go\.cm-trk6\.com|aff_c\?|aff_f\?|click_id=/i.test(url || '');
}

function compressVideo(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .audioBitrate('128k')
      .outputOptions(['-crf', '22', '-preset', 'fast', '-vf', 'scale=-2:\'min(720,ih)\'', '-movflags', '+faststart', '-pix_fmt', 'yuv420p'])
      .format('mp4')
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath);
  });
}

function transcodeFromUrl(sourceUrl, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(sourceUrl)
      .videoCodec('libx264')
      .audioCodec('aac')
      .audioBitrate('128k')
      .outputOptions(['-crf', '22', '-preset', 'fast', '-vf', 'scale=-2:\'min(720,ih)\'', '-movflags', '+faststart', '-pix_fmt', 'yuv420p'])
      .format('mp4')
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath);
  });
}

async function uploadVideo(buffer, key, meta) {
  const filename = key.split('/').pop();
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: 'video/mp4',
    ContentDisposition: `inline; filename="${filename}"`,
    Metadata: {
      advertiser: slugify(meta.advertiserName).slice(0, 120),
      niche: slugify(meta.niche).slice(0, 120),
      platform: 'erogram',
      campaign: slugify(meta.campaignName || '').slice(0, 120),
    },
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

async function processSourceToR2(sourceUrl, meta) {
  const slug = buildSlug(meta.advertiserName, meta.niche, meta.disambiguator);
  const key = `${VIDEO_PREFIX}/${slug}.mp4`;
  const id = randomUUID();
  const inputPath = path.join('/tmp', `${id}-in`);
  const outputPath = path.join('/tmp', `${id}-out.mp4`);

  try {
    let finalBuffer;
    if (/\.m3u8(\?|$)/i.test(sourceUrl)) {
      if (!ffmpeg) throw new Error('ffmpeg required for HLS sources');
      await transcodeFromUrl(sourceUrl, outputPath);
      finalBuffer = await readFile(outputPath);
    } else {
      const res = await fetch(sourceUrl, { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ct = res.headers.get('content-type') || '';
      if (!/video\/|application\/octet-stream/i.test(ct) && !/\.(mp4|webm|mov)(\?|$)/i.test(sourceUrl)) {
        throw new Error(`Not a video (${ct || 'unknown'})`);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (ffmpeg) {
        try {
          await writeFile(inputPath, buf);
          await compressVideo(inputPath, outputPath);
          finalBuffer = await readFile(outputPath);
        } catch (ffmpegErr) {
          console.log(`  ↳ ffmpeg skipped, using source bytes (${(buf.length / 1024 / 1024).toFixed(2)}MB)`);
          finalBuffer = buf;
        }
      } else {
        finalBuffer = buf;
      }
    }

    const mb = (finalBuffer.length / 1024 / 1024).toFixed(2);
    const url = await uploadVideo(finalBuffer, key, meta);
    return { url, mb, key };
  } finally {
    unlink(inputPath).catch(() => {});
    unlink(outputPath).catch(() => {});
  }
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const campaignsCol = mongoose.connection.db.collection('campaigns');
  const articlesCol = mongoose.connection.db.collection('articles');
  const advertisersCol = mongoose.connection.db.collection('advertisers');

  const advertisers = await advertisersCol.find({}).toArray();
  const advMap = Object.fromEntries(advertisers.map((a) => [String(a._id), a.name]));

  const campaigns = await campaignsCol.find({ videoUrl: { $exists: true, $ne: '' } }).toArray();
  console.log(`\nCampaigns with videoUrl: ${campaigns.length}`);

  const urlGroups = new Map();
  for (const c of campaigns) {
    const url = String(c.videoUrl || '').trim();
    if (!url) continue;
    if (!urlGroups.has(url)) urlGroups.set(url, []);
    urlGroups.get(url).push(c);
  }

  const urlMigration = new Map();
  const usedSlugs = new Set();
  let migrated = 0;
  let cleared = 0;
  let skipped = 0;
  let failed = 0;

  for (const [sourceUrl, group] of urlGroups.entries()) {
    const rep = group.find((c) => c.status === 'active') || group[0];
    const advertiserName = advMap[String(rep.advertiserId)] || rep.name || 'advertiser';
    const niche = resolveNiche(rep.category, rep.name);
    const label = rep.name;

    if (isSeoUrl(sourceUrl)) {
      console.log(`✓ skip (already SEO): ${label}`);
      urlMigration.set(sourceUrl, sourceUrl);
      skipped++;
      continue;
    }

    if (isBrokenVideoUrl(sourceUrl)) {
      console.log(`⚠ clear broken URL: ${label}`);
      urlMigration.set(sourceUrl, '');
      cleared++;
      continue;
    }

    // Re-migrate cleared/failed UUID files still on R2
    let disambiguator = String(rep._id).slice(-6);
    let slug = buildSlug(advertiserName, niche, disambiguator);
    while (usedSlugs.has(slug)) {
      disambiguator = randomUUID().slice(0, 6);
      slug = buildSlug(advertiserName, niche, disambiguator);
    }
    usedSlugs.add(slug);

    try {
      console.log(`→ migrating: ${label}`);
      console.log(`  from: ${sourceUrl.slice(0, 100)}`);
      const { url, mb } = await processSourceToR2(sourceUrl, {
        advertiserName,
        niche,
        campaignName: rep.name,
        disambiguator,
      });
      console.log(`  ✓ ${mb}MB → ${url}`);
      urlMigration.set(sourceUrl, url);
      migrated++;
    } catch (err) {
      console.log(`  ✗ failed: ${err.message}`);
      if (group.some((c) => c.status === 'active') && group.some((c) => c.creative)) {
        console.log('  ↳ active campaign has image fallback — clearing videoUrl');
        urlMigration.set(sourceUrl, '');
        cleared++;
      } else {
        urlMigration.set(sourceUrl, sourceUrl);
        failed++;
      }
    }
  }

  let campaignUpdates = 0;
  for (const [oldUrl, newUrl] of urlMigration.entries()) {
    if (newUrl === oldUrl) continue;
    const res = await campaignsCol.updateMany({ videoUrl: oldUrl }, { $set: { videoUrl: newUrl } });
    campaignUpdates += res.modifiedCount;
  }

  // Blog article video blocks
  const articles = await articlesCol.find({ 'videoBlocks.0': { $exists: true } }).toArray();
  let articleUpdates = 0;
  for (const article of articles) {
    let changed = false;
    const blocks = [...(article.videoBlocks || [])];
    for (let i = 0; i < blocks.length; i++) {
      const url = String(blocks[i].url || '').trim();
      if (!url || isSeoUrl(url)) continue;

      if (urlMigration.has(url)) {
        const newUrl = urlMigration.get(url);
        if (newUrl && newUrl !== url) {
          blocks[i] = { ...blocks[i], url: newUrl };
          changed = true;
        }
        continue;
      }

      try {
        const { url: newUrl } = await processSourceToR2(url, {
          advertiserName: 'lovescape',
          niche: slugify(article.title).slice(0, 40),
          campaignName: article.title,
          disambiguator: String(article._id).slice(-6),
        });
        urlMigration.set(url, newUrl);
        blocks[i] = { ...blocks[i], url: newUrl };
        changed = true;
        migrated++;
        console.log(`✓ article video migrated: ${article.title}`);
      } catch (err) {
        console.log(`✗ article video failed (${article.title}): ${err.message}`);
        failed++;
      }
    }
    if (changed) {
      await articlesCol.updateOne({ _id: article._id }, { $set: { videoBlocks: blocks } });
      articleUpdates++;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped (already SEO): ${skipped}`);
  console.log(`Cleared broken: ${cleared}`);
  console.log(`Failed (kept old URL): ${failed}`);
  console.log(`Campaign DB updates: ${campaignUpdates}`);
  console.log(`Article DB updates: ${articleUpdates}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
