/* eslint-disable */
/**
 * Re-scrape a single OnlyFans creator (avatar + profile) via Apify, optimize the photo,
 * upload it to R2, then propagate EROGRAM-WIDE: OnlyFansCreator + TrendingOFCreator rail
 * + linked onlyfans-creator Campaign. Fixes creators added with an empty avatar (shows "M").
 *
 * Mirrors lib/actions/submitCreator.ts (fetchCreatorFromApify + optimizeAndUploadToR2)
 * and lib/r2.ts (uploadToR2). Master-edit behavior matches lib/actions/ofm.ts.
 *
 * Usage: node scripts/rescrape-creator.js <username> [<username> ...]
 */
const mongoose = require('mongoose');
const sharp = require('sharp');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;
const APIFY_TOKEN = process.env.APIFY_SUBMIT_TOKEN;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'erogramimages';
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }
if (!APIFY_TOKEN) { console.error('APIFY_SUBMIT_TOKEN not set — cannot scrape'); process.exit(1); }

const usernames = process.argv.slice(2);
if (usernames.length === 0) { console.error('Usage: node scripts/rescrape-creator.js <username> [...]'); process.exit(1); }

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const slugify = (u) => u.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

async function optimizeAndUploadToR2(sourceUrl, key) {
  try {
    const resp = await fetch(sourceUrl);
    if (!resp.ok) return null;
    const buf = Buffer.from(await resp.arrayBuffer());
    const optimized = await sharp(buf)
      .jpeg({ quality: 95, mozjpeg: true })
      .withMetadata({ exif: { IFD0: { Copyright: '© Erogram.pro', Artist: 'Erogram.pro', ImageDescription: 'Erogram.pro - OnlyFans Creator Directory' } } })
      .toBuffer();
    await r2.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: optimized, ContentType: 'image/jpeg' }));
    return `${R2_PUBLIC_URL}/${key}`;
  } catch (e) {
    console.error('    R2 upload failed:', e.message);
    return null;
  }
}

// Mirror of fetchCreatorFromApify scrape (actor hello.datawizards~onlyfans-scraper).
async function scrape(username) {
  const cleaned = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const actorId = 'hello.datawizards~onlyfans-scraper';
  const runRes = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ search_queries: [cleaned] }),
  });
  if (!runRes.ok) { console.error(`    Apify run start failed: ${runRes.status}`); return null; }
  const runData = await runRes.json();
  const runId = runData.data?.id;
  if (!runId) return null;
  let status = runData.data?.status;
  const start = Date.now();
  while (!['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
    if (Date.now() - start > 90_000) { console.error('    Apify timed out'); return null; }
    await new Promise((r) => setTimeout(r, 4000));
    const poll = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
    status = (await poll.json()).data?.status;
  }
  if (status !== 'SUCCEEDED') { console.error(`    Apify status: ${status}`); return null; }
  const dataRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&limit=5`);
  const items = await dataRes.json();
  if (!Array.isArray(items) || items.length === 0) { console.error('    No results from Apify'); return null; }
  const exact = items.find((i) => (i.username || '').toLowerCase() === cleaned) || items[0];
  if (!exact?.username) return null;
  return exact;
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const creators = mongoose.connection.db.collection('onlyfanscreators');
  const trending = mongoose.connection.db.collection('trendingofcreators');
  const campaigns = mongoose.connection.db.collection('campaigns');

  for (const u of usernames) {
    console.log(`\n=== @${u} ===`);
    const exact = await scrape(u);
    if (!exact) { console.log('  ✗ Scrape failed — skipping'); continue; }

    const username = exact.username;
    const slug = slugify(username);
    const name = exact.name || username;
    console.log(`  Scraped: name="${name}"  rawAvatar=${exact.avatar ? 'yes' : 'NONE'}  rawHeader=${exact.header ? 'yes' : 'NONE'}`);

    // Optimize + upload to R2 (avatar = profile photo, header = cover).
    let avatar = '';
    let header = '';
    if (exact.avatar) avatar = (await optimizeAndUploadToR2(exact.avatar, `onlyfanssearch/${slug}-onlyfans.jpg`)) || exact.avatar;
    if (exact.header) header = (await optimizeAndUploadToR2(exact.header, `onlyfanssearch/${slug}-onlyfans2.jpg`)) || exact.header;
    console.log(`  Avatar → ${avatar ? (avatar.includes('r2.dev') || avatar.includes(R2_PUBLIC_URL.replace('https://','')) ? 'R2 ✓' : 'raw (R2 failed)') : 'NONE'}`);

    const bio = (exact.about || '').slice(0, 500);
    const subPrice = typeof exact.subscribePrice === 'number' ? exact.subscribePrice : parseFloat(String(exact.subscribePrice || '0')) || 0;

    // 1) Master record: OnlyFansCreator.
    await creators.updateOne({ slug }, { $set: {
      name, username, slug, avatar,
      avatarThumbC50: exact.avatarThumbs?.c50 || '', avatarThumbC144: exact.avatarThumbs?.c144 || '',
      header, bio, url: `https://onlyfans.com/${username}`, gender: 'female',
      price: subPrice, isFree: subPrice === 0, isVerified: exact.isVerified || false,
      likesCount: exact.favoritedCount || 0, subscriberCount: exact.subscribersCount || 0,
      photosCount: exact.photosCount || 0, videosCount: exact.videosCount || 0,
      scrapedAt: new Date(),
    } }, { upsert: true });
    console.log('  ✓ OnlyFansCreator updated');

    // 2) EROGRAM-WIDE propagation → featured rail + linked campaign.
    const rx = new RegExp(`^${esc(username)}$`, 'i');
    const railSet = { name };
    if (avatar) railSet.avatar = avatar;
    const railRes = await trending.updateMany({ username: rx }, { $set: railSet });
    const campSet = { name };
    if (avatar) campSet.creative = avatar;
    const campRes = await campaigns.updateMany({ adType: 'onlyfans-creator', ofUsername: rx }, { $set: campSet });
    console.log(`  ✓ Propagated → rail(${railRes.modifiedCount}) + campaign(${campRes.modifiedCount})`);
  }

  console.log('\nDone.');
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
