/**
 * Migrate AI NSFW gallery screenshots to R2 as WebP <= 100KB, SEO-named.
 * Keys in galleryMap match tool.slug (name-category).
 * Legacy local folders may use category-name — both are checked.
 *
 * Usage: node --env-file=.env.local scripts/migrate-ainsfw-gallery.js [--dry]
 */
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

const DRY = process.argv.includes('--dry');
const BUCKET = process.env.R2_BUCKET_NAME || 'erogramimages';
const PUBLIC_URL = (process.env.R2_PUBLIC_URL || 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev').replace(/\/$/, '');
const MAX_BYTES = 100 * 1024;
const GALLERY_DIR = path.join(process.cwd(), 'public/assets/ainsfw/gallery');
const MAP_JSON = path.join(process.cwd(), 'scripts/ainsfw-gallery-map.json');
const MAP_TS = path.join(process.cwd(), 'app/ainsfw/galleryMap.ts');

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

const slugPart = (s) => (s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function toolSlug(category, name) {
  return `${slugPart(name)}-${slugPart(category)}`;
}

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

async function existsOnR2(key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

function parseTools() {
  const src = fs.readFileSync(path.join(process.cwd(), 'app/ainsfw/data.ts'), 'utf8');
  const tools = [];
  const re = /slug:\s*slugify\('([^']+)',\s*'((?:[^'\\]|\\.)*)'\)[\s\S]*?name:\s*'((?:[^'\\]|\\.)*)',[\s\S]*?category:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const category = m[1];
    const slugName = m[2].replace(/\\'/g, "'");
    const name = m[3].replace(/\\'/g, "'");
    tools.push({ slug: toolSlug(category, slugName), name, category });
  }
  tools.push({ slug: 'unlaced-ai-girlfriend', name: 'UnLaced', category: 'AI Girlfriend' });
  tools.push({ slug: 'dreamyporn-ai-undress-ai', name: 'DreamyPorn AI', category: 'Undress AI' });
  return tools;
}

function findGalleryDir(slug, category, name) {
  const candidates = [slug, `${slugPart(category)}-${slugPart(name)}`];
  for (const folder of candidates) {
    const dir = path.join(GALLERY_DIR, folder);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
    if (files.length) return { dir, folder, files: files.sort() };
  }
  return null;
}

function writeGalleryMapTs(map) {
  const lines = ['// Auto-generated — keys match tool.slug (name-category).', 'export const AINSFW_GALLERY: Record<string, string[]> = {'];
  const keys = Object.keys(map).filter((k) => map[k]?.length).sort();
  for (const key of keys) {
    lines.push(`  "${key}": [`);
    for (const url of map[key]) lines.push(`    "${url}",`);
    lines.push('  ],');
  }
  lines.push('};', '');
  fs.writeFileSync(MAP_TS, lines.join('\n'));
}

(async () => {
  const tools = parseTools();
  const existingMap = fs.existsSync(MAP_JSON) ? JSON.parse(fs.readFileSync(MAP_JSON, 'utf8')) : {};
  const map = { ...existingMap };

  let uploaded = 0;
  let skipped = 0;
  let over = 0;
  let noGallery = 0;

  console.log(`Tools in data.ts: ${tools.length}`);

  for (const tool of tools) {
    const baseName = tool.slug;
    const found = findGalleryDir(tool.slug, tool.category, tool.name);
    if (!found) {
      noGallery++;
      continue;
    }

    const urls = [];
    for (let i = 0; i < found.files.length; i++) {
      const key = `ainsfw/gallery/${baseName}-${i + 1}.webp`;
      const url = `${PUBLIC_URL}/${key}`;
      urls.push(url);

      if (!DRY && !(await existsOnR2(key))) {
        const raw = fs.readFileSync(path.join(found.dir, found.files[i]));
        const web = await toWebpUnder100kb(raw);
        if (web.length > MAX_BYTES) over++;
        await client.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: web, ContentType: 'image/webp' }));
        uploaded++;
      } else {
        skipped++;
      }
    }

    map[tool.slug] = urls;
    console.log(`${DRY ? '[dry] ' : ''}${tool.slug} ← ${found.folder} (${found.files.length} imgs)`);
  }

  // Drop map entries for tools no longer in data.ts
  const liveSlugs = new Set(tools.map((t) => t.slug));
  for (const key of Object.keys(map)) {
    if (!liveSlugs.has(key) && !key.includes('unlaced') && !key.includes('dreamyporn')) {
      delete map[key];
    }
  }

  fs.writeFileSync(MAP_JSON, JSON.stringify(map, null, 2));
  writeGalleryMapTs(map);

  console.log(`\nDone. uploaded=${uploaded} skipped=${skipped} over100kb=${over} noGallery=${noGallery} mapKeys=${Object.keys(map).filter((k) => map[k]?.length).length}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
