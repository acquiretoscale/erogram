/* eslint-disable */
/**
 * Hard-delete DMCA-blacklisted OnlyFans creators + their R2 images.
 * Forever blocklist lives in lib/ofsearch/creatorBlacklist.ts
 *
 *   node scripts/eradicate-dmca-creators.js --dry-run
 *   node scripts/eradicate-dmca-creators.js
 */
const mongoose = require('mongoose');
const { S3Client, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;
const DRY_RUN = process.argv.includes('--dry-run');

// Exact usernames known present + full claim alias set (eradicate any that exist)
const TARGETS = [
  'beckydaisy', 'becksdaisy', 'becksdaisy1', 'becksdaisy__',
  'sofieesoles', 'sofieebabyy', 'sofiee',
  'dianakills', 'dianakillingsworth', 'shibahuskymom',
  'lazylittleleaf', 'lazyleaff', 'lazypurpleleaf',
  'luraymama', 'onaartist', 'daisymaymommy',
  'thepregnantbabe', 'jamieispregnant', 'jamiejerksme',
  'freeeroticneko', 'eroticneko', 'siashicat',
  'urthickpersiangf', 'urthickpersiangfnoppv', 'meliaclaps', 'angelflairee',
  'roomorgue',
  'tymwitsfree', 'tymwits',
  'nikkirita', 'nikkiritaa', 'nikkiritaaa', 'nikkiritapriv',
  'marichka18', 'marichkacute', 'interestingclara', 'marichka_keye', 'mirenbloom',
  'marichka_vibe', 'lil_marichka', 'marichka_honeyy', 'mariichkama', 'cherry_flick', 'nillaglow',
  'mialushhh', 'mialushhhvip', 'sagittariusgrl',
  'anibae', 'anibae.vip', 'anibae.free', 'anibae_cos', 'amandastunning',
  'skyrhi', 'skyrhi_', 'skyyrhi',
  'htownliv',
  'jaydenee',
  // previously purged but re-add guard
  'natashatosini', 'francety', 'ashleyyyreyyy', 'stellabrooks', 'babydollll',
  'amibuexo', 'amibue', 'amibuexx', 'pennylondon', 'pennylondon_x', 'melthewhale',
  'thevivonline', 'helloviv', 'luciddreamexe', 'lu2hot', 'emmaswrld', 'your_fatale',
  'yeah_bamby', 'bambi_baby', 'bellajynxxx', 'bellajynx', 'blahgigi', 'lioqueen',
  'jocy_cosplay', 'jocycosplay', 'jocycosplay.vip', 'bellebrooksxo', 'honeyrashell',
  'summerstarz', 'pussiesncream_', 'kassqueen98', 'charlotte_rachel', 'charlotterachel',
  'gem101', 'justgemma',
  // Aug 9 2026 Google notices wave
  'pasteljelliesvip', 'pasteljelliesc', 'pasteljellies',
  'dangerousdilemma', 'baritoneilemma', 'deliciousdilemma',
  'viktoriapeach', 'viktoria69peach', 'viktoriapeach69',
  'marsha may', 'marshaxxxmay', 'marshamay',
  'glitterandfangs', 'softcorecosplay', 'bobacorecos',
  'executionergf', 'executionergfvip', 'bom trady', 'bomtrady',
  'shamelessx', 'shameless-sg', 'shamelessxx',
  'bluebeari3', 'bluebeari', 'yourbluebeari', 'bluebeari3vip', 'bluebeari3exclusive',
  'nali marie', 'nali-marie', 'nalimarie', 'nalimarieofficial', 'nalimariefree',
  'paleseafoam', 'paleseafoa', 'palseafoam',
  'arabic princess', 'arabicprincess', 'milakream', 'jamilakream',
  'slavebc', 'blonde_bc', 'blondebc',
  'alessa', 'bellegothddess',   'belledarkgod', 'belledarkgoddess', 'belledarkmistress',
  // Aug 9–10 2026 Google DMCA notices
  'finesse_ahhxxx', 'finesseahhxxx', 'vanessahh',
  'bbgumbitchh', 'bbgumbitch', 'feyaquinn', 'feyaquinnvip',
  'rosierendallx', 'rosierendallxo', 'itsrosierendallfree', 'itsrosierendall', 'rosierendall',
  // Aug 15–17 2026 Google DMCA notices
  'fallenthorns', 'zalconz', 'kaythorns', 'kay-thorns', 'kay thorns',
  'cherrykath18', 'cherrykath', 'cherryflavors', 'cherryflavor',
  'merisiel', 'merisiell', 'merisiel_irum', 'm3risiel', 'merisielirum',
  'marjo_sg', 'marjosg', 'marjo.sg', 'marjo-sg',
  'sassyandreaa', 'sassyandrea',
  // Aug 18–31 2026 Google DMCA notices
  'emilywyoming', 'emily wyoming', 'emily-wyoming',
  'jenflix01', 'jenflix', 'jen flix', 'cremedelajen', 'creme de la jen',
  'marilyn marie', 'marilynmarie', 'marilynmarie23', 'marilynmarievip',
  'emma rose', 'emmarose', 'gardenofemmarose', 'ohitsemmarose',
  'sabreezyy', 'sabreezy',
  'alana blaire', 'alanablaire', 'xoalana', 'alana naked news', 'alananakednews',
  'miss nerezza', 'missnerezza', 'missnerezzavip', 'goddessnerezza', 'nerezza',
  'praew phatcharin', 'praewasian', 'praew asian', 'asianparadiseee', 'asianparadiseee-official',
  'misueevee', 'misseevee', 'miss eevee', 'misu eevee', 'ev studios', 'evstudios',
  'puckbuddy', 'officialpuckbuddy', 'puckbuddyof', 'puckbuddyofficial', 'puckbuddyvip',
  'eviemayy', 'noteviemay', 'evie may',
  'jocibaker', 'joci baker', 'joci-baker',
  // Aug 16–20 2026 Google DMCA notices (batch 2)
  'swedish emma', 'swedishemma', 'missemmaswitch', 'swedish_emma2', 'swedish-emma2',
  'mandy sweet', 'mandy-sweet', 'mandysweet',
  'satiiellafree', 'satiellacosplay', 'satiiella', 'satiella',
  'cuporose', 'cuporoselive', 'red-hotz', 'redhotz',
  'mommycarter', 'mommycartertv', 'mommycarterxo', 'sugarplumsmilley',
  'berrydoll', 'berrydoll.vip', 'berrydollvip', 'loopy lovely', 'loopylovely',
  'lena polanski', 'lena-polanski', 'lenapolanski',
];

if (!MONGO_URI) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

function slugify(u) {
  return String(u || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getR2() {
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID) return null;
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

async function deleteR2Url(client, url) {
  const base = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
  if (!client || !url || !base || !String(url).startsWith(base)) return;
  const key = String(url).replace(`${base}/`, '');
  try {
    if (!DRY_RUN) {
      await client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME || 'erogramimages', Key: key }));
    }
  } catch (e) {
    console.warn('  R2 fail:', key, e.message);
  }
}

