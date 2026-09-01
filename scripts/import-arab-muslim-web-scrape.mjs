/**
 * Insert web-scraped OnlyFinder/Prooven arab-muslim 1K-4K usernames into OnlyFansCreator.
 * No Apify. No Desktop files.
 * Usage: npx tsx --env-file=.env.local scripts/import-arab-muslim-web-scrape.mjs
 */
import mongoose from 'mongoose';
import fs from 'fs';

const LIKES_MIN = 1000;
const LIKES_MAX = 4000;
const CDP_OF =
  '/Users/themaf/.cursor/browser-logs/cdp-response-Runtime.evaluate-2026-08-10T13-08-50-664Z.json';

const PROOVEN = [
  ['jordanaspirefree', 3800, 'jordan'],
  ['royallyblzn420', 3500, 'arab'],
  ['thedevildidi', 3500, 'arab'],
  ['o0kawaii.kitten0o', 3500, 'egyptian'],
  ['jordan_xxxxxx', 3500, 'jordan'],
  ['alessiasuksss', 3400, 'jordan'],
  ['sorayaamour', 3200, 'egyptian'],
  ['forbiddenlina', 3100, 'muslim'],
  ['princess_brookie', 3100, 'persian'],
  ['norahlust', 2800, 'muslim'],
  ['scaarrlleett', 2700, 'hijab'],
  ['salmaiman', 2700, 'palestinian'],
  ['egirltiddytalk', 2700, 'afghan'],
  ['lambparisa', 2600, 'persian'],
  ['adoredmuslim', 2500, 'muslim'],
  ['jordaniaas', 2500, 'jordan'],
  ['arabshilan', 2400, 'iraqi'],
  ['milana_tv', 2400, 'dubai'],
  ['my_jasmine', 2400, 'dubai'],
  ['airjordan', 2300, 'jordan'],
  ['milkkymoons', 2300, 'indonesian'],
  ['bella.pretty', 2200, 'turkish'],
  ['alia.wong', 2200, 'malay'],
  ['jasmiinsecretsfree', 2100, 'iraqi'],
  ['ellaforbiddenfruit', 2100, 'pakistani'],
  ['laylanadia', 2000, 'egyptian'],
  ['nizde', 2000, 'turkish'],
  ['peachyarabgirl', 2000, 'hijabi'],
  ['thearabicqueen', 1900, 'arab'],
  ['ayahx', 1800, 'arab'],
  ['dirtychaitea28', 1800, 'middle-eastern'],
  ['malayiahk', 1800, 'malay'],
  ['fatimahijabi', 1700, 'hijab'],
  ['jordannafoxxofficial', 1400, 'jordan'],
  ['neilahffree', 1300, 'egyptian'],
  ['haleemaahmed', 1300, 'lebanese'],
  ['dubaiqueen', 1300, 'dubai'],
  ['ahalixxxila', 1200, 'arab'],
  ['jaxhamilton1', 1200, 'persian'],
  ['ivy-vixen', 1200, 'indonesian'],
  ['mirahabibti', 1100, 'egyptian'],
  ['melissamills24', 1100, 'persian'],
  ['lilzarax', 1000, 'hijab'],
  ['arabdollzara', 1000, 'arab'],
  ['nazluxe', 1000, 'persian'],
];

function isIndiaSource(source) {
  return /india|delhi|mumbai|hyderabad|lucknow|bangalore|chennai|indian/i.test(String(source || ''));
}

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

function loadAll() {
  const byUser = new Map();
  const raw = JSON.parse(fs.readFileSync(CDP_OF, 'utf8'));
  for (const c of raw.result?.value?.creators || []) {
    const u = String(c.username || '').toLowerCase().replace(/^@/, '');
    if (!u || isIndiaSource(c.source)) continue;
    const likes = Number(c.likes) || 0;
    if (likes < LIKES_MIN || likes > LIKES_MAX) continue;
    byUser.set(u, { username: u, likes, source: c.source || 'onlyfinder' });
  }
  for (const [u, likes, source] of PROOVEN) {
    const key = String(u).toLowerCase();
    if (isIndiaSource(source)) continue;
    if (likes < LIKES_MIN || likes > LIKES_MAX) continue;
    const prev = byUser.get(key);
    if (!prev || likes > prev.likes) byUser.set(key, { username: key, likes, source });
  }
  return [...byUser.values()];
}

async function main() {
  const connectDB = (await import('../lib/db/mongodb.js')).default;
  const { OnlyFansCreator } = await import('../lib/models/index.js');
  const { isCreatorBlacklisted } = await import('../lib/ofsearch/creatorBlacklist.js');

  const list = loadAll();
  console.log(`web-scraped unique ${list.length}`);

  await connectDB();

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let blocked = 0;

  for (const c of list) {
    if (isCreatorBlacklisted(c.username) || isCreatorBlacklisted(slugify(c.username))) {
      blocked++;
      continue;
    }
    const slug = slugify(c.username);
    const cats = catsFromSource(c.source);
    const existing = await OnlyFansCreator.findOne({ slug }).lean();
    if (existing) {
      await OnlyFansCreator.updateOne(
        { slug },
        {
          $addToSet: { categories: { $each: cats } },
          $set: {
            scrapedAt: new Date(),
            adminImported: true,
            ...(existing.likesCount == null || existing.likesCount === 0
              ? { likesCount: c.likes }
              : {}),
          },
        },
      );
      updated++;
      continue;
    }
    await OnlyFansCreator.create({
      name: c.username,
      username: c.username,
      slug,
      url: `https://onlyfans.com/${c.username}`,
      avatar: '',
      header: '',
      bio: '',
      subscriberCount: 0,
      likesCount: c.likes,
      mediaCount: 0,
      photosCount: 0,
      videosCount: 0,
      price: 0,
      isFree: true,
      isVerified: false,
      gender: 'female',
      categories: cats,
      scrapedAt: new Date(),
      adminImported: true,
    });
    inserted++;
  }

  const total = await OnlyFansCreator.countDocuments();
  console.log(
    JSON.stringify({ inserted, updated, skipped, blocked, DB_TOTAL: total }, null, 2),
  );
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
