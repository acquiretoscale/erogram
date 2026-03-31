/**
 * Standalone scrape script: 20 French female OnlyFans creators via datawizards actor.
 * Usage: node scripts/scrape-france.js
 *
 * - Reads Apify key from OFM Settings in MongoDB
 * - Calls datawizards actor with search_queries: ['france onlyfans']
 * - Parses results, filters females only, skips existing creators
 * - Saves to OnlyFansCreator with categories: ['france']
 * - Downloads + optimizes images → R2
 */

const mongoose = require('mongoose');
const sharp = require('sharp');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'erogramimages';
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

const MAX_CREATORS = 20;
const CATEGORY = 'france';

const BLOCK_KEYWORDS = [
  'gay', 'male model', 'boy/boy', 'guy/guy', 'm4m', 'men only',
  'trans', 'trans girl', 'transgirl', 'tgirl', 't-girl', 'transgender',
  'shemale', 'she-male', 'tranny', 'ladyboy', 'lady boy',
  'femboy', 'fem boy', 'femboi', 'sissy', 'twink', 'bear',
  'crossdress', 'crossdresser', 'ftm', 'f2m', 'mtf', 'm2f',
  'nonbinary', 'non-binary', 'boyfriend', 'husband',
  'cock', 'dick', 'bbc', 'bwc', 'hung',
  'gay porn', 'gay for pay', 'man on man', 'guy on guy',
];

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

function containsBlocked(bio, name, username) {
  const combined = `${bio} ${name} ${username}`.toLowerCase();
  return BLOCK_KEYWORDS.some(k => combined.includes(k));
}

function parseDatawizardsItem(item) {
  const username = item.username || '';
  if (!username) return null;

  const name = item.name || username;
  const bio = item.about || '';
  const subPrice = typeof item.subscribePrice === 'number' ? item.subscribePrice : parseFloat(String(item.subscribePrice || '0')) || 0;

  if (containsBlocked(bio, name, username)) return null;

  return {
    name,
    username,
    slug: username.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
    avatar: item.avatar || '',
    avatarThumbC50: item.avatarThumbs?.c50 || '',
    avatarThumbC144: item.avatarThumbs?.c144 || '',
    header: item.header || '',
    bio: (bio || '').slice(0, 500),
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
    url: `https://onlyfans.com/${username}`,
    gender: 'female',
    lastSeen: item.lastSeen || '',
    location: item.location || '',
    website: item.website || '',
    joinDate: item.joinDate || '',
    onlyfansId: item.id || 0,
    hasStories: item.hasStories || false,
    hasStream: item.hasStream || false,
    tipsEnabled: item.tipsEnabled || false,
    tipsMin: item.tipsMin || 0,
    tipsMax: item.tipsMax || 0,
    finishedStreamsCount: item.finishedStreamsCount || 0,
  };
}

async function downloadImage(url) {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return null;
    return Buffer.from(await resp.arrayBuffer());
  } catch {
    return null;
  }
}

