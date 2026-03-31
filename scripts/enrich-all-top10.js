/**
 * Enrich top 10 of EVERY category via hello.datawizards/onlyfans-scraper.
 * Gets full data: bio, 2 photos, website, location, join date, all stats.
 *
 * Usage: node scripts/enrich-all-top10.js
 */

const mongoose = require('mongoose');
const sharp = require('sharp');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const CATEGORIES = [
  'asian','blonde','teen','milf','amateur','redhead','goth','petite',
  'big-ass','big-boobs','brunette','latina','ahegao','alt','cosplay',
  'fitness','tattoo','ebony','feet','lingerie','thick','squirt','piercing',
];

async function downloadImage(url) {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!resp.ok) return null;
    return Buffer.from(await resp.arrayBuffer());
  } catch { return null; }
}

async function uploadToR2(buf, key) {
  const optimized = await sharp(buf)
    .jpeg({ quality: 95, mozjpeg: true })
    .withMetadata({ exif: { IFD0: { Copyright: '© Erogram.pro', Artist: 'Erogram.pro' } } })
    .toBuffer();
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || 'erogramimages',
    Key: key, Body: optimized, ContentType: 'image/jpeg',
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

async function runApify(apiKey, actorId, usernames) {
  const res = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ search_queries: usernames }),
  });
  if (!res.ok) throw new Error(`Apify start failed: ${res.status}`);
  const runId = (await res.json()).data?.id;
  if (!runId) throw new Error('No run ID');

  let status = 'RUNNING';
  while (!['SUCCEEDED','FAILED','ABORTED','TIMED-OUT'].includes(status)) {
    await new Promise(r => setTimeout(r, 6000));
    process.stdout.write('.');
    const poll = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`);
    status = (await poll.json()).data?.status;
  }
  if (status !== 'SUCCEEDED') throw new Error(`Run ${status}`);

  const ds = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}&limit=200`);
  return await ds.json();
}

function buildUpdate(item) {
  const sp = typeof item.subscribePrice === 'number' ? item.subscribePrice : parseFloat(String(item.subscribePrice || '0')) || 0;
  return {
    name: item.name || '',
    bio: (item.about || '').slice(0, 500),
    avatar: item.avatar || '',
    header: item.header || '',
    likesCount: item.favoritedCount || 0,
    photosCount: item.photosCount || 0,
    videosCount: item.videosCount || 0,
    mediaCount: item.mediasCount || 0,
    postsCount: item.postsCount || 0,
    subscriberCount: item.subscribersCount || 0,
    price: sp, isFree: sp === 0,
    isVerified: item.isVerified || false,
    location: item.location || '',
    website: item.website || '',
    joinDate: item.joinDate || '',
    lastSeen: item.lastSeen || '',
    hasStories: item.hasStories || false,
    hasStream: item.hasStream || false,
    finishedStreamsCount: item.finishedStreamsCount || 0,
    onlyfansId: item.id || 0,
    scrapedAt: new Date(),
  };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const settings = await db.collection('ofmsettings').findOne({ key: 'default' });
  const activeKeys = (settings?.apifyKeys || []).filter(k => k.active && !k.burned);
  if (!activeKeys.length) throw new Error('No active Apify keys');
  const apiKey = activeKeys[0].apiKey;
  const actor = (settings.apifyActor || 'hello.datawizards/onlyfans-scraper').replace('/', '~');

  // Collect unique usernames from top 10 of each category
  const usernameSet = new Set();
  const usernameList = [];

  for (const cat of CATEGORIES) {
    const top10 = await db.collection('onlyfanscreators')
      .find({ categories: cat })
      .sort({ likesCount: -1 })
      .limit(10)
      .project({ username: 1, slug: 1 })
      .toArray();
    for (const c of top10) {
      const u = c.username || c.slug;
      if (u && !usernameSet.has(u)) {
        usernameSet.add(u);
        usernameList.push(u);
      }
    }
  }

  console.log(`${CATEGORIES.length} categories × top 10 = ${usernameList.length} unique creators to enrich\n`);

  // Batch into groups of 25
  let enriched = 0, images = 0;
  const BATCH = 25;
  const totalBatches = Math.ceil(usernameList.length / BATCH);

  for (let i = 0; i < usernameList.length; i += BATCH) {
    const batch = usernameList.slice(i, i + BATCH);
    const batchNum = Math.floor(i / BATCH) + 1;
    console.log(`\nBatch ${batchNum}/${totalBatches}: ${batch.length} usernames`);

    let items;
    try { items = await runApify(apiKey, actor, batch); }
    catch (e) { console.log(`\n  FAIL: ${e.message}`); continue; }
    console.log(`\n  Got ${items.length} results`);

    for (const item of items) {
      if (!item.username) continue;
      const u = item.username;
      const update = buildUpdate(item);

      if (update.avatar && !update.avatar.includes('r2.dev')) {
        const buf = await downloadImage(update.avatar);
        if (buf) { try { update.avatar = await uploadToR2(buf, `onlyfanssearch/${u}-onlyfans.jpg`); images++; } catch {} }
      }
      if (update.header && !update.header.includes('r2.dev')) {
        const buf = await downloadImage(update.header);
        if (buf) { try { update.header = await uploadToR2(buf, `onlyfanssearch/${u}-onlyfans2.jpg`); images++; } catch {} }
      }

      await db.collection('onlyfanscreators').updateOne({ username: u }, { $set: update });
      enriched++;
      console.log(`  [${enriched}] ${u}`);
    }
  }

  console.log(`\nDone. ${enriched} enriched, ${images} images uploaded to R2.`);
  await mongoose.disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
