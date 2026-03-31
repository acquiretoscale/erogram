/**
 * Re-scrape existing creators through hello.datawizards/onlyfans-scraper
 * to get full data: bio, 2 photos, website, location, social links, all stats.
 *
 * Usage: node scripts/enrich-category.js --category=streamer --limit=100
 */

const mongoose = require('mongoose');
const sharp = require('sharp');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
const BATCH_SIZE = 25; // datawizards handles ~25 at a time reliably

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const args = Object.fromEntries(
  process.argv.slice(2).map(a => a.replace('--', '').split('='))
);
const CATEGORY = args.category || 'streamer';
const LIMIT = parseInt(args.limit || '100', 10);

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
    Key: key,
    Body: optimized,
    ContentType: 'image/jpeg',
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

async function runApify(apiKey, actorId, usernames) {
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ search_queries: usernames }),
    }
  );
  if (!runRes.ok) throw new Error(`Apify start failed: ${runRes.status} ${await runRes.text()}`);
  const runId = (await runRes.json()).data?.id;
  if (!runId) throw new Error('No run ID');

  // Poll until done
  let status = 'RUNNING';
  while (!['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
    await new Promise(r => setTimeout(r, 6000));
    process.stdout.write('.');
    const poll = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`);
    status = (await poll.json()).data?.status;
  }
  if (status !== 'SUCCEEDED') throw new Error(`Run ${status}`);

  const dsRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}&limit=200`
  );
  return await dsRes.json();
}

function buildUpdate(item) {
  const subPrice = typeof item.subscribePrice === 'number'
    ? item.subscribePrice
    : parseFloat(String(item.subscribePrice || '0')) || 0;

  return {
    name: item.name || '',
    bio: (item.about || '').slice(0, 500),
    avatar: item.avatar || '',
    avatarThumbC50: item.avatarThumbs?.c50 || '',
    avatarThumbC144: item.avatarThumbs?.c144 || '',
    header: item.header || '',
    likesCount: item.favoritedCount || 0,
    photosCount: item.photosCount || 0,
    videosCount: item.videosCount || 0,
    audiosCount: item.audiosCount || 0,
    mediaCount: item.mediasCount || 0,
    postsCount: item.postsCount || 0,
    subscriberCount: item.subscribersCount || 0,
    price: subPrice,
    isFree: subPrice === 0,
    isVerified: item.isVerified || false,
    location: item.location || '',
    website: item.website || '',
    joinDate: item.joinDate || '',
    lastSeen: item.lastSeen || '',
    hasStories: item.hasStories || false,
    hasStream: item.hasStream || false,
    tipsEnabled: item.tipsEnabled || false,
    tipsMin: item.tipsMin || 0,
    tipsMax: item.tipsMax || 0,
    finishedStreamsCount: item.finishedStreamsCount || 0,
    onlyfansId: item.id || 0,
    scrapedAt: new Date(),
  };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // Get Apify credentials
  const settings = await db.collection('ofmsettings').findOne({ key: 'default' });
  if (!settings) throw new Error('No OFM settings');
  const activeKeys = (settings.apifyKeys || []).filter(k => k.active && !k.burned);
  if (!activeKeys.length) throw new Error('No active Apify keys');
  const apiKey = activeKeys[0].apiKey;
  const actor = (settings.apifyActor || 'hello.datawizards/onlyfans-scraper').replace('/', '~');

  console.log(`Actor: ${settings.apifyActor} | Category: ${CATEGORY} | Limit: ${LIMIT}\n`);

  // Get top N creators for this category sorted by likesCount
  const creators = await db.collection('onlyfanscreators')
    .find({ categories: CATEGORY, username: { $exists: true, $ne: '' } })
    .sort({ likesCount: -1 })
    .limit(LIMIT)
    .project({ slug: 1, username: 1 })
    .toArray();

  console.log(`Found ${creators.length} creators to enrich\n`);

  const usernames = creators.map(c => c.username || c.slug);
  let enriched = 0;
  let imagesOk = 0;

  // Process in batches
  for (let i = 0; i < usernames.length; i += BATCH_SIZE) {
    const batch = usernames.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(usernames.length / BATCH_SIZE);
    console.log(`\nBatch ${batchNum}/${totalBatches}: scraping ${batch.length} usernames`);

    let items;
    try {
      items = await runApify(apiKey, actor, batch);
    } catch (e) {
      console.log(`\n  Batch failed: ${e.message}, skipping`);
      continue;
    }
    console.log(`\n  Got ${items.length} results`);

    for (const item of items) {
      const username = item.username;
      if (!username) continue;

      const update = buildUpdate(item);
      const avatarSrc = update.avatar;
      const headerSrc = update.header;

      // Upload avatar to R2
      if (avatarSrc && !avatarSrc.includes('r2.dev')) {
        const buf = await downloadImage(avatarSrc);
        if (buf) {
          try {
            update.avatar = await uploadToR2(buf, `onlyfanssearch/${username}-onlyfans.jpg`);
          } catch {}
        }
      }

      // Upload header to R2
      if (headerSrc && !headerSrc.includes('r2.dev')) {
        const buf = await downloadImage(headerSrc);
        if (buf) {
          try {
            update.header = await uploadToR2(buf, `onlyfanssearch/${username}-onlyfans2.jpg`);
            imagesOk++;
          } catch {}
        }
      }

      if (update.avatar?.includes('r2.dev')) imagesOk++;

      await db.collection('onlyfanscreators').updateOne(
        { username },
        { $set: update, $addToSet: { categories: CATEGORY } }
      );
      enriched++;
      process.stdout.write(`  [${enriched}] ${username}\n`);
    }
  }

  console.log(`\nDone. ${enriched} enriched, ${imagesOk} images on R2.`);
  await mongoose.disconnect();
}

main().catch(e => { console.error('\nFATAL:', e.message); process.exit(1); });