async function optimizeAndUpload(buf, key) {
  const optimized = await sharp(buf)
    .jpeg({ quality: 95, mozjpeg: true })
    .withMetadata({
      exif: {
        IFD0: {
          Copyright: '© Erogram.pro',
          Artist: 'Erogram.pro',
          ImageDescription: 'Erogram.pro - OnlyFans Creator Directory',
        },
      },
    })
    .toBuffer();

  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: optimized,
    ContentType: 'image/jpeg',
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return `${R2_PUBLIC_URL}/${key}`;
}

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  // Get Apify credentials from OFM Settings
  const settings = await db.collection('ofmsettings').findOne({ key: 'default' });
  if (!settings) throw new Error('No OFM settings found');

  const activeKeys = (settings.apifyKeys || []).filter(k => k.active && !k.burned);
  if (activeKeys.length === 0) throw new Error('No active Apify keys');

  const apiKey = activeKeys[0].apiKey;
  const actor = settings.apifyActor || 'datawizards/onlyfans-scraper';
  const actorId = actor.replace('/', '~');

  console.log(`Using actor: ${actor} (key ...${apiKey.slice(-4)})`);
  console.log(`Scraping: "${CATEGORY} onlyfans" — max ${MAX_CREATORS} female creators\n`);

  // Get existing slugs to skip duplicates
  const existing = await db.collection('onlyfanscreators')
    .find({ categories: CATEGORY })
    .project({ slug: 1 })
    .toArray();
  const existingSlugs = new Set(existing.map(c => c.slug));
  console.log(`Already have ${existingSlugs.size} creators with category "${CATEGORY}"\n`);

  // Start Apify run
  console.log('Starting Apify run...');
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ search_queries: [
        'nacrevictoire', 'mathildtantot', 'esmabraddy',
        'lizadelsierra', 'lunaokko', 'avaaddams', 'melicious_treats',
        'juliia_lynn', 'misskreol', 'claramoorgane',
      ] }),
    },
  );

  if (!runRes.ok) {
    const err = await runRes.text();
    throw new Error(`Apify failed to start: ${runRes.status} ${err}`);
  }

  const runData = await runRes.json();
  const runId = runData.data?.id;
  if (!runId) throw new Error('No run ID returned');
  console.log(`Run started: ${runId}`);

  // Poll until done
  let status = runData.data?.status;
  const maxWait = 3 * 60 * 1000;
  const start = Date.now();

  while (!['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
    if (Date.now() - start > maxWait) throw new Error('Apify run timed out');
    process.stdout.write('.');
    await new Promise(r => setTimeout(r, 5000));
    const poll = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`);
    status = (await poll.json()).data?.status;
  }
  console.log(`\nRun finished: ${status}`);

  if (status !== 'SUCCEEDED') throw new Error(`Run ${status}`);

  // Fetch results
  const dsRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}&limit=100`,
  );
  const items = await dsRes.json();
  console.log(`Got ${items.length} raw items from Apify\n`);

  // Parse + filter + save
  let saved = 0;
  let skipped = 0;
  const savedSlugs = [];

  for (const item of items) {
    if (saved >= MAX_CREATORS) break;

    const parsed = parseDatawizardsItem(item);
    if (!parsed) { skipped++; continue; }
    if (existingSlugs.has(parsed.slug)) { skipped++; continue; }

    try {
      await db.collection('onlyfanscreators').updateOne(
        { slug: parsed.slug },
        {
          $set: {
            ...parsed,
            scrapedAt: new Date(),
          },
          $addToSet: { categories: CATEGORY },
        },
        { upsert: true },
      );
      savedSlugs.push(parsed.slug);
      existingSlugs.add(parsed.slug);
      saved++;
      console.log(`  [${saved}/${MAX_CREATORS}] Saved: ${parsed.name} (@${parsed.username})`);
    } catch (e) {
      if (e.code !== 11000) console.error(`  Failed ${parsed.username}:`, e.message);
    }
  }

  console.log(`\nSaved ${saved} new creators, skipped ${skipped}\n`);

  // Process images — download from OF CDN → optimize → R2
  console.log('Processing images...');
  let imagesOk = 0;
  let imagesFailed = 0;

  for (const slug of savedSlugs) {
    const creator = await db.collection('onlyfanscreators').findOne({ slug });
    if (!creator) continue;

    const updates = {};

    // Avatar
    if (creator.avatar && !creator.avatar.includes(R2_PUBLIC_URL)) {
      const buf = await downloadImage(creator.avatar);
      if (buf) {
        try {
          const r2Url = await optimizeAndUpload(buf, `onlyfanssearch/${slug}-onlyfans.jpg`);
          updates.avatar = r2Url;
        } catch (e) {
          console.log(`  [FAIL] ${slug} avatar: ${e.message}`);
          imagesFailed++;
        }
      }
    }

    // Header
    if (creator.header && !creator.header.includes(R2_PUBLIC_URL)) {
      const buf = await downloadImage(creator.header);
      if (buf) {
        try {
          const r2Url = await optimizeAndUpload(buf, `onlyfanssearch/${slug}-onlyfans2.jpg`);
          updates.header = r2Url;
        } catch (e) {
          console.log(`  [FAIL] ${slug} header: ${e.message}`);
          imagesFailed++;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      await db.collection('onlyfanscreators').updateOne({ slug }, { $set: updates });
      imagesOk++;
      console.log(`  [IMG] ${slug}: ${Object.keys(updates).join(' + ')}`);
    }
  }

  console.log(`\nImages: ${imagesOk} processed, ${imagesFailed} failed`);
  console.log(`\nDone! Visit /best-onlyfans-accounts/france to see them.`);
  console.log('Individual pages: /{slug} for each creator.\n');

  await mongoose.disconnect();
}

main().catch(e => {
  console.error('\nFATAL:', e.message);
  process.exit(1);
});
