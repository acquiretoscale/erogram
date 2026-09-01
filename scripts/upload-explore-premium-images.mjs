/**
 * Download Best Pay Porn thumbnails from toppornsites.com and upload to R2.
 * Run: node --env-file=.env.local scripts/upload-explore-premium-images.mjs
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(
  path.join(process.env.HOME, 'Downloads', 'Top Porn Sites - List of Best Porn Sites Free Videos 2026.html'),
  'utf8',
);

const start = html.indexOf('id="best-pay-porn-sites"');
const end = html.indexOf('id="most-famous-hookup-sites"', start);
const section = html.slice(start, end);
const itemRe =
  /<li class="individualLiMagnigying" id="([^"]+)"[\s\S]*?data-thumb="([^"]*)" data-desc="([^"]*)"[^>]*>\s*([^<]+?)<\/a>/g;

const sites = [];
let m;
while ((m = itemRe.exec(section))) {
  sites.push({
    id: m[1],
    slug: m[1].replace(/-\d+$/, ''),
    thumb: m[2].replace(/&amp;/g, '&'),
    desc: m[3].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/—/g, ' - '),
    name: m[4].trim(),
  });
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const bucket = process.env.R2_BUCKET_NAME || 'erogramimages';
const base = process.env.R2_PUBLIC_URL.replace(/\/$/, '');
const tmpDir = path.join(__dirname, '..', 'tmp', 'explore-premium');
fs.mkdirSync(tmpDir, { recursive: true });

const uploaded = [];

for (const site of sites) {
  const res = await fetch(site.thumb);
  if (!res.ok) {
    console.error('FAIL download', site.name, res.status);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const webp = await sharp(buf).resize(800, null, { withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const key = `explore/premium-porn/${site.slug}.webp`;
  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: webp,
      ContentType: 'image/webp',
    }),
  );
  const imageUrl = `${base}/${key}`;
  uploaded.push({ ...site, imageUrl });
  console.log('OK', site.name, imageUrl);
}

fs.writeFileSync(
  path.join(__dirname, '..', 'tmp', 'explore-premium-uploaded.json'),
  JSON.stringify(uploaded, null, 2),
);
console.log('Done.', uploaded.length, 'images');
