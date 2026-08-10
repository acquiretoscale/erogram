/**
 * Reliable per-username OnlyFinder refill import (sync Apify, exact match only).
 * Usage: npx tsx --env-file=.env.local scripts/import-onlyfinder-refill-sync.mjs
 */
import mongoose from 'mongoose';
import fs from 'fs';

const CANDIDATES_FILE = '/Users/themaf/Desktop/Lists/onlyfinder-refill-candidates.json';
const ACTOR = 'hello.datawizards/onlyfans-scraper';
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

async function main() {
  const connectDB = (await import('../lib/db/mongodb.js')).default;
  const { processCreatorImages } = await import('../lib/actions/creatorImages.js');
  const { OnlyFansCreator } = await import('../lib/models/index.js');

  const data = JSON.parse(fs.readFileSync(CANDIDATES_FILE, 'utf8'));
  const jobs = [];
  for (const [niche, block] of Object.entries(data.niches)) {
    for (const u of block.picked || []) {
      jobs.push({ username: u, niche });
    }
  }

  await connectDB();
  const db = mongoose.connection.db;
  const settings = await db.collection('ofmsettings').findOne({ key: 'default' });
  const apiKey =
    (settings?.apifyKeys || []).find((k) => k.active && !k.burned)?.apiKey || process.env.APIFY_API_TOKEN;
  if (!apiKey) throw new Error('No Apify key');

  const actorId = ACTOR.replace('/', '~');
  const r2Host = process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).host : 'r2.dev';

  let saved = 0;
  let skipped = 0;
  let skippedLikes = 0;
  let failed = 0;
  const byNiche = Object.fromEntries(Object.keys(data.niches).map((k) => [k, 0]));

  console.log(`Sync import: ${jobs.length} niche slots (${new Set(jobs.map((j) => j.username.toLowerCase())).size} unique users)\n`);

  for (let i = 0; i < jobs.length; i++) {
    const { username, niche } = jobs[i];
    const key = username.toLowerCase();
    const slug = slugify(username);

    const existing = await OnlyFansCreator.findOne({
      $or: [{ username: key }, { slug }],
      deleted: { $ne: true },
    }).lean();

    if (
      existing?.avatar?.includes(r2Host) &&
      Array.isArray(existing.categories) &&
      existing.categories.includes(niche) &&
      (existing.likesCount || 0) < LIKES_MAX
    ) {
      skipped++;
      byNiche[niche]++;
      continue;
    }

    process.stdout.write(`[${i + 1}/${jobs.length}] @${username} (${niche})... `);

    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search_queries: [username] }),
      },
    );

    if (!runRes.ok) {
      console.log(`FAIL ${runRes.status}`);
      failed++;
      continue;
    }

    const items = await runRes.json();
    if (!Array.isArray(items) || !items.length) {
      console.log('EMPTY');
      failed++;
      continue;
    }

    const exact =
      items.find((it) => (it.username || '').toLowerCase() === key) ||
      items.find((it) => (it.username || '').toLowerCase().replace(/\./g, '') === key.replace(/\./g, ''));

    if (!exact?.username) {
      console.log('NO MATCH');
      failed++;
      continue;
    }

    const likes = exact.favoritedCount || 0;
    if (likes >= LIKES_MAX) {
      console.log(`SKIP likes ${likes}`);
      skippedLikes++;
      continue;
    }

    const setFields = buildSetFields(exact);
    setFields.slug = slugify(exact.username);

    await OnlyFansCreator.findOneAndUpdate(
      { slug: setFields.slug },
      {
        $set: setFields,
        $addToSet: { categories: niche },
        $setOnInsert: { url: `https://onlyfans.com/${exact.username}` },
      },
      { upsert: true, strict: false },
    );

    try {
      await processCreatorImages(setFields.slug);
    } catch {}

    saved++;
    byNiche[niche]++;
    console.log(`OK likes=${likes}`);
  }

  console.log('\n=== SYNC DONE ===');
  console.log(`New scrapes: ${saved}, already ok: ${skipped}, likes>=${LIKES_MAX}: ${skippedLikes}, failed: ${failed}`);
  for (const [k, v] of Object.entries(byNiche)) {
    console.log(`  ${k}: ${v} with category`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
