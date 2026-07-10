/**
 * Migrate all AI NSFW gallery screenshots to R2 as WebP <= 100KB, SEO-named.
 * Source: public/assets/ainsfw/gallery/{toolSlug}/{n}.jpg
 * Target: ainsfw/gallery/{name}-{category}-{n}.webp
 * Writes scripts/ainsfw-gallery-map.json: { toolSlug: [r2Url,...] }
 *
 * Usage: node scripts/migrate-ainsfw-gallery.js [--dry]
 */
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const DRY = process.argv.includes('--dry');
const BUCKET = process.env.R2_BUCKET_NAME || 'erogramimages';
const PUBLIC_URL = process.env.R2_PUBLIC_URL;
const MAX_BYTES = 100 * 1024;
const GALLERY_DIR = path.join(process.cwd(), 'public/assets/ainsfw/gallery');

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

const slugPart = s => (s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function toWebpUnder100kb(buffer) {
  const attempts = [
    { w: 1000, q: 82 }, { w: 900, q: 74 }, { w: 800, q: 66 }, { w: 800, q: 55 },
    { w: 720, q: 48 }, { w: 640, q: 42 }, { w: 560, q: 38 }, { w: 480, q: 34 },
  ];
  let out = null;
  for (const a of attempts) {
    out = await sharp(buffer).rotate().resize(a.w, undefined, { withoutEnlargement: true }).webp({ quality: a.q }).toBuffer();
    if (out.length <= MAX_BYTES) return out;
  }
  return out;
}

// Build slug -> {name, category} from data.ts
function parseToolMeta() {
  const src = fs.readFileSync(path.join(process.cwd(), 'app/ainsfw/data.ts'), 'utf8');
  const meta = {};
  const re = /slug:\s*slugify\('([^']+)',\s*'((?:[^'\\]|\\.)*)'\)[\s\S]*?name:\s*'((?:[^'\\]|\\.)*)',[\s\S]*?category:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const slugCat = m[1];
    const slugName = m[2].replace(/\\'/g, "'");
    const name = m[3].replace(/\\'/g, "'");
    const category = m[4];
    // Folder slug is built from the slugify() ARGS, not the display name.
    const slug = `${slugPart(slugCat)}-${slugPart(slugName)}`;
    meta[slug] = { name, category };
  }
  // DB submissions not in data.ts (their gallery slug = submission.slug).
  meta['ai-girlfriend-unlaced'] = { name: 'UnLaced', category: 'AI Girlfriend' };
  meta['undress-ai-dreamyporn-ai'] = { name: 'DreamyPorn AI', category: 'Undress AI' };
  return meta;
}

(async () => {
  const meta = parseToolMeta();
  const folders = fs.readdirSync(GALLERY_DIR).filter(f => fs.statSync(path.join(GALLERY_DIR, f)).isDirectory());
  console.log(`Gallery folders: ${folders.length}, parsed meta for ${Object.keys(meta).length} tools`);

  const map = {};
  let uploaded = 0, over = 0, unknown = 0;

  for (const folder of folders) {
    const info = meta[folder];
    // Fall back to the folder slug itself if not found in data.ts (paid submissions etc.)
    const baseName = info ? `${slugPart(info.name)}-${slugPart(info.category)}` : folder;
    if (!info) unknown++;

    const dir = path.join(GALLERY_DIR, folder);
    const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)).sort();
    const urls = [];

    for (let i = 0; i < files.length; i++) {
      const raw = fs.readFileSync(path.join(dir, files[i]));
      const web = await toWebpUnder100kb(raw);
      if (web.length > MAX_BYTES) over++;
      const key = `ainsfw/gallery/${baseName}-${i + 1}.webp`;
      const url = `${PUBLIC_URL}/${key}`;
      urls.push(url);
      if (!DRY) {
        await client.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: web, ContentType: 'image/webp' }));
      }
      uploaded++;
    }
    map[folder] = urls;
    console.log(`${DRY ? '[dry] ' : ''}${folder} → ${baseName}-*.webp (${files.length} imgs)${info ? '' : ' [no data.ts meta]'}`);
  }

  fs.writeFileSync(path.join(process.cwd(), 'scripts/ainsfw-gallery-map.json'), JSON.stringify(map, null, 2));
  console.log(`\nDone. uploaded=${uploaded} over100kb=${over} foldersWithoutMeta=${unknown}`);
})().catch(e => { console.error(e); process.exit(1); });
