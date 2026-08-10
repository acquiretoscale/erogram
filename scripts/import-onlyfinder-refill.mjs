/**
 * Import OnlyFinder refill candidates via Apify (hello.datawizards/onlyfans-scraper).
 * Usage: npx tsx --env-file=.env.local scripts/import-onlyfinder-refill.mjs
 */
import mongoose from 'mongoose';
import fs from 'fs';

const CANDIDATES_FILE = '/Users/themaf/Desktop/Lists/onlyfinder-refill-candidates.json';
const ACTOR = 'hello.datawizards/onlyfans-scraper';
const BATCH_SIZE = 25;
const LIKES_MAX = 2000;

function slugify(username) {
  return username.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function firstLink(arr) {
  if (!Array.isArray(arr) || !arr.length) return '';
  if (typeof arr[0] === 'string') return arr[0];
  return arr[0]?.url || '';
}

function buildSetFields(exact) {
  const subPrice =
    typeof exact.subscribePrice === 'number'
      ? exact.subscribePrice
      : parseFloat(String(exact.subscribePrice || '0')) || 0;
  const bio = (exact.about || '').slice(0, 500);
  const totalMedia = (exact.photosCount || 0) + (exact.videosCount || 0);
  const websiteRaw = exact.website || '';

  let igUrl = exact.instagramUrl || exact.primaryInstagram || firstLink(exact.instagramLinks) || '';
  let twUrl = exact.twitterUrl || firstLink(exact.twitterLinks) || '';
  let tkUrl = exact.tiktokUrl || firstLink(exact.tiktokLinks) || '';
  const tgUrl = exact.telegramUrl || '';
  let finalWebsite = websiteRaw;

  if (websiteRaw && !igUrl && /instagram\.com/i.test(websiteRaw)) igUrl = websiteRaw;
  if (websiteRaw && !twUrl && /(twitter\.com|x\.com)/i.test(websiteRaw)) {
    twUrl = websiteRaw;
    finalWebsite = '';
  }
  if (websiteRaw && !tkUrl && /tiktok\.com/i.test(websiteRaw)) {
    tkUrl = websiteRaw;
    finalWebsite = '';
  }

  return {
    name: exact.name || exact.username,
    username: exact.username,
    avatar: exact.avatar || '',
    avatarThumbC50: exact.avatarThumbs?.c50 || '',
    avatarThumbC144: exact.avatarThumbs?.c144 || '',
    header: exact.header || '',
    bio,
    gender: 'female',
    price: subPrice,
    isFree: subPrice === 0,
    isVerified: exact.isVerified || false,
    likesCount: exact.favoritedCount || 0,
    subscriberCount: exact.subscribersCount || 0,
    mediaCount: exact.mediasCount || totalMedia,
    photosCount: exact.photosCount || 0,
    videosCount: exact.videosCount || 0,
    audiosCount: exact.audiosCount || 0,
    postsCount: exact.postsCount || 0,
    location: exact.location || '',
    website: finalWebsite,
    joinDate: exact.joinDate || exact.joinedDate || '',
    lastSeen: exact.lastSeen || '',
    onlyfansId: exact.id || 0,
    firstPublishedPostDate: exact.firstPublishedPostDate || '',
    hasStories: exact.hasStories || false,
    hasStream: exact.hasStream || false,
    hasScheduledStream: exact.hasScheduledStream || false,
    tipsEnabled: exact.tipsEnabled || false,
    tipsTextEnabled: exact.tipsTextEnabled || false,
    tipsMin: exact.tipsMin || 0,
    tipsMinInternal: exact.tipsMinInternal || 0,
    tipsMax: exact.tipsMax || 0,
    finishedStreamsCount: exact.finishedStreamsCount || 0,
    showMediaCount: exact.showMediaCount || false,
    isRestricted: exact.isRestricted || false,
    canEarn: exact.canEarn || false,
    canChat: exact.canChat || false,
    privateArchivedPostsCount: exact.privateArchivedPostsCount || 0,
    favoritesCount: exact.favoritesCount || 0,
    subscriptionBundles: exact.subscription_bundles || null,
    promotions: Array.isArray(exact.promotions) ? exact.promotions.filter(Boolean) : [],
    instagramUrl: igUrl,
    instagramUsername: exact.instagramUsername || exact.primaryInstagramUsername || '',
    twitterUrl: twUrl,
    tiktokUrl: tkUrl,
    telegramUrl: tgUrl,
    fanslyUrl: exact.fanslyUrl || firstLink(exact.fanslyLinks) || '',
    fanvueUrl: exact.fanvueUrl || firstLink(exact.fanvueLinks) || '',
    pornhubUrl: exact.pornhubUrl || firstLink(exact.pornhubLinks) || '',
    redditUrl: exact.redditUrl || firstLink(exact.redditLinks) || '',
    linktreeUrl: exact.linktreeUrl || '',
    allmylinksUrl: exact.allmylinksUrl || '',
    beaconsUrl: exact.beaconsUrl || '',
    patreonUrl: exact.patreonUrl || firstLink(exact.patreonLinks) || '',
    scrapedAt: new Date(),
    adminImported: true,
  };
}

async function runApify(apiKey, actorId, usernames) {
  const runRes = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ search_queries: usernames }),
  });
  if (!runRes.ok) throw new Error(`Apify start failed: ${runRes.status} ${(await runRes.text()).slice(0, 200)}`);
  const runId = (await runRes.json()).data?.id;
  if (!runId) throw new Error('No run ID');

  let status = 'RUNNING';
  while (!['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
    await new Promise((r) => setTimeout(r, 5000));
    const poll = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`);
    status = (await poll.json()).data?.status;
  }
  if (status !== 'SUCCEEDED') throw new Error(`Run ${status}`);

  const dsRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}&limit=200`,
  );
  return dsRes.json();
}

