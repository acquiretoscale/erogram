#!/usr/bin/env node
/**
 * Fetch avatar + header from onlyfans.com/{username} (no Apify), then R2 rename/process.
 * Targets arab/muslim web imports missing images.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/fetch-arab-muslim-images-direct.mjs --limit 50
 */
import mongoose from 'mongoose';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const limit = parseInt(args[args.indexOf('--limit') + 1] || '9999', 10);
const TAGS = ['arab', 'muslim', 'hijabi', 'moroccan', 'turkish'];

async function fetchProfileFromOf(page, username) {
  let avatar = '';
  let header = '';
  const onResponse = async (res) => {
    const url = res.url();
    if (!url.includes('/api2/v2/users/') || !res.ok()) return;
    try {
      const j = await res.json();
      if (j?.avatar) avatar = j.avatar;
      if (j?.avatarThumbs?.c144 && !avatar) avatar = j.avatarThumbs.c144;
      if (j?.header) header = j.header;
      if (j?.headerThumbs?.w760 && !header) header = j.headerThumbs.w760;
    } catch {}
  };
  page.on('response', onResponse);
  try {
    await page.goto(`https://onlyfans.com/${username}`, {
      waitUntil: 'networkidle',
      timeout: 90000,
    });
    try {
      const accept = page.getByRole('button', { name: /accept all/i });
      if (await accept.isVisible({ timeout: 2500 })) await accept.click();
    } catch {}
    await page.waitForTimeout(8000);
    if (avatar || header) return { avatar, header };
    return await page.evaluate(() => {
      let av = '';
      let hd = '';
      for (const img of document.querySelectorAll('img')) {
        const src = img.src || '';
        if (/public\.onlyfans\.com\/files.*avatar/i.test(src)) av = av || src;
        if (/public\.onlyfans\.com\/files.*header/i.test(src)) hd = hd || src;
      }
      return { avatar: av, header: hd };
    });
  } finally {
    page.off('response', onResponse);
  }
}

async function main() {
  const connectDB = (await import('../lib/db/mongodb.js')).default;
  const { OnlyFansCreator } = await import('../lib/models/index.js');
  const { processCreatorImages } = await import('../lib/actions/creatorImages.js');
  const { isR2Configured } = await import('../lib/r2.js');

  if (!isR2Configured()) throw new Error('R2 not configured');

  await connectDB();

  const targets = await OnlyFansCreator.find({
    deleted: { $ne: true },
    categories: { $in: TAGS },
    $or: [{ avatar: '' }, { avatar: null }, { avatar: { $exists: false } }],
  })
    .sort({ scrapedAt: -1 })
    .limit(limit)
    .select('slug username avatar header')
    .lean();

  console.log(`targets ${targets.length}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const c of targets) {
    process.stdout.write(`@${c.username} `);
    try {
      const { avatar, header } = await fetchProfileFromOf(page, c.username);
      if (!avatar && !header) {
        console.log('SKIP no images');
        skip++;
        continue;
      }
      const set = {};
      if (avatar) set.avatar = avatar;
      if (header) set.header = header;
      await OnlyFansCreator.updateOne({ slug: c.slug }, { $set: set });
      let r;
      try {
        r = await processCreatorImages(c.slug);
      } catch (e) {
        // revalidatePath fails outside Next request — images may still be saved
        const doc = await OnlyFansCreator.findOne({ slug: c.slug }).select('avatar header').lean();
        r = {
          avatarR2: doc?.avatar?.includes('r2') || doc?.avatar?.includes(process.env.R2_PUBLIC_URL || '___') ? doc.avatar : null,
          headerR2: doc?.header?.includes('r2') || doc?.header?.includes(process.env.R2_PUBLIC_URL || '___') ? doc.header : null,
          error: e.message,
        };
      }
      if (r.avatarR2 || r.headerR2) {
        ok++;
        console.log(`OK av=${!!r.avatarR2} hd=${!!r.headerR2}`);
      } else {
        fail++;
        console.log(`FAIL ${r.error || 'no r2'}`);
      }
    } catch (e) {
      fail++;
      console.log(`ERR ${e.message}`);
    }
  }

  await browser.close();
  console.log(`\nDone ok=${ok} skip=${skip} fail=${fail}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
