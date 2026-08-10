/**
 * Apify-scrape OnlyFinder/Prooven arab-muslim niche usernames (1K-4K likes) into OnlyFansCreator.
 * Usage: npx tsx --env-file=.env.local scripts/scrape-arab-muslim-1k-4k.mjs
 * Does NOT write files to Desktop.
 */
import mongoose from 'mongoose';
import fs from 'fs';

const LIKES_MIN = 1000;
const LIKES_MAX = 4000;
const DW = 'hello.datawizards~onlyfans-scraper';
const BATCH = 25;
const CDP_OF =
  '/Users/themaf/.cursor/browser-logs/cdp-response-Runtime.evaluate-2026-08-10T13-08-50-664Z.json';

const PROOVEN = [
  ['jordanaspirefree', 'jordan'],
  ['royallyblzn420', 'arab'],
  ['thedevildidi', 'arab'],
  ['o0kawaii.kitten0o', 'egyptian'],
  ['jordan_xxxxxx', 'jordan'],
  ['alessiasuksss', 'jordan'],
  ['sorayaamour', 'egyptian'],
  ['forbiddenlina', 'muslim'],
  ['princess_brookie', 'persian'],
  ['norahlust', 'muslim'],
  ['scaarrlleett', 'hijab'],
  ['salmaiman', 'palestinian'],
  ['egirltiddytalk', 'afghan'],
  ['lambparisa', 'persian'],
  ['adoredmuslim', 'muslim'],
  ['jordaniaas', 'jordan'],
  ['arabshilan', 'iraqi'],
  ['milana_tv', 'dubai'],
  ['my_jasmine', 'dubai'],
  ['airjordan', 'jordan'],
  ['milkkymoons', 'indonesian'],
  ['bella.pretty', 'turkish'],
  ['alia.wong', 'malay'],
  ['jasmiinsecretsfree', 'iraqi'],
  ['ellaforbiddenfruit', 'pakistani'],
  ['laylanadia', 'egyptian'],
  ['nizde', 'turkish'],
  ['peachyarabgirl', 'hijabi'],
  ['thearabicqueen', 'arab'],
  ['ayahx', 'arab'],
  ['dirtychaitea28', 'middle-eastern'],
  ['malayiahk', 'malay'],
  ['fatimahijabi', 'hijab'],
  ['jordannafoxxofficial', 'jordan'],
  ['neilahffree', 'egyptian'],
  ['haleemaahmed', 'lebanese'],
  ['dubaiqueen', 'dubai'],
  ['ahalixxxila', 'arab'],
  ['jaxhamilton1', 'persian'],
  ['ivy-vixen', 'indonesian'],
  ['mirahabibti', 'egyptian'],
  ['melissamills24', 'persian'],
  ['lilzarax', 'hijab'],
  ['arabdollzara', 'arab'],
  ['nazluxe', 'persian'],
];

function catsFromSource(source) {
  const s = String(source || '').toLowerCase();
  const out = new Set();
  if (/hijab|niqab|veil|modest|abaya|halal/.test(s)) out.add('hijabi');
  if (/muslim|islam|muslimah/.test(s)) out.add('muslim');
  if (/morocc|maroc|casablanca|marrakech|fez|tanger|maghreb|berber|amazigh/.test(s)) {
    out.add('moroccan');
    out.add('arab');
  }
  if (/turk|istanbul|ankara|izmir|antalya|bursa|anatolia|ottoman/.test(s)) out.add('turkish');
  if (
    /arab|egypt|cairo|alexandria|leban|iraq|syria|dubai|saudi|jordan|palestin|kuwait|qatar|uae|beirut|damascus|baghdad|middle.?east|mena|gulf|persian|iran|afghan|kurd/.test(
      s,
    )
  ) {
    out.add('arab');
  }
  if (/pakistan|bangla|malay|indones|somali|sudan|ethiop|eritre|uzbek|kazakh|azerbai|alban|bosnia|kosovo/.test(s)) {
    out.add('muslim');
  }
  if (out.size === 0) out.add('arab');
  return [...out];
}