async function main() {
  const connectDB = (await import('../lib/db/mongodb.js')).default;
  const { processCreatorImages } = await import('../lib/actions/creatorImages.js');
  const { OnlyFansCreator, ScrapeRun } = await import('../lib/models/index.js');

  const data = JSON.parse(fs.readFileSync(CANDIDATES_FILE, 'utf8'));
  const userCats = new Map();
  for (const [niche, block] of Object.entries(data.niches)) {
    for (const u of block.picked || []) {
      const key = u.toLowerCase();
      if (!userCats.has(key)) userCats.set(key, new Set());
      userCats.get(key).add(niche);
    }
  }

  const allUsers = [...userCats.keys()];
  console.log(`Importing ${allUsers.length} usernames across ${Object.keys(data.niches).length} niches\n`);

  await connectDB();
  const db = mongoose.connection.db;
  const settings = await db.collection('ofmsettings').findOne({ key: 'default' });
  const apiKey =
    (settings?.apifyKeys || []).find((k) => k.active && !k.burned)?.apiKey || process.env.APIFY_API_TOKEN;
  if (!apiKey) throw new Error('No Apify key');

  const actorId = ACTOR.replace('/', '~');
  let saved = 0;
  let skippedLikes = 0;
  let failed = 0;
  const byNiche = Object.fromEntries(Object.keys(data.niches).map((k) => [k, 0]));

  for (let i = 0; i < allUsers.length; i += BATCH_SIZE) {
    const batch = allUsers.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allUsers.length / BATCH_SIZE);
    console.log(`Batch ${batchNum}/${totalBatches} (${batch.length} users)...`);

    let items;
    try {
      items = await runApify(apiKey, actorId, batch);
    } catch (e) {
      console.log(`  batch fail: ${e.message}`);
      failed += batch.length;
      continue;
    }

    console.log(`  got ${items.length} results`);

    for (const item of items) {
      const username = (item.username || '').toLowerCase();
      if (!username) continue;

      const likes = item.favoritedCount || 0;
      if (likes >= LIKES_MAX) {
        console.log(`  SKIP likes ${likes} @${username}`);
        skippedLikes++;
        continue;
      }

      const slug = slugify(username);
      const cats = [...(userCats.get(username) || [])];
      const setFields = buildSetFields(item);
      setFields.slug = slug;

      await OnlyFansCreator.findOneAndUpdate(
        { slug },
        {
          $set: setFields,
          $addToSet: { categories: { $each: cats } },
          $setOnInsert: { url: `https://onlyfans.com/${item.username}` },
        },
        { upsert: true, strict: false },
      );

      try {
        await processCreatorImages(slug);
      } catch (e) {
        console.log(`  img fail ${slug}: ${e.message}`);
      }

      saved++;
      for (const c of cats) byNiche[c]++;
      console.log(`  [${saved}] @${item.username} likes=${likes} cats=${cats.join(',')}`);
    }
  }

  await ScrapeRun.create({
    source: 'bulk',
    query: 'onlyfinder-refill-7-niches',
    actorId: ACTOR,
    status: 'succeeded',
    maxItems: allUsers.length,
    totalItems: allUsers.length,
    saved,
    skipped: skippedLikes + failed,
    startedAt: new Date(),
    completedAt: new Date(),
  });

  console.log('\n=== DONE ===');
  console.log(`Saved: ${saved}, skipped likes>=${LIKES_MAX}: ${skippedLikes}, failed batches: ${failed}`);
  for (const [k, v] of Object.entries(byNiche)) {
    console.log(`  ${k}: ${v} imported`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
