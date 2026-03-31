/**
 * Pre-seeds gallery images for Lovescape by querying Tavily and saving to disk.
 * Usage: node scripts/fetch-lovescape-gallery.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
require('dotenv').config({ path: '.env.local' });

const SLUG = 'ai-girlfriend-lovescape';
const NAME = 'Lovescape';
const VENDOR = 'Lovescape.com';
const TAVILY_KEY = process.env.TAVILY_API_KEY || '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';
const GALLERY_DIR = path.join(__dirname, '..', 'public', 'assets', 'ainsfw', 'gallery', SLUG);
const TARGET = 6;
const MIN_WIDTH = 600;
const MAX_WIDTH = 1000;

async function downloadAndProcess(url, outPath) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    });
    clearTimeout(t);
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('image')) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 5000) return false;
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < MIN_WIDTH) return false;
    await sharp(buf)
      .resize(Math.min(meta.width, MAX_WIDTH), undefined, { withoutEnlargement: true })
      .jpeg({ quality: 95, mozjpeg: true })
      .toFile(outPath);
    return true;
  } catch (e) {
    return false;
  }
}

async function main() {
  fs.mkdirSync(GALLERY_DIR, { recursive: true });

  // Check what's already there
  const existing = fs.readdirSync(GALLERY_DIR).filter(f => f.endsWith('.jpg')).length;
  if (existing >= TARGET) {
    console.log(`Already have ${existing} images, nothing to do.`);
    return;
  }

  console.log(`Searching Tavily for ${NAME} screenshots...`);
  const query = `${NAME} ${VENDOR} app screenshots interface preview`;
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TAVILY_KEY,
      query,
      search_depth: 'advanced',
      include_images: true,
      include_image_descriptions: false,
      max_results: 15,
    }),
  });

  if (!res.ok) { console.error('Tavily error:', res.status, await res.text()); return; }

  const data = await res.json();
  const urls = [];
  if (data.images) for (const img of data.images) { const u = typeof img === 'string' ? img : img?.url; if (u) urls.push(u); }
  if (data.results) for (const r of data.results) { if (r.images) for (const img of r.images) { const u = typeof img === 'string' ? img : img?.url; if (u && !urls.includes(u)) urls.push(u); } }

  console.log(`Found ${urls.length} candidate image URLs`);

  let saved = existing;
  for (const url of urls) {
    if (saved >= TARGET) break;
    const outPath = path.join(GALLERY_DIR, `${saved + 1}.jpg`);
    if (fs.existsSync(outPath)) { saved++; continue; }
    process.stdout.write(`  [${saved + 1}/${TARGET}] ${url.slice(0, 70)}... `);
    const ok = await downloadAndProcess(url, outPath);
    console.log(ok ? '✓' : '✗ skipped');
    if (ok) saved++;
  }

  console.log(`\nDone — ${saved} images saved to public/assets/ainsfw/gallery/${SLUG}/`);
}

main().catch(console.error);
