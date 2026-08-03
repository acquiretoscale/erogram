/**
 * Import Ecuadorian OnlyFans creators by username (DataWizards — same as /ofm import).
 * Usage: node --env-file=.env.local scripts/scrape-ecuadorian.mjs
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const CATEGORY = 'ecuadorian';
const ACTOR = 'hello.datawizards/onlyfans-scraper';
const TARGET = 10;

// Public usernames from Ecuador OF directories (skip ones already in DB)
const CANDIDATES = [
  'jenniponce',
  'angelinanpinelaa',
  'alejandraquiroz.oficial',
  'carolinaromoof',
  'rudo.ec',
  'priselener',
  'andrea.torres',
  'adrianajimenez19',
  'ivetesayonarais',
  'jesiquirola',
  'aleyasalazar',
  'tamiriveraj',
  'angelicacevallosp',
  'steffyquirozec',
  'mayitaarizaga',
  'karlarugel',
  'nalgonasex',
  'ladysedux',
];

function slugify(username) {
  return username.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  const connectDB = (await import('../lib/db/mongodb.js')).default;
  const { processCreatorImages } = await import('../lib/actions/creatorImages.js');
  const { OnlyFansCreator, ScrapeRun } = await import('../lib/models/index.js');

  await connectDB();
  const db = mongoose.connection.db;
  const settings = await db.collection('ofmsettings').findOne({ key: 'default' });
  const apiKey = (settings?.apifyKeys || []).find((k) => k.active && !k.burned)?.apiKey || process.env.APIFY_API_TOKEN;
  if (!apiKey) throw new Error('No Apify key');

  // Ensure existing 3 count on page
  for (const u of ['laadynovoa', 'camilevalencia', 'samanthacardenas']) {
    await OnlyFansCreator.updateOne(
      { username: u },
      { $addToSet: { categories: CATEGORY }, $set: { location: 'Ecuador' } },
    );
  }

  const existing = await OnlyFansCreator.find({
    categories: CATEGORY,
    deleted: { $ne: true },
    avatar: { $regex: process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '.', $options: 'i' },
  }).countDocuments();

  console.log(`Already ${existing} on page pool. Need ${Math.max(0, TARGET - existing)} more.\n`);

  const toFetch = [];
  for (const u of CANDIDATES) {
    const slug = slugify(u);
    const doc = await OnlyFansCreator.findOne({ $or: [{ username: u }, { slug }], deleted: { $ne: true } }).lean();
    if (doc?.avatar?.includes(process.env.R2_PUBLIC_URL || 'r2.dev')) {
      await OnlyFansCreator.updateOne({ _id: doc._id }, { $addToSet: { categories: CATEGORY }, $set: { location: 'Ecuador' } });
      continue;
    }
    toFetch.push(u);
    if (toFetch.length >= 15) break;
  }

  console.log(`Importing ${toFetch.length} usernames via ${ACTOR}...\n`);

  const actorId = ACTOR.replace('/', '~');
  let saved = 0;
  const savedSlugs = [];

  for (const username of toFetch) {
    if (saved >= TARGET - existing) break;

    const runRes = await fetch(`https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ search_queries: [username] }),
    });

    if (!runRes.ok) {
      console.log(`  FAIL start @${username}: ${(await runRes.text()).slice(0, 120)}`);
      continue;
    }

    const items = await runRes.json();
    if (!Array.isArray(items) || !items.length) {
      console.log(`  EMPTY @${username}`);
      continue;
    }

    const exact = items.find((i) => (i.username || '').toLowerCase() === username.toLowerCase()) || items[0];
    if (!exact?.username) continue;

    const u = exact.username;
    const slug = slugify(u);
    const subPrice = typeof exact.subscribePrice === 'number' ? exact.subscribePrice : parseFloat(String(exact.subscribePrice || '0')) || 0;
    const bio = (exact.about || '').slice(0, 500);
    let location = exact.location || '';
    if (!/ecuador/i.test(location)) location = location ? `${location}, Ecuador` : 'Ecuador';

    await OnlyFansCreator.findOneAndUpdate(
      { slug },
      {
        $set: {
          name: exact.name || u,
          username: u,
          slug,
          avatar: exact.avatar || '',
          header: exact.header || '',
          bio,
          likesCount: exact.favoritedCount || 0,
          photosCount: exact.photosCount || 0,
          videosCount: exact.videosCount || 0,
          mediaCount: exact.mediasCount || 0,
          price: subPrice,
          isFree: subPrice === 0,
          isVerified: exact.isVerified || false,
          gender: 'female',
          url: `https://onlyfans.com/${u}`,
          location,
          scrapedAt: new Date(),
        },
        $addToSet: { categories: CATEGORY },
      },
      { upsert: true, strict: false },
    );

    try {
      await processCreatorImages(slug);
    } catch (e) {
      console.log(`  img fail ${slug}: ${e.message}`);
    }

    saved++;
    savedSlugs.push(slug);
    console.log(`  [${saved}] @${u} (${exact.name || u})`);
  }

  await ScrapeRun.create({
    source: 'bulk',
    query: CATEGORY,
    actorId: ACTOR,
    status: 'succeeded',
    maxItems: TARGET,
    totalItems: toFetch.length,
    saved,
    skipped: toFetch.length - saved,
    startedAt: new Date(),
    completedAt: new Date(),
  });

  const pool = await OnlyFansCreator.countDocuments({
    deleted: { $ne: true },
    gender: 'female',
    $or: [
      { categories: CATEGORY },
      { bio: /ecuador/i },
      { location: /ecuador/i },
    ],
    avatar: { $regex: process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '.', $options: 'i' },
  });

  console.log(`\nImported ${saved}. Pool now ~${pool} ecuador-match creators with R2 avatars.`);
  console.log('http://127.0.0.1:3939/onlyfanssearch/top-10-ecuadorian-onlyfans-models\n');
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
