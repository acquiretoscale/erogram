/**
 * SMALL BATCH TEST: 10 blonde profiles with likes 1000-4000.
 * Actor: hello.datawizards/onlyfans-scraper (usernames only — it cannot search categories).
 * Usage: npx tsx --env-file=.env.local scripts/scrape-blonde-1k-4k-test.mjs
 */
import mongoose from 'mongoose';

const CATEGORY = 'blonde';
const TARGET = 10;
const LIKES_MIN = 1000;
const LIKES_MAX = 4000;
const ACTOR = 'hello.datawizards~onlyfans-scraper';
const BATCH = 25;
const MAX_BATCHES = 2; // hard cost cap

function slugify(u) {
  return String(u).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}
function firstLink(arr) {
  if (!Array.isArray(arr) || !arr.length) return '';
  return typeof arr[0] === 'string' ? arr[0] : arr[0]?.url || '';
}

function build(item) {
  const subPrice =
    typeof item.subscribePrice === 'number'
      ? item.subscribePrice
      : parseFloat(String(item.subscribePrice || '0')) || 0;
  const websiteRaw = item.website || '';
  let ig = item.instagramUrl || item.primaryInstagram || firstLink(item.instagramLinks) || '';
  let tw = item.twitterUrl || firstLink(item.twitterLinks) || '';
  let tk = item.tiktokUrl || firstLink(item.tiktokLinks) || '';
  let website = websiteRaw;
  if (websiteRaw && !ig && /instagram\.com/i.test(websiteRaw)) ig = websiteRaw;
  if (websiteRaw && !tw && /(twitter\.com|x\.com)/i.test(websiteRaw)) {
    tw = websiteRaw;
    website = '';
  }
  if (websiteRaw && !tk && /tiktok\.com/i.test(websiteRaw)) {
    tk = websiteRaw;
    website = '';
  }
  const media = (item.photosCount || 0) + (item.videosCount || 0);
  return {
    name: item.name || item.username,
    username: item.username,
    avatar: item.avatar || '',
    avatarThumbC50: item.avatarThumbs?.c50 || '',
    avatarThumbC144: item.avatarThumbs?.c144 || '',
    header: item.header || '',
    bio: (item.about || '').slice(0, 500),
    gender: 'female',
    price: subPrice,
    isFree: subPrice === 0,
    isVerified: !!item.isVerified,
    likesCount: item.favoritedCount || 0,
    subscriberCount: item.subscribersCount || 0,
    mediaCount: item.mediasCount || media,
    photosCount: item.photosCount || 0,
    videosCount: item.videosCount || 0,
    audiosCount: item.audiosCount || 0,
    postsCount: item.postsCount || 0,
    location: item.location || '',
    website,
    joinDate: item.joinDate || '',
    lastSeen: item.lastSeen || '',
    onlyfansId: item.id || 0,
    hasStories: !!item.hasStories,
    hasStream: !!item.hasStream,
    tipsEnabled: !!item.tipsEnabled,
    tipsMin: item.tipsMin || 0,
    tipsMax: item.tipsMax || 0,
    showMediaCount: !!item.showMediaCount,
    favoritesCount: item.favoritesCount || 0,
    subscriptionBundles: item.subscription_bundles || null,
    promotions: Array.isArray(item.promotions) ? item.promotions.filter(Boolean) : [],
    instagramUrl: ig,
    instagramUsername: item.instagramUsername || item.primaryInstagramUsername || '',
    twitterUrl: tw,
    tiktokUrl: tk,
    telegramUrl: item.telegramUrl || '',
    fanslyUrl: item.fanslyUrl || firstLink(item.fanslyLinks) || '',
    pornhubUrl: item.pornhubUrl || firstLink(item.pornhubLinks) || '',
    scrapedAt: new Date(),
    adminImported: true,
  };
}

