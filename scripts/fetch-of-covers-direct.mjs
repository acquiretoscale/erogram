#!/usr/bin/env node
/**
 * Fetch OnlyFans cover from onlyfans.com/{username} (no Apify).
 * Download → optimize → R2: onlyfanssearch/{slug}-onlyfans-header.jpg
 *
 * Requires: npm install --no-save playwright@1.50.1 && npx playwright install chromium
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/fetch-of-covers-direct.mjs --limit 20
 *   npx tsx --env-file=.env.local scripts/fetch-of-covers-direct.mjs --limit 20 --dry-run
 */
import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { chromium } from 'playwright';

dotenv.config({ path: '.env.local' });

const args = process.argv.slice(2);
const limit = parseInt(args[args.indexOf('--limit') + 1] || '20', 10);
const dryRun = args.includes('--dry-run');
const R2_PUBLIC = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

function hasCover(header) {
  if (!header || typeof header !== 'string') return false;
  const h = header.trim();
  if (!h) return false;
  if (R2_PUBLIC && h.includes(R2_PUBLIC)) return true;
  return h.startsWith('http');
}

function profileUrl(creator) {
  const u = (creator.username || '').trim();
  if (!u) return '';
  return `https://onlyfans.com/${u}`;
}

async function fetchHeaderFromOf(page, username) {
  let apiHeader = '';
  const onResponse = async (res) => {
    const url = res.url();
    if (!url.includes('/api2/v2/users/') || !res.ok()) return;
    try {
      const j = await res.json();
      if (j?.header) apiHeader = j.header;
    } catch {}
  };
  page.on('response', onResponse);
  try {
    await page.goto(`https://onlyfans.com/${username}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    try {
      const accept = page.getByRole('button', { name: /accept all/i });
      if (await accept.isVisible({ timeout: 2500 })) await accept.click();
    } catch {}
    await page.waitForTimeout(7000);
    if (apiHeader) return apiHeader;
    return await page.evaluate(() => {
      const urls = new Set();
      for (const el of document.querySelectorAll('*')) {
        const src = el.src || '';
        if (/public\.onlyfans\.com\/files\/.*\/header/i.test(src)) urls.add(src);
        const bg = getComputedStyle(el).backgroundImage || '';
        for (const m of bg.matchAll(/url\(["']?(https:\/\/public\.onlyfans\.com\/files\/[^"')]+)["']?\)/gi)) {
          if (/header/i.test(m[1])) urls.add(m[1]);
        }
      }
      return [...urls][0] || '';
    });
  } finally {
    page.off('response', onResponse);
  }
}

async function main() {
  const connectDB = (await import('../lib/db/mongodb.js')).default;
  const { downloadImage } = await import('../lib/actions/creatorImages.js');
  const { optimizeCreatorPhoto } = await import('../lib/creatorMedia.js');
  const { uploadToR2, isR2Configured } = await import('../lib/r2.js');
  const { OnlyFansCreator } = await import('../lib/models/index.js');

  if (!isR2Configured()) throw new Error('R2 not configured');

  await connectDB();

  const topByClicks = await OnlyFansCreator.find({ deleted: { $ne: true } })
    .sort({ clicks: -1 })
    .limit(limit)
    .select('slug username clicks header url')
    .lean();

  const targets = topByClicks.filter((c) => !hasCover(c.header));
  console.log(`Top ${limit} by clicks: ${topByClicks.length}, need cover: ${targets.length}${dryRun ? ' [DRY RUN]' : ''}\n`);
  for (const c of targets) {
    console.log(`  #${c.clicks} @${c.username} → ${profileUrl(c)}`);
  }

  if (targets.length === 0) {
    await mongoose.disconnect();
    return;
  }
  if (dryRun) {
    console.log('\nDry run — no OF fetch / R2 / DB writes.');
    await mongoose.disconnect();
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  const report = [];
  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const creator of targets) {
    const username = creator.username;
    console.log(`\n@${username} ...`);
    let ofHeader = '';
    try {
      ofHeader = await fetchHeaderFromOf(page, username);
    } catch (e) {
      console.log(`  FAIL scrape: ${e.message}`);
      fail++;
      report.push({ username, slug: creator.slug, status: 'scrape_failed', error: e.message });
      continue;
    }

    if (!ofHeader) {
      console.log('  SKIP: no header on OF page');
      skip++;
      report.push({ username, slug: creator.slug, status: 'no_of_header' });
      continue;
    }

    const buf = await downloadImage(ofHeader);
    if (!buf) {
      console.log('  FAIL: download');
      fail++;
      report.push({ username, slug: creator.slug, status: 'download_failed', ofHeader });
      continue;
    }

    let optimized;
    try {
      optimized = await optimizeCreatorPhoto(buf);
    } catch (e) {
      console.log(`  FAIL optimize: ${e.message}`);
      fail++;
      report.push({ username, slug: creator.slug, status: 'optimize_failed' });
      continue;
    }

    const key = `onlyfanssearch/${creator.slug}-onlyfans-header.jpg`;
    const r2Url = await uploadToR2(optimized, key, 'image/jpeg');
    const sizeKb = Math.round(optimized.length / 1024);

    const res = await OnlyFansCreator.updateOne(
      {
        slug: creator.slug,
        $or: [{ header: '' }, { header: null }, { header: { $exists: false } }],
      },
      { $set: { header: r2Url } },
    );

    if (res.modifiedCount === 0) {
      console.log('  SKIP: header already set');
      skip++;
      report.push({ username, slug: creator.slug, status: 'already_had_header' });
      continue;
    }

    ok++;
    console.log(`  OK ${sizeKb}KB → ${r2Url}`);
    report.push({ username, slug: creator.slug, status: 'ok', r2Url, sizeKb, ofHeader });
  }

  await browser.close();

  fs.mkdirSync('tmp', { recursive: true });
  const outPath = `tmp/fetch-of-covers-direct-${limit}-${Date.now()}.json`;
  fs.writeFileSync(outPath, JSON.stringify({ ok, skip, fail, report }, null, 2));

  console.log(`\nDone: ${ok} ok, ${skip} skip, ${fail} fail`);
  console.log(`Report: ${outPath}`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
