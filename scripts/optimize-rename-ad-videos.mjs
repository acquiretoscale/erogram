#!/usr/bin/env node
/**
 * Compress campaign ad videos to <=100KB and rename AI ads:
 *   ai-nude-generator-erogramx[-slug].mp4
 *   ai-girlfriend-app-erogramx[-slug].mp4
 *
 * Run: node --env-file=.env.local scripts/optimize-rename-ad-videos.mjs [--dry-run]
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import mongoose from 'mongoose';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const DRY_RUN = process.argv.includes('--dry-run');
const MAX_BYTES = 100 * 1024;
const VIDEO_PREFIX = 'campaigns/videos';
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

function slugify(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function classifyCampaign(c) {
  const text = `${c.name || ''} ${c.internalName || ''} ${c.description || ''} ${c.destinationUrl || ''}`.toLowerCase();
  if (/aislutbot|ai-porn-generator|porncreate|\/edit\?category=video|undress|denude|nude generator|spicy pictures|turn images into/.test(text)) {
    return 'nude';
  }
  if (/hornydreams|ai slut|ai girlfriend|fuckdoll|girl who never|lovescape|golove|build your ai|secret slut|never says no/.test(text)) {
    return 'girlfriend';
  }
  return 'other';
}

function disambiguatorForCampaign(c, type) {
  const dest = String(c.destinationUrl || '').toLowerCase();
  if (dest.includes('hornydreams')) return 'hornydreams';
  if (dest.includes('aislutbot') || (c.internalName || '').toLowerCase().includes('slutbot')) return 'slutbot';
  if (dest.includes('porncreate')) return 'porncreate';
  if (dest.includes('lovescape')) return 'lovescape';
  if (dest.includes('golove')) return 'golove';
  const fromName = slugify(c.internalName || c.name || '').slice(0, 40);
  if (fromName) return fromName;
  return String(c._id).slice(-6);
}

function buildTargetFilename(type, slug) {
  const base = type === 'nude' ? 'ai-nude-generator-erogramx' : 'ai-girlfriend-app-erogramx';
  return slug ? `${base}-${slug}.mp4` : `${base}.mp4`;
}

function compressToTarget(inputPath, outputPath) {
  const attempts = [
    { crf: 32, fps: 24, w: 360 },
    { crf: 34, fps: 24, w: 360 },
    { crf: 36, fps: 24, w: 320 },
    { crf: 38, fps: 20, w: 320 },
    { crf: 40, fps: 20, w: 300 },
    { crf: 42, fps: 18, w: 280 },
  ];

  for (const { crf, fps, w } of attempts) {
    execFileSync('ffmpeg', [
      '-y', '-i', inputPath,
      '-vf', `fps=${fps},scale=${w}:trunc(ih*${w}/iw/2)*2`,
      '-c:v', 'libx264', '-crf', String(crf), '-preset', 'slow', '-pix_fmt', 'yuv420p',
      '-an', '-movflags', '+faststart',
      outputPath,
    ], { stdio: 'pipe' });

    const size = fs.statSync(outputPath).size;
    if (size <= MAX_BYTES) {
      return { size, crf, fps, w };
    }
  }

  const size = fs.statSync(outputPath).size;
  if (size > MAX_BYTES) {
    throw new Error(`Could not compress below ${MAX_BYTES} bytes (got ${size})`);
  }
  return { size, crf: 42, fps: 18, w: 280 };
}

async function uploadBuffer(buffer, key) {
  if (DRY_RUN) return `${R2_PUBLIC_URL}/${key}`;
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: 'video/mp4',
    ContentDisposition: `inline; filename="${path.basename(key)}"`,
    Metadata: { platform: 'erogram', site: 'erogramx.com' },
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

async function deleteKey(key) {
  if (DRY_RUN) return;
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
}

async function main() {
  if (!process.env.MONGODB_URI || !R2_PUBLIC_URL) {
    console.error('Missing MONGODB_URI or R2_PUBLIC_URL');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const Campaign = mongoose.connection.collection('campaigns');

  const campaigns = await Campaign.find({ videoUrl: { $exists: true, $nin: [null, ''] } }).toArray();
  const byUrl = new Map();

  for (const c of campaigns) {
    const url = String(c.videoUrl || '').trim();
    if (!url) continue;
    if (!byUrl.has(url)) byUrl.set(url, []);
    byUrl.get(url).push(c);
  }

  const usedFilenames = new Set();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'advid-'));
  const report = [];

  try {
    for (const [oldUrl, refs] of byUrl.entries()) {
      const oldKey = oldUrl.startsWith(R2_PUBLIC_URL + '/') ? oldUrl.slice(R2_PUBLIC_URL.length + 1) : null;
      if (!oldKey || !oldKey.startsWith(`${VIDEO_PREFIX}/`)) {
        report.push({ oldUrl, skipped: 'not R2 campaigns/videos' });
        continue;
      }

      const inputPath = path.join(tmpDir, `in-${slugify(path.basename(oldKey))}.mp4`);
      const outputPath = path.join(tmpDir, `out-${slugify(path.basename(oldKey))}.mp4`);

      console.log(`\n⬇️  Downloading ${oldKey}`);
      if (!DRY_RUN) {
        const res = await fetch(oldUrl);
        if (!res.ok) throw new Error(`Download failed ${oldUrl} (${res.status})`);
        fs.writeFileSync(inputPath, Buffer.from(await res.arrayBuffer()));
      } else {
        fs.writeFileSync(inputPath, Buffer.alloc(1024));
      }

      let encodeMeta = { size: 0, crf: 0, fps: 0, w: 0 };
      if (!DRY_RUN) {
        encodeMeta = compressToTarget(inputPath, outputPath);
        console.log(`  ✓ compressed ${(encodeMeta.size / 1024).toFixed(1)}KB crf=${encodeMeta.crf} ${encodeMeta.fps}fps ${encodeMeta.w}px`);
      } else {
        console.log('  (dry-run skip ffmpeg)');
      }

      const buffer = DRY_RUN ? Buffer.alloc(1000) : fs.readFileSync(outputPath);

      const aiGroups = new Map();
      const otherIds = [];

      for (const c of refs) {
        const type = classifyCampaign(c);
        if (type === 'other') {
          otherIds.push(String(c._id));
          continue;
        }
        const slug = disambiguatorForCampaign(c, type);
        const groupKey = `${type}::${slug}`;
        if (!aiGroups.has(groupKey)) aiGroups.set(groupKey, { type, slug, campaignIds: [] });
        aiGroups.get(groupKey).campaignIds.push(String(c._id));
      }

      const uploadedKeys = new Set();

      if (otherIds.length > 0) {
        const keepUrl = await uploadBuffer(buffer, oldKey);
        uploadedKeys.add(oldKey);
        if (!DRY_RUN) {
          await Campaign.updateMany(
            { _id: { $in: otherIds.map((id) => new mongoose.Types.ObjectId(id)) } },
            { $set: { videoUrl: keepUrl } },
          );
        }
        console.log(`  → kept ${oldKey} (${otherIds.length} non-AI campaign(s), compressed in place)`);
        report.push({
          oldUrl,
          newUrl: keepUrl,
          key: oldKey,
          type: 'other',
          campaigns: otherIds.length,
          bytes: encodeMeta.size,
        });
      }

      for (const [, group] of aiGroups.entries()) {
        let filename = buildTargetFilename(group.type, group.slug);
        let key = `${VIDEO_PREFIX}/${filename}`;
        let i = 2;
        while (usedFilenames.has(key) || key === oldKey) {
          filename = buildTargetFilename(group.type, `${group.slug}-${i}`);
          key = `${VIDEO_PREFIX}/${filename}`;
          i++;
        }
        usedFilenames.add(key);

        const newUrl = await uploadBuffer(buffer, key);
        uploadedKeys.add(key);

        if (!DRY_RUN) {
          await Campaign.updateMany(
            { _id: { $in: group.campaignIds.map((id) => new mongoose.Types.ObjectId(id)) } },
            { $set: { videoUrl: newUrl } },
          );
        }

        console.log(`  → ${key} (${group.campaignIds.length} campaign(s))`);
        report.push({
          oldUrl,
          newUrl,
          key,
          type: group.type,
          slug: group.slug,
          campaigns: group.campaignIds.length,
          bytes: encodeMeta.size,
        });
      }

      if (aiGroups.size === 0 && otherIds.length === 0) {
        report.push({ oldUrl, skipped: 'no campaigns' });
        continue;
      }

      if (!DRY_RUN && oldKey && !uploadedKeys.has(oldKey)) {
        await deleteKey(oldKey);
      }
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    await mongoose.disconnect();
  }

  console.log('\n=== REPORT ===');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
