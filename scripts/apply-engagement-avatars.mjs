#!/usr/bin/env node
/** Upload remaining forum avatars to R2 and set photoUrl on engagement seed users. */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import mongoose from 'mongoose';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const AVATAR_DIR = '/Users/themaf/Desktop/ErogramPRO-scratch/engagement-avatars';
const SEED_USERS = [
  'hyperstorm8',
  'solarwave36',
  'cybereagle54',
  'stellareagle62',
  'solarraven14',
  'vortexwolf3',
  'neonphoenix89',
  'cosmicstorm91',
  'stellararrow59',
  'primewolf50',
];

const {
  MONGODB_URI,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME = 'erogramimages',
  R2_PUBLIC_URL,
} = process.env;

if (!MONGODB_URI || !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_URL) {
  console.error('Missing MONGODB_URI or R2 env vars');
  process.exit(1);
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

function customAvatarKey(username) {
  const safe = username.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'user';
  return `avatars/users/erogramx-${safe}.webp`;
}

async function compress(buf) {
  return sharp(buf, { animated: false })
    .rotate()
    .resize(500, 500, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}

async function upload(buf, key) {
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buf,
    ContentType: 'image/webp',
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

async function main() {
  const files = fs.readdirSync(AVATAR_DIR)
    .filter((f) => /^avatar-\d+\.(jpg|jpeg|png|webp)$/i.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)?.[0] || '0', 10);
      const nb = parseInt(b.match(/\d+/)?.[0] || '0', 10);
      return na - nb;
    });

  console.log(`Found ${files.length} avatar files for ${SEED_USERS.length} seed users`);

  await mongoose.connect(MONGODB_URI);
  const users = mongoose.connection.db.collection('users');

  const assignments = [];
  for (let i = 0; i < SEED_USERS.length; i++) {
    const username = SEED_USERS[i];
    const file = files[i];
    if (!file) {
      console.warn(`No avatar left for @${username}`);
      continue;
    }

    const src = path.join(AVATAR_DIR, file);
    const buf = await compress(fs.readFileSync(src));
    const key = customAvatarKey(username);
    const photoUrl = await upload(buf, key);

    const res = await users.updateOne({ username }, { $set: { photoUrl, updatedAt: new Date() } });
    if (!res.matchedCount) {
      console.warn(`User not found: @${username}`);
      continue;
    }

    assignments.push({ username, file, photoUrl, kb: Math.round(buf.length / 1024) });
    console.log(`@${username} <- ${file} (${assignments.at(-1).kb}KB)`);
  }

  fs.writeFileSync(
    path.join(AVATAR_DIR, 'assignments.json'),
    JSON.stringify({ updatedAt: new Date().toISOString(), assignments, spareFiles: files.slice(SEED_USERS.length) }, null, 2)
  );

  const cards = assignments.map((a) =>
    `<div class="card"><img src="${a.photoUrl}" alt="" /><div class="username">@${a.username}</div><div class="meta">${a.file}</div></div>`
  ).join('\n');

  fs.writeFileSync(path.join(AVATAR_DIR, 'preview.html'), `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><title>Seed users + avatars</title>
<style>
body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:24px}
h1{margin:0 0 8px} p{color:#94a3b8;margin:0 0 24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px}
.card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px;text-align:center}
.card img{width:96px;height:96px;border-radius:999px;object-fit:cover;border:2px solid #475569;background:#334155}
.username{font-weight:700;margin-top:12px}.meta{color:#94a3b8;font-size:.75rem;margin-top:4px}
</style></head><body>
<h1>Seed users (live on R2 + MongoDB)</h1>
<p>${assignments.length} users updated with forum avatars you kept.</p>
<div class="grid">${cards}</div></body></html>`);

  console.log('\nDone.', assignments.length, 'users updated');
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
