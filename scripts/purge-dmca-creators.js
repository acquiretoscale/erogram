/* eslint-disable */
/**
 * Hard-delete all DMCA-complained creators + related groups/campaigns/R2 assets.
 * Usage: node scripts/purge-dmca-creators.js
 */
const mongoose = require('mongoose');
const { S3Client, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

// All usernames from Google copyright emails (DB + claimed stage names)
const USERNAMES = [
  'francety', 'ashleyyyreyyy', 'gem101', 'stellabrooks', 'babydollll',
  'amibuefree', 'amibuexo', 'amibue', 'amibuexx',
  'pennylondon', 'pennylondon_x', 'melthewhale', 'whaleymel',
  'thevivonline', 'helloviv', 'vivianwest',
  'luciddreamexe', 'dzesi_ikita', 'ericadream',
  'lu2hot', 'thelu2hot', 'emmaswrld',
  'your_fatale', 'bambi_baby', 'yeah_bamby',
  'bellajynx.free', 'bellajynx', 'bellajynxxx', 'pixiecat',
  'kassqueen98', 'pussiesncream_', 'ddd_queen',
  'charlotte_rachel', 'charlotterachel',
  'natashatosini', 'bellebrooksxo', 'bellebrooks', 'lioqueen',
  'nataliasalasvv', 'nataliasalasv', 'lioqueenn',
  'jocycosplay', 'jocy_cosplay', 'jocy-cosplay', 'murkyteam62',
];

const GROUP_SLUGS = [
  'jocy-cosplay',
  'francety-onlyfans-telegram',
  'gem101-onlyfans-telegram',
  'bellebrooksxo-onlyfans',
  'lioqueen-onlyfans',
  'ashleyyyreyyy-onlyfans-telegram',
  'stellabrooks-onlyfans',
  'babydollll-onlyfans',
  'lu2hot-onlyfans',
];

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  if (!client || !url || !base || !url.startsWith(base)) return;
  const key = url.replace(`${base}/`, '');
  try {
    await client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME || 'erogramimages', Key: key }));
    console.log('  R2 deleted:', key);
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
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }));
      console.log('  R2 deleted:', obj.Key);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const r2 = getR2();
  const R2_BASE = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

  const usernameRx = USERNAMES.map((u) => new RegExp(`^${escRe(u.replace(/\./g, '\\.'))}$`, 'i'));
  const slugPatterns = USERNAMES.flatMap((u) => [
    u.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
    `${u.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}-onlyfans`,
  ]).filter(Boolean);

  const creatorsCol = db.collection('onlyfanscreators');
  const creators = await creatorsCol.find({
    $or: [
      { username: { $in: usernameRx } },
      ...usernameRx.map((rx) => ({ username: rx })),
      { slug: { $in: [...new Set(slugPatterns), ...GROUP_SLUGS] } },
      ...USERNAMES.map((u) => ({ slug: new RegExp(escRe(u.replace(/[^a-z0-9]/gi, '-')), 'i') })),
    ],
  }).toArray();

  console.log(`\nFound ${creators.length} OnlyFansCreator docs to purge`);
  const creatorIds = [];
  const slugs = new Set();

  for (const c of creators) {
    creatorIds.push(c._id);
    slugs.add(c.slug);
    slugs.add(c.username);
    console.log(`\n→ @${c.username} (${c.slug})`);
    for (const url of [c.avatar, c.header, ...(c.extraPhotos || [])]) {
      if (url) await deleteR2Url(r2, url);
    }
    const slugKey = (c.slug || c.username || '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (slugKey) await deleteR2Prefix(r2, `onlyfanssearch/${slugKey}`);
  }

  if (creatorIds.length) {
    const rev = await db.collection('creatorreviews').deleteMany({
      $or: [
        { creatorSlug: { $in: [...slugs] } },
        ...[...slugs].map((s) => ({ creatorSlug: new RegExp(escRe(s), 'i') })),
      ],
    });
    console.log(`\nCreatorReview deleted: ${rev.deletedCount}`);

    await db.collection('users').updateMany(
      { savedCreators: { $in: creatorIds } },
      { $pull: { savedCreators: { $in: creatorIds } } },
    );

    const hard = await creatorsCol.deleteMany({ _id: { $in: creatorIds } });
    console.log(`OnlyFansCreator hard-deleted: ${hard.deletedCount}`);
  }

  // Trending rail + click logs
  const trendRx = USERNAMES.map((u) => new RegExp(`^${escRe(u)}$`, 'i'));
  const trending = await db.collection('trendingofcreators').find({ username: { $in: trendRx } }).toArray();
  const trendIds = trending.map((t) => t._id);
  if (trendIds.length) {
    await db.collection('trendingclickdailies').deleteMany({ creatorId: { $in: trendIds } });
    const tr = await db.collection('trendingofcreators').deleteMany({ _id: { $in: trendIds } });
    console.log(`TrendingOFCreator deleted: ${tr.deletedCount}`);
  }

  // Campaigns
  const camp = await db.collection('campaigns').deleteMany({
    $or: [
      { ofUsername: { $in: trendRx } },
      ...USERNAMES.map((u) => ({ ofUsername: new RegExp(`^${escRe(u)}$`, 'i') })),
      { destinationUrl: { $regex: USERNAMES.map(escRe).join('|'), $options: 'i' } },
    ],
  });
  console.log(`Campaigns deleted: ${camp.deletedCount}`);

  // Telegram / join groups
  const groupOr = [
    { slug: { $in: GROUP_SLUGS } },
    ...USERNAMES.map((u) => ({ slug: new RegExp(escRe(u), 'i') })),
    ...USERNAMES.map((u) => ({ linkedCreatorSlug: new RegExp(escRe(u), 'i') })),
    ...USERNAMES.map((u) => ({ name: new RegExp(escRe(u), 'i') })),
  ];
  const groups = await db.collection('groups').find({ $or: groupOr }).toArray();
  const groupIds = groups.map((g) => g._id);
  console.log(`\nFound ${groups.length} groups to purge`);
  for (const g of groups) {
    console.log(`  group: ${g.slug} (${g.name})`);
    if (g.image && g.image.startsWith(R2_BASE)) await deleteR2Url(r2, g.image);
  }
  if (groupIds.length) {
    await db.collection('bestgrouppicks').deleteMany({ group: { $in: groupIds } });
    const gr = await db.collection('groups').deleteMany({ _id: { $in: groupIds } });
    console.log(`Groups hard-deleted: ${gr.deletedCount}`);
  }

  // Any remaining docs mentioning these usernames in search queries cache
  const sq = await db.collection('searchqueries').deleteMany({
    queryNormalized: { $in: USERNAMES.map((u) => u.toLowerCase()) },
  });
  console.log(`SearchQuery cache cleared: ${sq.deletedCount}`);

  console.log('\nDone.');
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