function slugify(u) {
  return String(u)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
function firstLink(arr) {
  if (!Array.isArray(arr) || !arr.length) return '';
  return typeof arr[0] === 'string' ? arr[0] : arr[0]?.url || '';
}
function inRange(likes) {
  return likes >= LIKES_MIN && likes <= LIKES_MAX;
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

async function runDw(apiKey, usernames) {
  const start = await fetch(`https://api.apify.com/v2/acts/${DW}/runs?token=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ search_queries: usernames }),
  });
  const sj = await start.json();
  if (!sj.data?.id) throw new Error(sj.error?.message || String(start.status));
  const runId = sj.data.id;
  let status = sj.data.status;
  process.stdout.write(`  apify ${usernames.length} ${runId} `);
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

function loadCandidates() {
  const byUser = new Map();
  const raw = JSON.parse(fs.readFileSync(CDP_OF, 'utf8'));
  for (const c of raw.result?.value?.creators || []) {
    const u = String(c.username || '').toLowerCase();
    if (!u) continue;
    byUser.set(u, { username: u, source: c.source || 'onlyfinder' });
  }
  for (const [u, source] of PROOVEN) {
    const key = u.toLowerCase();
    if (!byUser.has(key)) byUser.set(key, { username: key, source });
  }
  return [...byUser.values()];
}

async function main() {
  const connectDB = (await import('../lib/db/mongodb.js')).default;
  const { OnlyFansCreator } = await import('../lib/models/index.js');
  const { processCreatorImages } = await import('../lib/actions/creatorImages.js');
  const { isCreatorBlacklisted } = await import('../lib/onlyfanssearch/creatorBlacklist.js');

  const candidates = loadCandidates();
  console.log(`candidates ${candidates.length}`);

  await connectDB();
  const db = mongoose.connection.db;
  const settings = await db.collection('ofmsettings').findOne({ key: 'default' });
  const allKeys = (settings?.apifyKeys || []).filter((k) => k?.apiKey && !k.burned);
  // Prefer known working labels / tails used by other scrape scripts
  allKeys.sort((a, b) => {
    const score = (k) =>
      (k.apiKey?.endsWith('Qo3W') ? 100 : 0) +
      (k.label === 'owner-aug10' ? 50 : 0) +
      (k.active ? 10 : 0);
    return score(b) - score(a);
  });
  if (!allKeys.length) throw new Error('No Apify key');
  let keyIdx = 0;
  let apiKey = allKeys[0].apiKey;
  console.log(
    `keys ${allKeys.map((k) => `${k.label || '?'}…${k.apiKey.slice(-4)}`).join(' | ')} | start …${apiKey.slice(-4)} | band ${LIKES_MIN}-${LIKES_MAX}`,
  );

  function rotateKey(reason) {
    keyIdx += 1;
    if (keyIdx >= allKeys.length) throw new Error(`No more Apify keys (${reason})`);
    apiKey = allKeys[keyIdx].apiKey;
    console.log(`  rotate → …${apiKey.slice(-4)} (${reason})`);
  }

  const existing = new Set(
    (
      await db
        .collection('onlyfanscreators')
        .find({ username: { $in: candidates.map((c) => c.username) } })
        .project({ username: 1 })
        .toArray()
    ).map((d) => String(d.username).toLowerCase()),
  );
  const todo = candidates.filter((c) => {
    if (existing.has(c.username)) return false;
    if (isCreatorBlacklisted(c.username) || isCreatorBlacklisted(slugify(c.username))) return false;
    return true;
  });
  console.log(`already in DB ${existing.size} | to scrape ${todo.length}`);

  const sourceByUser = new Map(todo.map((c) => [c.username, c.source]));
  let saved = 0;
  let skippedRange = 0;
  let failed = 0;

  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH).map((c) => c.username);
    console.log(`\nbatch ${i / BATCH + 1}/${Math.ceil(todo.length / BATCH)}`);
    let items = [];
    let attempts = 0;
    while (attempts < allKeys.length) {
      try {
        items = await runDw(apiKey, batch);
        break;
      } catch (e) {
        const msg = String(e.message || e);
        console.log(`  FAIL ${msg}`);
        if (/hard limit|limit exceeded|402|payment|quota/i.test(msg)) {
          try {
            rotateKey(msg.slice(0, 60));
            attempts++;
            continue;
          } catch (rot) {
            console.log(`  ${rot.message}`);
            failed += batch.length;
            items = null;
            break;
          }
        }
        failed += batch.length;
        items = null;
        break;
      }
    }
    if (!items) continue;
    for (const item of items) {
      if (!item?.username) continue;
      const u = String(item.username).toLowerCase();
      if (isCreatorBlacklisted(u) || isCreatorBlacklisted(slugify(u))) continue;
      const fields = build(item);
      if (!inRange(fields.likesCount)) {
        skippedRange++;
        continue;
      }
      const slug = slugify(fields.username);
      const cats = catsFromSource(sourceByUser.get(u) || 'arab');
      await OnlyFansCreator.findOneAndUpdate(
        { slug },
        {
          $set: { ...fields, slug },
          $addToSet: { categories: { $each: cats } },
          $setOnInsert: { url: `https://onlyfans.com/${fields.username}` },
        },
        { upsert: true, strict: false },
      );
      try {
        await processCreatorImages(slug);
      } catch {}
      saved++;
      console.log(`  SAVED @${fields.username} likes=${fields.likesCount} cats=${cats.join(',')}`);
    }
  }

  const total = await OnlyFansCreator.countDocuments();
  console.log(`\n=== DONE saved=${saved} skippedRange=${skippedRange} failish=${failed} DB_TOTAL=${total} ===`);
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
