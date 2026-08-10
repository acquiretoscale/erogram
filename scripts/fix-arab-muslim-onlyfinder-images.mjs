#!/usr/bin/env node
/**
 * Pull avatar URLs from OnlyFinder listing pages (media.onlyfinder.com) → R2.
 * No Apify. Fixes arab/muslim imports missing images.
 *
 * Usage: npx tsx --env-file=.env.local scripts/fix-arab-muslim-onlyfinder-images.mjs
 */
import mongoose from 'mongoose';
import { chromium } from 'playwright';

const TAGS = ['arab', 'muslim', 'hijabi', 'moroccan', 'turkish'];
const SLUGS = [
  'hijab', 'arab', 'egyptian', 'moroccan', 'turkish', 'muslim', 'persian', 'pakistani', 'punjabi',
  'lebanese', 'middle-eastern', 'niqab', 'islamic', 'cairo', 'beirut', 'istanbul', 'saudi', 'iraqi',
  'syrian', 'dubai', 'malay', 'indonesian', 'afghan', 'somali', 'albanian', 'halal', 'hijabi', 'turkey',
  'egypt', 'morocco', 'uae', 'jordan', 'palestinian', 'tunisian', 'algerian', 'kurdish', 'bosnian',
  'bedouin', 'berber', 'modest', 'veiled', 'abaya', 'ottoman', 'anatolian', 'alexandria', 'giza',
  'ankara', 'izmir', 'riyadh', 'jeddah', 'doha', 'karachi', 'lahore', 'islamabad', 'jakarta', 'kuala',
  'brunei', 'sudan', 'ethiopia', 'eritrea', 'bangladeshi', 'azerbaijani', 'uzbek', 'kazakh', 'tatar',
  'kosovo', 'chechen', 'maghrebi', 'maghreb', 'shia', 'sunni', 'ramadan', 'veil', 'burqa', 'chador',
  'pharaoh', 'nile', 'casablanca', 'marrakech', 'antalya', 'mecca', 'medina', 'muscat', 'manama',
  'amman', 'damascus', 'baghdad', 'basra', 'erbil', 'sanaa', 'dhaka', 'maldives', 'mauritania',
  'senegal', 'gambia', 'djibouti', 'libyan', 'yemeni', 'qatar', 'kuwait', 'arab-girl', 'arabian',
  'muslim-girl', 'muslimah', 'hijab-girl', 'turkish-girl', 'egyptian-girl', 'moroccan-girl',
  'arab-milf', 'turkish-milf', 'egypt-milf', 'maroc', 'marocaine', 'turquie', 'turk', 'turkce',
  'lebanon', 'syria', 'iraq', 'iran', 'palestine', 'jordanian', 'kuwaiti', 'qatari', 'emirati',
  'saudi-arabia', 'saudi-girl', 'dubai-girl', 'uae-girl', 'halal-girl', 'niqabi', 'niqabi-girl',
  'hijabi-girl', 'veiled-girl', 'headscarf', 'arab-model', 'middle-east', 'middle-eastern-girl', 'mena',
  'north-africa', 'north-african', 'south-asian', 'desi', 'desi-girl', 'punjabi-girl', 'urdu', 'pashto',
  'pashtun', 'malay-girl', 'malaysian', 'indonesian-girl', 'somali-girl', 'ethiopian-girl', 'eritrean',
  'habesha', 'berber-girl', 'amazigh', 'tamazight', 'moroccan-milf', 'egyptian-milf', 'turkish-milf',
  'arab-bbw', 'turkish-bbw', 'hijab-bbw', 'muslim-bbw', 'arab-petite', 'turkish-petite', 'hijab-petite',
  'feet-arab', 'modesty', 'henna', 'oud', 'sheikh', 'sultan', 'pyramids', 'fez', 'tanger', 'bursa',
  'adana', 'gaziantep', 'comoros', 'filipina-muslim', 'maranao', 'moro', 'mindanao', 'somalian',
  'amharic', 'tigrinya', 'oromo', 'swahili', 'zanzibar', 'zanzibari', 'comorian', 'mauritanian',
  'tuareg', 'fulani', 'hausa', 'yoruba-muslim', 'igbo-muslim', 'senegalese', 'gambian', 'gambian-girl',
  'malian', 'malian-girl', 'nigerian-muslim', 'nigerian-hijab', 'cameroonian', 'chadian', 'chadian-girl',
  'sudanese', 'sudanese-girl', 'south-sudan', 'libyan-girl', 'algerian-girl', 'tunisian-girl',
  'iranian', 'iranian-girl', 'persian-girl', 'afghan-girl', 'pakistani-girl', 'bangladeshi-girl',
  'indian-muslim', 'indian-hijab', 'kashmiri', 'kashmiri-girl', 'hyderabad', 'lucknow', 'delhi-muslim',
  'mumbai-muslim',
];

