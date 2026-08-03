#!/usr/bin/env node
/** Upload preset user avatars from public/assets/avatars to R2. */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME = 'erogramimages',
  R2_PUBLIC_URL,
} = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_URL) {
  console.error('Missing R2 env vars');
  process.exit(1);
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const srcDir = path.join(process.cwd(), 'public/assets/avatars');

async function main() {
  const files = fs.readdirSync(srcDir).filter((f) => /^erogramx-user\d+\.webp$/i.test(f));
  for (const file of files.sort((a, b) => {
    const na = parseInt((a.match(/\d+/) || ['0'])[0], 10);
    const nb = parseInt((b.match(/\d+/) || ['0'])[0], 10);
    return na - nb;
  })) {
    const n = file.match(/erogramx-user(\d+)/i)?.[1];
    if (!n) continue;
    const key = `avatars/presets/erogramx-user${n}.webp`;
    let buf = fs.readFileSync(path.join(srcDir, file));
    buf = await sharp(buf)
      .resize(500, 500, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    await client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buf,
      ContentType: 'image/webp',
    }));
    console.log(`${key} -> ${R2_PUBLIC_URL}/${key} (${Math.round(buf.length / 1024)}KB)`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