async function deleteR2Prefix(client, prefix) {
  if (!client) return;
  const bucket = process.env.R2_BUCKET_NAME || 'erogramimages';
  let token;
  do {
    const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }));
    for (const obj of res.Contents || []) {
      if (!DRY_RUN) {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }));
      }
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
}

async function main() {
  console.log(DRY_RUN ? '\n=== DRY RUN ===\n' : '\n=== ERADICATE DMCA CREATORS ===\n');
  await mongoose.connect(MONGO_URI);
  const col = mongoose.connection.db.collection('onlyfanscreators');
  const r2 = getR2();

  const usernames = [...new Set(TARGETS.map((t) => t.toLowerCase()))];
  const slugs = [...new Set(TARGETS.map(slugify).filter(Boolean))];

  const docs = await col.find({
    $or: [
      { username: { $in: usernames } },
      { slug: { $in: slugs } },
      ...usernames.map((u) => ({ username: new RegExp(`^${u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })),
      ...slugs.map((s) => ({ slug: new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })),
    ],
  }).toArray();

  // dedupe
  const byId = new Map();
  for (const d of docs) byId.set(String(d._id), d);
  const unique = [...byId.values()];

  console.log(`Found ${unique.length} profile(s) to eradicate:`);
  for (const d of unique) {
    console.log(`  - @${d.username} slug=${d.slug} likes=${d.likesCount || 0} id=${d._id}`);
  }

  let r2Deleted = 0;
  for (const d of unique) {
    const urls = [d.avatar, d.header, ...(d.extraPhotos || []), d.avatarThumbC50, d.avatarThumbC144].filter(Boolean);
    for (const url of urls) {
      await deleteR2Url(r2, url);
      r2Deleted++;
    }
    const base = slugify(d.slug || d.username);
    if (base) {
      await deleteR2Prefix(r2, `onlyfanssearch/${base}-onlyfans`);
      await deleteR2Prefix(r2, `onlyfanssearch/${base}`);
    }
  }

  const db = mongoose.connection.db;
  const ids = unique.map((d) => d._id);
  const slugSet = [...new Set(unique.flatMap((d) => [d.slug, d.username, slugify(d.username)].filter(Boolean)))];
  const usernameRx = usernames.map((u) => new RegExp(`^${u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));

  if (!DRY_RUN && unique.length) {
    const reviews = await db.collection('creatorreviews').deleteMany({
      creatorSlug: { $in: [...slugSet, ...slugs] },
    });
    console.log(`CreatorReview deleted: ${reviews.deletedCount}`);

    const users = await db.collection('users').updateMany(
      { savedCreators: { $in: ids } },
      { $pull: { savedCreators: { $in: ids } } },
    );
    console.log(`Users savedCreators cleaned: ${users.modifiedCount}`);

    const trending = await db.collection('trendingofcreators').find({ username: { $in: usernameRx } }).toArray();
    const trendIds = trending.map((t) => t._id);
    if (trendIds.length) {
      await db.collection('trendingclickdailies').deleteMany({ creatorId: { $in: trendIds } });
      const tr = await db.collection('trendingofcreators').deleteMany({ _id: { $in: trendIds } });
      console.log(`TrendingOFCreator deleted: ${tr.deletedCount}`);
    }

    const camp = await db.collection('campaigns').deleteMany({
      $or: [
        { ofUsername: { $in: usernameRx } },
        ...usernames.map((u) => ({ destinationUrl: new RegExp(u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })),
      ],
    });
    console.log(`Campaigns deleted: ${camp.deletedCount}`);

    const res = await col.deleteMany({ _id: { $in: ids } });
    console.log(`\nDeleted ${res.deletedCount} OnlyFansCreator documents.`);
  }

  const leftoverNames = [
    'fallenthorns', 'zalconz', 'kaythorns', 'kay-thorns', 'kay thorns',
    'cherrykath18', 'cherrykath', 'cherryflavors', 'cherryflavor',
    'merisiel', 'merisiell', 'merisiel_irum', 'm3risiel', 'merisielirum',
    'marjo_sg', 'marjosg', 'marjo.sg', 'marjo-sg',
    'sassyandreaa', 'sassyandrea',
    'emilywyoming', 'jenflix01', 'jenflix', 'cremedelajen',
    'marilynmarie', 'marilynmarie23', 'marilynmarievip',
    'ohitsemmarose', 'gardenofemmarose', 'emmarose',
    'sabreezyy', 'sabreezy', 'xoalana', 'alanablaire',
    'missnerezza', 'missnerezzavip', 'goddessnerezza', 'nerezza',
    'praewasian', 'asianparadiseee', 'asianparadiseee-official',
    'misueevee', 'misseevee',
    'puckbuddy', 'puckbuddyvip', 'officialpuckbuddy', 'puckbuddyof', 'puckbuddyofficial',
    'eviemayy', 'noteviemay', 'jocibaker', 'joci-baker',
    'missemmaswitch', 'swedish_emma2', 'swedishemma',
    'mandy-sweet', 'mandysweet',
    'satiiellafree', 'satiellacosplay', 'satiiella',
    'cuporose', 'cuporoselive', 'red-hotz', 'redhotz',
    'mommycarter', 'mommycartertv', 'mommycarterxo', 'sugarplumsmilley',
    'berrydoll', 'berrydollvip', 'loopylovely',
    'lena-polanski', 'lenapolanski',
  ];
  const leftoverRx = leftoverNames.map((u) => new RegExp(u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  if (!DRY_RUN) {
    const likes = await db.collection('profilefeedlikes').deleteMany({
      $or: leftoverRx.flatMap((rx) => [{ mediaKey: rx }, { creatorUsername: rx }]),
    });
    console.log(`ProfileFeedLikes deleted: ${likes.deletedCount}`);
    const queries = await db.collection('searchqueries').deleteMany({
      $or: leftoverRx.flatMap((rx) => [{ query: rx }, { queryNormalized: rx }]),
    });
    console.log(`SearchQueries deleted: ${queries.deletedCount}`);
    for (const s of leftoverNames.map(slugify).filter(Boolean)) {
      await deleteR2Prefix(r2, `onlyfanssearch/${s}`);
      await deleteR2Prefix(r2, `onlyfanssearch/${s}-onlyfans`);
    }

    // Telegram group claimed via asianparadiseee-official
    const groupSlugs = ['asianparadiseee-official', 'asianparadiseee', 'jocibaker-onlyfans', 'jocibaker'];
    const groups = await db.collection('groups').find({ slug: { $in: groupSlugs } }).toArray();
    for (const g of groups) {
      console.log(`Group wipe: ${g.slug} image=${g.image || 'none'}`);
      if (g.image) await deleteR2Url(r2, g.image);
      await deleteR2Prefix(r2, `uploads/${g.slug}`);
    }
    if (groups.length) {
      const gdel = await db.collection('groups').deleteMany({ _id: { $in: groups.map((g) => g._id) } });
      console.log(`Groups deleted: ${gdel.deletedCount}`);
    } else {
      console.log('Groups deleted: 0');
    }
  } else {
    console.log(`\nWould delete ${unique.length} Mongo documents + related reviews/saves/trending/campaigns + asianparadiseee group.`);
  }

  console.log(`R2 object delete attempts: ${r2Deleted}${DRY_RUN ? ' (dry)' : ''}`);

  // verify
  const left = await col.countDocuments({
    $or: [
      { username: { $in: usernames } },
      { slug: { $in: slugs } },
    ],
  });
  console.log(`Remaining matches in DB: ${left}`);

  await mongoose.disconnect();
  console.log(DRY_RUN ? '\nDry run done.\n' : '\nDone. Blacklist is in code — they cannot be re-scraped.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
