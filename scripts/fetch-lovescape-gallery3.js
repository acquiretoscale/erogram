/**
 * Pulls the best Lovescape ad creatives from our own R2/campaigns
 * and saves them as gallery images for the AINSFW listing.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const SLUG = 'ai-girlfriend-lovescape';
const GALLERY_DIR = path.join(__dirname, '..', 'public', 'assets', 'ainsfw', 'gallery', SLUG);
const TARGET = 6;

// Hand-pick the best static (non-GIF) creatives — active first, then best ended ones
const PRIORITY_URLS = [
  // Active campaigns — highest quality, most recent
  'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/uploads/e03432e8-2dfa-454e-a536-4972dbe5fdeb.webp', // No Limits, No Rules
  'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/uploads/4db59895-46b8-4f37-9fe6-0c644ecea132.webp', // Play Without Limits
  'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/uploads/972c95eb-5841-47e7-881d-0ece88a8fd10.webp', // Private & Uncensored
  'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/uploads/1d888c56-cfc7-4842-8534-87cc7731d3ae.webp', // Build Your Secret Slut
  'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/uploads/3ea1a11f-a0f9-4462-8e87-52792a8ab191.webp', // Private & Uncensored (v2)
  'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/uploads/53416cf4-25a9-4fbe-98f8-6a14638df856.png', // No Limits, No Rules (PNG)
  // Best ended ones as fallback
  'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/ae316eae-5f08-4da6-bc41-f5e397bae09b.png', // She Knows What You Want
  'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/b35d1b00-59b2-4cf7-a1fc-c97687861e4a.png', // Feels Personal. Feels Real.
  'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/f720dfcc-d8b4-470c-85fe-0de94defa1e5.png', // Not Just Chat. Chemistry.
];

async function downloadAndSave(url, outPath) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) { console.log('  HTTP', r.status, url.slice(-40)); return false; }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 10000) { console.log('  tiny skip', url.slice(-40)); return false; }
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < 300) { console.log('  too small', meta.width, url.slice(-40)); return false; }
    await sharp(buf)
      .resize(900, undefined, { withoutEnlargement: true })
      .jpeg({ quality: 92, mozjpeg: true })
      .toFile(outPath);
    return true;
  } catch (e) {
    console.log('  err:', e.message, url.slice(-40));
    return false;
  }
}

async function main() {
  fs.mkdirSync(GALLERY_DIR, { recursive: true });

  // Clear existing gallery (we're replacing with better images)
  const existing = fs.readdirSync(GALLERY_DIR).filter(f => f.endsWith('.jpg'));
  for (const f of existing) fs.unlinkSync(path.join(GALLERY_DIR, f));
  console.log(`Cleared ${existing.length} old images`);

  let saved = 0;
  for (const url of PRIORITY_URLS) {
    if (saved >= TARGET) break;
    const outPath = path.join(GALLERY_DIR, `${saved + 1}.jpg`);
    process.stdout.write(`[${saved + 1}/${TARGET}] ${url.slice(-50)} ... `);
    const ok = await downloadAndSave(url, outPath);
    console.log(ok ? '✓' : '✗');
    if (ok) saved++;
  }

  console.log(`\nDone — ${saved} gallery images saved to public/assets/ainsfw/gallery/${SLUG}/`);
}

main().catch(console.error);
