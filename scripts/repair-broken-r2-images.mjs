#!/usr/bin/env node
/**
 * Repair broken/missing R2 avatars: Playwright → onlyfans.com/{username} → R2 process.
 * No Apify. Clears dead R2 URLs first so processCreatorImages re-downloads.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/repair-broken-r2-images.mjs --scan
 *   npx tsx --env-file=.env.local scripts/repair-broken-r2-images.mjs --limit 50
 *   npx tsx --env-file=.env.local scripts/repair-broken-r2-images.mjs --usernames goddessofsin666,kaliwoolfx
 */
import mongoose from 'mongoose';
import { chromium } from 'playwright';
import fs from 'fs';

const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 9999;
const scanOnly = args.includes('--scan');
const userIdx = args.indexOf('--usernames');
const userArg = userIdx >= 0 ? args[userIdx + 1] : undefined;

async function headOk(url) {
  if (!url) return false;
  try {
    const r = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(12000) });
    return r.ok;
  } catch {
    return false;
  }
}

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
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    try {
      const accept = page.getByRole('button', { name: /accept all/i });
      if (await accept.isVisible({ timeout: 2500 })) await accept.click();
    } catch {}
    await page.waitForTimeout(6000);
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

async function findBrokenTargets(OnlyFansCreator, r2Host) {
  const empty = await OnlyFansCreator.find({
    deleted: { $ne: true },
    $or: [{ avatar: '' }, { avatar: null }, { avatar: { $exists: false } }],
  })
    .select('slug username avatar header url')
    .lean();

  const withR2 = await OnlyFansCreator.find({
    deleted: { $ne: true },
    avatar: { $regex: r2Host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') },
  })
    .select('slug username avatar header url')
    .lean();

  const brokenR2 = [];
  const BATCH = 30;
  for (let i = 0; i < withR2.length; i += BATCH) {
    const batch = withR2.slice(i, i + BATCH);
    const checks = await Promise.all(
      batch.map(async (c) => ({ c, ok: await headOk(c.avatar) })),
    );
    for (const { c, ok } of checks) {
      if (!ok) brokenR2.push(c);
    }
    process.stdout.write(`\rScanned R2 avatars ${Math.min(i + BATCH, withR2.length)}/${withR2.length}, broken ${brokenR2.length}`);
  }
  console.log('');

  const seen = new Set();
  const merged = [];
  for (const c of [...empty, ...brokenR2]) {
    if (seen.has(c.slug)) continue;
    seen.add(c.slug);
    merged.push(c);
  }
  return merged;
}

async function main() {
  const connectDB = (await import('../lib/db/mongodb.js')).default;
  const { OnlyFansCreator } = await import('../lib/models/index.js');
  const { processCreatorImages } = await import('../lib/actions/creatorImages.js');
  const { isR2Configured } = await import('../lib/r2.js');

  if (!isR2Configured()) throw new Error('R2 not configured');
  const r2Host = new URL(process.env.R2_PUBLIC_URL).host;

  await connectDB();

  let targets;
  if (userArg) {
    const names = userArg.split(',').map((s) => s.trim()).filter(Boolean);
    targets = await OnlyFansCreator.find({ username: { $in: names } })
      .select('slug username avatar header url')
      .lean();
  } else {
    targets = await findBrokenTargets(OnlyFansCreator, r2Host);
  }

  console.log(`Broken/missing targets: ${targets.length}`);
  const outPath = '/Users/themaf/Desktop/ErogramPRO-scratch/broken-avatar-targets.json';
  fs.writeFileSync(outPath, JSON.stringify(targets.map((t) => t.username), null, 2));
  console.log('List:', outPath);

  if (scanOnly) {
    console.log('Scan only — exiting.');
    process.exit(0);
  }

  targets = targets.slice(0, limit);
  console.log(`Repairing ${targets.length}...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const c of targets) {
    const ofUrl = c.url || `https://onlyfans.com/${c.username}`;
    process.stdout.write(`@${c.username} `);
    try {
      const { avatar, header } = await fetchProfileFromOf(page, c.username);
      if (!avatar && !header) {
        console.log('SKIP no OF images');
        skip++;
        continue;
      }

      const set = { scrapedAt: new Date(), url: ofUrl };
      if (avatar) {
        set.avatar = avatar;
        set.avatarThumbC50 = avatar;
        set.avatarThumbC144 = avatar;
      }
      if (header) set.header = header;

      await OnlyFansCreator.updateOne({ slug: c.slug }, { $set: set });

      let r;
      try {
        r = await processCreatorImages(c.slug);
      } catch (e) {
        const doc = await OnlyFansCreator.findOne({ slug: c.slug }).select('avatar header').lean();
        r = {
          avatarR2: doc?.avatar?.includes(r2Host) ? doc.avatar : null,
          headerR2: doc?.header?.includes(r2Host) ? doc.header : null,
          error: e.message,
        };
      }

      if (r.avatarR2 || r.headerR2) {
        const live = await headOk(r.avatarR2 || r.headerR2);
        if (live) {
          ok++;
          console.log(`OK av=${!!r.avatarR2} hd=${!!r.headerR2}`);
        } else {
          fail++;
          console.log('FAIL r2 still 404');
        }
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
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
