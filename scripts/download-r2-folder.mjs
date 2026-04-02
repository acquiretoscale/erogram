#!/usr/bin/env node
/**
 * Downloads all video files from a given R2 prefix to a local folder.
 *
 * Usage:
 *   node scripts/download-r2-folder.mjs [prefix] [outputDir]
 *
 * Defaults:
 *   prefix    = tgempire/instabaddies/
 *   outputDir = ./downloads/instabaddies
 */

import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

// Load .env.local manually (no dotenv dependency required)
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'erogramimages';

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('❌  Missing R2 credentials. Check your .env.local file.');
  process.exit(1);
}

const PREFIX = process.argv[2] || 'tgempire/instabaddies/';
const OUTPUT_DIR = process.argv[3] || path.resolve(process.cwd(), 'downloads/instabaddies');

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

async function listAllVideos(prefix) {
  const keys = [];
  let continuationToken;

  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: prefix.endsWith('/') ? prefix : `${prefix}/`,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      })
    );

    for (const obj of res.Contents ?? []) {
      if (!obj.Key) continue;
      const lower = obj.Key.toLowerCase();
      if (VIDEO_EXTENSIONS.some(ext => lower.endsWith(ext))) {
        keys.push({ key: obj.Key, size: obj.Size });
      }
    }

    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

async function downloadFile(key, destPath) {
  const res = await client.send(
    new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key })
  );
  await pipeline(res.Body, createWriteStream(destPath));
}

function formatBytes(bytes) {
  if (!bytes) return '?';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}

async function main() {
  console.log(`\n📂  Listing videos in: ${R2_BUCKET_NAME}/${PREFIX}`);

  const videos = await listAllVideos(PREFIX);

  if (videos.length === 0) {
    console.log('⚠️   No videos found in that folder.');
    return;
  }

  console.log(`✅  Found ${videos.length} video(s). Starting download to: ${OUTPUT_DIR}\n`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let done = 0;
  for (const { key, size } of videos) {
    const filename = path.basename(key);
    const destPath = path.join(OUTPUT_DIR, filename);

    if (fs.existsSync(destPath)) {
      console.log(`  ⏭  Skipping (already exists): ${filename}`);
      done++;
      continue;
    }

    process.stdout.write(`  ⬇️  [${done + 1}/${videos.length}] ${filename} (${formatBytes(size)}) ... `);
    try {
      await downloadFile(key, destPath);
      console.log('done');
    } catch (err) {
      console.log(`FAILED — ${err.message}`);
    }
    done++;
  }

  console.log(`\n🎉  Download complete. Files saved to: ${OUTPUT_DIR}\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
