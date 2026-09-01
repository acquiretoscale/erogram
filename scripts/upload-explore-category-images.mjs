/**
 * Upload explore category thumbnails from toppornsites.com to R2.
 * Run: node --env-file=.env.local scripts/upload-explore-category-images.mjs [live-cams|vr-porn|all]
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

const SECTIONS = {
  'live-cams': { start: 'top-live-cam-sites', end: 'top-private-cam-sites', r2Folder: 'live-sex-cams' },
  'vr-porn': { start: 'top-vr-porn-sites', end: 'free-onlyfans-accounts', r2Folder: 'vr-porn' },
};

function parseSection(startId, endId) {
  const start = html.indexOf(`id="${startId}"`);
  const end = html.indexOf(`id="${endId}"`, start);
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
  return sites;
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
const tmpDir = path.join(__dirname, '..', 'tmp', 'explore-category');
fs.mkdirSync(tmpDir, { recursive: true });

const arg = process.argv[2] || 'all';
const keys = arg === 'all' ? Object.keys(SECTIONS) : [arg];

for (const key of keys) {
  const { start, end, r2Folder } = SECTIONS[key];
  const sites = parseSection(start, end);
  const uploaded = [];

  for (const site of sites) {
    const res = await fetch(site.thumb);
    if (!res.ok) {
      console.error('FAIL download', key, site.name, res.status);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const webp = await sharp(buf).resize(800, null, { withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    const objectKey = `explore/${r2Folder}/${site.slug}.webp`;
    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: webp,
        ContentType: 'image/webp',
      }),
    );
    uploaded.push({ ...site, imageUrl: `${base}/${objectKey}` });
    console.log('OK', key, site.name, `${base}/${objectKey}`);
  }

  fs.writeFileSync(path.join(tmpDir, `${key}-uploaded.json`), JSON.stringify(uploaded, null, 2));
  console.log('Done', key, uploaded.length);
}
