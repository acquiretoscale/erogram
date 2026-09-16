/**
 * One-off: optimize + upload JAV site preview images to R2.
 * Run: node --env-file=.env.local scripts/upload-jav-porn-site-previews.mjs
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import sharp from 'sharp';

const R2_BASE = (process.env.R2_PUBLIC_URL || 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev').replace(/\/$/, '');
const bucket = process.env.R2_BUCKET_NAME || 'erogramimages';

const ASSETS = '/Users/themaf/.cursor/projects/Users-themaf-Desktop-ErogramPRO/assets';

const SITES = [
  { slug: 'spermmania', file: 'spermmania-94a78c3b-019c-4987-96c6-975f9ad18f16.jpg' },
  { slug: 'cutebutts', file: 'cutebutts-3bca27ad-186c-45ff-8ee5-4c171acf719c.jpg' },
  { slug: 'fellatiojapan', file: 'fellatiojapan-93030df8-0cca-4c29-a818-9287affc78a7.jpg' },
  { slug: 'handjobjapan', file: 'handjobjapan-ea02069f-10b8-4b61-8bd3-fc846af9b5de.jpg' },
  { slug: 'japan-hdv', file: 'japanhdv-7d099dda-8b94-4e62-a8ae-cb18ad48c12f.jpg' },
  { slug: 'erito-uncensored', file: 'erito-fb805b13-0be8-4fb4-902c-e9ff39e39d7a.jpg' },
];

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function upload(key, body, contentType) {
  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
}

const out = [];

for (const site of SITES) {
  const input = `${ASSETS}/${site.file}`;
  if (!fs.existsSync(input)) {
    console.error('MISSING', input);
    continue;
  }
  const buf = fs.readFileSync(input);

  const hero = await sharp(buf)
    .rotate()
    .resize(900, null, { withoutEnlargement: true, fit: 'inside' })
    .webp({ quality: 80, effort: 4 })
    .toBuffer();

  const icon = await sharp(buf)
    .rotate()
    .resize(128, 128, { fit: 'cover', position: 'centre' })
    .webp({ quality: 85, effort: 4 })
    .toBuffer();

  const heroKey = `explore/${site.slug}-jav-porn-site.webp`;
  const iconKey = `explore/${site.slug}-jav-porn-site-icon.webp`;

  await upload(heroKey, hero, 'image/webp');
  await upload(iconKey, icon, 'image/webp');

  const row = {
    slug: site.slug,
    image: `${R2_BASE}/${heroKey}`,
    icon: `${R2_BASE}/${iconKey}`,
    heroKb: Math.round(hero.length / 1024),
    iconKb: Math.round(icon.length / 1024),
  };
  out.push(row);
  console.log('OK', site.slug, `${row.heroKb}KB hero`, `${row.iconKb}KB icon`);
}

console.log(JSON.stringify(out, null, 2));
