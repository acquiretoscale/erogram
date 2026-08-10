/**
 * 20 blonde/brunette/redhead under 1K likes via Apify datawizards (Qo3W).
 * Candidates from OnlyFinder list (hidden/<2k) then hard-filter favoritedCount < 1000.
 * Usage: npx tsx --env-file=.env.local scripts/scrape-hair-1k.mjs
 */
import mongoose from 'mongoose';
import fs from 'fs';

const GROUPS = ['blonde', 'brunette', 'redhead'];
const TARGET = 20;
const LIKES_MAX = 1000;
const DW = 'hello.datawizards~onlyfans-scraper';
const CANDIDATES = '/Users/themaf/Desktop/Lists/onlyfinder-refill-candidates.json';

function slugify(u) {
  return String(u).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}
function firstLink(arr) {
  if (!Array.isArray(arr) || !arr.length) return '';
  return typeof arr[0] === 'string' ? arr[0] : arr[0]?.url || '';
}

function buildFromDw(item) {
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
    twitterUrl: tw,
    tiktokUrl: tk,
    telegramUrl: item.telegramUrl || '',
    fanslyUrl: item.fanslyUrl || firstLink(item.fanslyLinks) || '',
    pornhubUrl: item.pornhubUrl || firstLink(item.pornhubLinks) || '',
    scrapedAt: new Date(),
    adminImported: true,
  };
}

async function runDw(apiKey, usernames) {
  const start = await fetch(`https://api.apify.com/v2/acts/${DW}/runs?token=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ search_queries: usernames }),
  });
  const sj = await start.json();
  if (!sj.data?.id) throw new Error(sj.error?.message || `start ${start.status}`);
  const runId = sj.data.id;
  let status = sj.data.status;
  process.stdout.write(`  dw ${usernames.length} ${runId} `);
  while (!['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
    await new Promise((r) => setTimeout(r, 4000));
    process.stdout.write('.');
    status = (await (await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`)).json()).data
      .status;
  }
  console.log(` ${status}`);
  if (status !== 'SUCCEEDED') throw new Error(status);
  const full = await (await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`)).json();
  return (
    await (
      await fetch(
        `https://api.apify.com/v2/datasets/${full.data.defaultDatasetId}/items?token=${apiKey}&limit=200`,
      )
    ).json()
  );
}

async function main() {
  const connectDB = (await import('../lib/db/mongodb.js')).default;
  const { processCreatorImages } = await import('../lib/actions/creatorImages.js');
  const { OnlyFansCreator } = await import('../lib/models/index.js');

  const data = JSON.parse(fs.readFileSync(CANDIDATES, 'utf8'));
  await connectDB();
  const db = mongoose.connection.db;
  const settings = await db.collection('ofmsettings').findOne({ key: 'default' });
  const apiKey = (settings?.apifyKeys || []).find((k) => k.apiKey?.endsWith('Qo3W'))?.apiKey;
  if (!apiKey) throw new Error('Qo3W key missing');

  for (const cat of GROUPS) {
    console.log(`\n=== ${cat} ===`);
    const names = [...new Set((data.niches[cat]?.picked || []).map((u) => u.toLowerCase()))];
    // Prefer OnlyFinder hidden-likes first
    const meta = data.niches[cat]?.pickedMeta || [];
    const hiddenFirst = [
      ...meta.filter((m) => m.likesHidden).map((m) => m.username),
      ...meta.filter((m) => !m.likesHidden && (m.likes == null || m.likes < LIKES_MAX)).map((m) => m.username),
      ...names,
    ];
    const ordered = [...new Set(hiddenFirst.map((u) => u.toLowerCase()))];
    console.log(`  candidates ${ordered.length}`);

    const want = [];
    for (let i = 0; i < ordered.length && want.length < TARGET; i += 25) {
      const batch = ordered.slice(i, i + 25);
      let items = [];
      try {
        items = await runDw(apiKey, batch);
      } catch (e) {
        console.log(`  FAIL ${e.message}`);
        break;
      }
      for (const item of items || []) {
        if (!item?.username) continue;
        const likes = item.favoritedCount || 0;
        if (likes >= LIKES_MAX) continue;
        if (want.some((w) => w.username.toLowerCase() === item.username.toLowerCase())) continue;
        want.push(item);
        console.log(`  [${want.length}/${TARGET}] @${item.username} likes=${likes}`);
        if (want.length >= TARGET) break;
      }
    }

    let saved = 0;
    for (const item of want.slice(0, TARGET)) {
      const fields = buildFromDw(item);
      const slug = slugify(fields.username);
      await OnlyFansCreator.findOneAndUpdate(
        { slug },
        {
          $set: { ...fields, slug },
          $addToSet: { categories: cat },
          $setOnInsert: { url: `https://onlyfans.com/${fields.username}` },
        },
        { upsert: true, strict: false },
      );
      try {
        await processCreatorImages(slug);
      } catch {}
      saved++;
    }
    console.log(`  → saved ${saved}/${TARGET}`);
    console.log(`  http://127.0.0.1:3939/onlyfanssearch/top-10-${cat}-onlyfans-models`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
