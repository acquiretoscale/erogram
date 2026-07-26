/**
 * Phase 4: Fetch gallery screenshots for batch tools, save locally as JPG.
 * Run migrate-ainsfw-gallery.js after this to WebP + R2 + galleryMap.ts.
 *
 * Usage: node --env-file=.env.local scripts/fetch-ainsfw-batch-gallery.mjs
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { DATA_TS, toolSlug } from './ainsfw-batch-lib.mjs';

const TAVILY_KEY = process.env.TAVILY_API_KEY || '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';
const GALLERY_DIR = path.join(process.cwd(), 'public', 'assets', 'ainsfw', 'gallery');
const TARGET_COUNT = 6;
const MIN_WIDTH = 600;
const MAX_WIDTH = 1000;
const JPG_QUALITY = 95;

function parseTools() {
  const src = fs.readFileSync(DATA_TS, 'utf8');
  const tools = [];
  const re = /slug:\s*slugify\('([^']+)',\s*'((?:[^'\\]|\\.)*)'\)[\s\S]*?name:\s*'((?:[^'\\]|\\.)*)',[\s\S]*?vendor:\s*'((?:[^'\\]|\\.)*)',[\s\S]*?category:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    tools.push({
      slug: toolSlug(m[1], m[2].replace(/\\'/g, "'")),
      name: m[3].replace(/\\'/g, "'"),
      vendor: m[4].replace(/\\'/g, "'"),
      category: m[5],
    });
  }
  return tools;
}

function slugDir(slug) {
  return path.join(GALLERY_DIR, slug.replace(/[^a-z0-9-]/gi, ''));
}

function existingCount(slug) {
  const dir = slugDir(slug);
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).length;
}

async function downloadAndProcess(url, outPath) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    });
    clearTimeout(timeout);
    if (!res.ok) return false;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('image')) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 5000) return false;
    const meta = await sharp(buffer).metadata();
    if (!meta.width || meta.width < MIN_WIDTH) return false;
    const resizeWidth = Math.min(meta.width, MAX_WIDTH);
    await sharp(buffer)
      .resize(resizeWidth, undefined, { withoutEnlargement: true })
      .jpeg({ quality: JPG_QUALITY, mozjpeg: true })
      .toFile(outPath);
    return true;
  } catch {
    return false;
  }
}

async function fetchGallery(tool) {
  const dir = slugDir(tool.slug);
  fs.mkdirSync(dir, { recursive: true });

  let saved = existingCount(tool.slug);
  if (saved >= TARGET_COUNT) return saved;

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TAVILY_KEY,
      query: `${tool.name} ${tool.vendor} app screenshots interface preview`,
      search_depth: 'basic',
      include_images: true,
      max_results: 10,
    }),
  });
  if (!res.ok) return saved;

  const data = await res.json();
  const candidateUrls = [];
  for (const img of data.images || []) {
    const url = typeof img === 'string' ? img : img?.url;
    if (url) candidateUrls.push(url);
  }
  for (const r of data.results || []) {
    for (const img of r.images || []) {
      const url = typeof img === 'string' ? img : img?.url;
      if (url && !candidateUrls.includes(url)) candidateUrls.push(url);
    }
  }

  for (const url of candidateUrls) {
    if (saved >= TARGET_COUNT) break;
    const fileName = `${saved + 1}.jpg`;
    const outPath = path.join(dir, fileName);
    if (fs.existsSync(outPath)) {
      saved++;
      continue;
    }
    const ok = await downloadAndProcess(url, outPath);
    if (ok) saved++;
  }
  return saved;
}

const tools = parseTools();
let done = 0;
let skipped = 0;

for (let i = 0; i < tools.length; i++) {
  const tool = tools[i];
  const have = existingCount(tool.slug);
  if (have >= TARGET_COUNT) {
    skipped++;
    continue;
  }
  console.log(`[${i + 1}/${tools.length}] ${tool.name} (${have}/${TARGET_COUNT})`);
  const count = await fetchGallery(tool);
  console.log(`  → ${count} images`);
  done++;
}

console.log(`\nGallery fetch done. fetched=${done} alreadyHad=${skipped}`);