async function main() {
  const connectDB = (await import('../lib/db/mongodb.js')).default;
  const { OnlyFansCreator } = await import('../lib/models/index.js');
  const { processCreatorImages } = await import('../lib/actions/creatorImages.js');
  const { isR2Configured } = await import('../lib/r2.js');

  if (!isR2Configured()) throw new Error('R2 not configured');
  await connectDB();

  const needAv = await OnlyFansCreator.find({
    deleted: { $ne: true },
    categories: { $in: TAGS },
    $or: [{ avatar: '' }, { avatar: null }, { avatar: { $exists: false } }],
  })
    .select('slug username')
    .lean();
  const needSet = new Set(needAv.map((c) => c.username.toLowerCase()));
  console.log(`need avatar ${needSet.size}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const avatarByUser = new Map();
  for (const slug of SLUGS) {
    try {
      const r = await page.goto(`https://onlyfinder.com/${slug}`, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });
      if (!r || !r.ok()) continue;
      const rows = await page.evaluate(() => {
        const out = [];
        for (const img of document.querySelectorAll('img.img-responsive')) {
          const src = img.getAttribute('src') || '';
          if (!src.includes('media.onlyfinder.com')) continue;
          const alt = img.getAttribute('alt') || '';
          let username = '';
          const am = alt.match(/\s([a-zA-Z0-9._-]+)\s+OnlyFans\s*$/i);
          if (am) username = am[1].toLowerCase();
          if (!username) {
            let el = img.parentElement;
            for (let i = 0; i < 8 && el; i++, el = el.parentElement) {
              const tm = (el.textContent || '').match(/\|\s*(?:onlyfans\.com\s*)?>\s*([a-zA-Z0-9._-]+)/i);
              if (tm) {
                username = tm[1].toLowerCase();
                break;
              }
            }
          }
          if (username) out.push({ username, avatar: src });
        }
        return out;
      });
      for (const row of rows) {
        if (!avatarByUser.has(row.username)) avatarByUser.set(row.username, row.avatar);
      }
      if (rows.length) process.stdout.write(`  ${slug}: ${rows.length}\n`);
    } catch {}
    await page.waitForTimeout(120);
  }
  await browser.close();
  console.log(`onlyfinder images mapped ${avatarByUser.size}`);

  let ok = 0;
  let miss = 0;
  let fail = 0;

  for (const c of needAv) {
    const u = c.username.toLowerCase();
    const src = avatarByUser.get(u);
    if (!src) {
      miss++;
      continue;
    }
    try {
      await OnlyFansCreator.updateOne({ slug: c.slug }, { $set: { avatar: src, avatarThumbC50: src, avatarThumbC144: src } });
      const r = await processCreatorImages(c.slug);
      if (r.avatarR2) {
        ok++;
        process.stdout.write(`OK @${c.username}\n`);
      } else {
        fail++;
        process.stdout.write(`FAIL @${c.username} ${r.error || ''}\n`);
      }
    } catch (e) {
      fail++;
      process.stdout.write(`ERR @${c.username} ${e.message}\n`);
    }
  }

  console.log(`\nDone ok=${ok} miss=${miss} fail=${fail}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