async function runActor(apiKey, usernames) {
  const start = await fetch(`https://api.apify.com/v2/acts/${ACTOR}/runs?token=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ search_queries: usernames }),
  });
  const sj = await start.json();
  if (!sj.data?.id) throw new Error(sj.error?.message || String(start.status));
  const runId = sj.data.id;
  let status = sj.data.status;
  process.stdout.write(`  run ${runId} `);
  while (!['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
    await new Promise((r) => setTimeout(r, 4000));
    process.stdout.write('.');
    status = (await (await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`)).json())
      .data.status;
  }
  console.log(` ${status}`);
  if (status !== 'SUCCEEDED') throw new Error(status);
  const full = await (await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`)).json();
  const items = await (
    await fetch(
      `https://api.apify.com/v2/datasets/${full.data.defaultDatasetId}/items?token=${apiKey}&limit=200`,
    )
  ).json();
  console.log(`  CU ${full.data?.stats?.computeUnits?.toFixed(4)} items ${Array.isArray(items) ? items.length : 'ERR'}`);
  return Array.isArray(items) ? items : [];
}

async function main() {
  const connectDB = (await import('../lib/db/mongodb.js')).default;
  const { OnlyFansCreator } = await import('../lib/models/index.js');
  const { processCreatorImages } = await import('../lib/actions/creatorImages.js');

  await connectDB();
  const db = mongoose.connection.db;
  const settings = await db.collection('ofmsettings').findOne({ key: 'default' });
  const apiKey =
    (settings?.apifyKeys || []).find((k) => k.label === 'owner-aug10')?.apiKey ||
    (settings?.apifyKeys || []).find((k) => k.active && !k.burned)?.apiKey;
  if (!apiKey) throw new Error('No Apify key');
  console.log(`key …${apiKey.slice(-4)} | actor ${ACTOR} | band ${LIKES_MIN}-${LIKES_MAX}\n`);

  const candidates = await db
    .collection('onlyfanscreators')
    .find({
      deleted: { $ne: true },
      gender: 'female',
      $or: [{ categories: CATEGORY }, { bio: /blonde|blond/i }, { name: /blond/i }],
      likesCount: { $lte: 6000 },
    })
    .project({ username: 1, likesCount: 1 })
    .sort({ likesCount: -1 })
    .limit(BATCH * MAX_BATCHES)
    .toArray();

  const names = [...new Set(candidates.map((c) => c.username).filter(Boolean))];
  console.log(`candidates ${names.length}`);

  const keep = [];
  for (let i = 0; i < names.length && keep.length < TARGET && i / BATCH < MAX_BATCHES; i += BATCH) {
    const batch = names.slice(i, i + BATCH);
    let items = [];
    try {
      items = await runActor(apiKey, batch);
    } catch (e) {
      console.log(`  FAIL ${e.message}`);
      break;
    }
    for (const item of items) {
      if (!item?.username) continue;
      const likes = item.favoritedCount || 0;
      if (likes < LIKES_MIN || likes > LIKES_MAX) continue;
      if (keep.some((k) => k.username.toLowerCase() === item.username.toLowerCase())) continue;
      keep.push(item);
      console.log(`  [${keep.length}/${TARGET}] @${item.username} likes=${likes}`);
      if (keep.length >= TARGET) break;
    }
  }

  const saved = [];
  for (const item of keep.slice(0, TARGET)) {
    const fields = build(item);
    if (fields.likesCount < LIKES_MIN || fields.likesCount > LIKES_MAX) continue;
    const slug = slugify(fields.username);
    await OnlyFansCreator.findOneAndUpdate(
      { slug },
      {
        $set: { ...fields, slug },
        $addToSet: { categories: CATEGORY },
        $setOnInsert: { url: `https://onlyfans.com/${fields.username}` },
      },
      { upsert: true, strict: false },
    );
    try {
      await processCreatorImages(slug);
    } catch {}
    saved.push({ username: fields.username, likes: fields.likesCount, slug });
  }

  console.log(`\n=== SAVED ${saved.length}/${TARGET} (${LIKES_MIN}-${LIKES_MAX} likes) ===`);
  for (const s of saved) {
    console.log(`${s.username}\t${s.likes}\thttp://127.0.0.1:3939/onlyfanssearch/${s.slug}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
