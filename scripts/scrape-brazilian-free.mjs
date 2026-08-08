/**
 * Import Brazilian free OnlyFans creators from fans-brasil.com listing.
 * Usage: node --env-file=.env.local scripts/scrape-brazilian-free.mjs
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const CATEGORY = 'brazilian';
const ACTOR = 'hello.datawizards/onlyfans-scraper';

// Scraped from https://fans-brasil.com/contas-brasileiras-gratuitas-no-onlyfans/ (pages 1-3)
const CANDIDATES = [
  'auroraw',
  'babychanel',
  'beatrizdellarosa',
  'carlabrasil2020',
  'cmiiu',
  'cutiepiiechubby',
  'danielapimenta',
  'dreadhot',
  'emilyrose42.pvt',
  'evilenaa',
  'firetale',
  'garotahorny',
  'guinny',
  'hannaduntra',
  'itsgracecharisxo',
  'lorehard',
  'louisesqueeen1',
  'malelly',
  'mandy-sweet',
  'marialuna18',
  'melinalox',
  'olivia-wolf',
  'only_nara',
  'prii_feet',
  'sabrinaelis',
  'sttaringartx',
  'vanessa.cherry18',
  'vedolifts',
  'yourkittypeach',
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

  const actorId = ACTOR.replace('/', '~');
  let saved = 0;
  let skipped = 0;
  const savedSlugs = [];

  console.log(`Importing ${CANDIDATES.length} Brazilian free creators via ${ACTOR}...\n`);

  for (const username of CANDIDATES) {
    const slug = slugify(username);
    const existing = await OnlyFansCreator.findOne({
      $or: [{ username }, { slug }],
      deleted: { $ne: true },
    }).lean();

    if (existing?.avatar?.includes(process.env.R2_PUBLIC_URL || 'r2.dev')) {
      await OnlyFansCreator.updateOne(
        { _id: existing._id },
        {
          $addToSet: { categories: { $each: [CATEGORY, 'free'] } },
          $set: { location: existing.location || 'Brazil', isFree: existing.isFree ?? true },
        },
      );
      console.log(`  SKIP (R2 ok) @${username}`);
      skipped++;
      continue;
    }

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
    const uSlug = slugify(u);
    const subPrice = typeof exact.subscribePrice === 'number' ? exact.subscribePrice : parseFloat(String(exact.subscribePrice || '0')) || 0;
    const bio = (exact.about || '').slice(0, 500);
    let location = exact.location || '';
    if (!/brazil|brasil/i.test(location)) location = location ? `${location}, Brazil` : 'Brazil';

    await OnlyFansCreator.findOneAndUpdate(
      { slug: uSlug },
      {
        $set: {
          name: exact.name || u,
          username: u,
          slug: uSlug,
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
        $addToSet: { categories: { $each: [CATEGORY, 'free'] } },
      },
      { upsert: true, strict: false },
    );

    try {
      await processCreatorImages(uSlug);
    } catch (e) {
      console.log(`  img fail ${uSlug}: ${e.message}`);
    }

    saved++;
    savedSlugs.push(uSlug);
    console.log(`  [${saved}] @${u} (${exact.name || u}) free=${subPrice === 0}`);
  }

  await ScrapeRun.create({
    source: 'bulk',
    query: 'brazilian-free-fans-brasil',
    actorId: ACTOR,
    status: 'succeeded',
    maxItems: CANDIDATES.length,
    totalItems: CANDIDATES.length,
    saved,
    skipped,
    startedAt: new Date(),
    completedAt: new Date(),
  });

  console.log(`\nDone: ${saved} imported, ${skipped} already had R2.`);
  console.log('Profiles:');
  for (const s of savedSlugs) {
    console.log(`  http://127.0.0.1:3939/onlyfanssearch/${s}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
