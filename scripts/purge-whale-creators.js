/* eslint-disable */
/**
 * Hard-delete OnlyFans creators with likesCount >= 180K, except promoted/clients.
 * Keep = TrendingOFCreator usernames + Campaign adType onlyfans-creator ofUsername.
 *
 * Usage:
 *   node scripts/purge-whale-creators.js --dry-run
 *   node scripts/purge-whale-creators.js
 */
const mongoose = require('mongoose');
const { S3Client, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;
const MIN_LIKES = 180_000;
const DRY_RUN = process.argv.includes('--dry-run');

if (!MONGO_URI) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

function norm(u) {
  return String(u || '').trim().toLowerCase();
}

function slugKey(slug, username) {
  return String(slug || username || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
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
  if (!client || !url || !base || !url.startsWith(base)) return;
  const key = url.replace(`${base}/`, '');
  try {
    if (!DRY_RUN) {
      await client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME || 'erogramimages', Key: key }));
    }
    // quiet per-key logging — 2K+ creators
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
      // quiet per-key logging
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
}

async function buildAllowlist(db) {
  const allow = new Set();

  const trending = await db.collection('trendingofcreators').find({}).project({ username: 1 }).toArray();
  for (const t of trending) {
    const u = norm(t.username);
    if (u) allow.add(u);
  }

  const campaigns = await db.collection('campaigns').find({
    adType: 'onlyfans-creator',
    ofUsername: { $exists: true, $ne: '' },
  }).project({ ofUsername: 1 }).toArray();
  for (const c of campaigns) {
    const u = norm(c.ofUsername);
    if (u) allow.add(u);
  }

  return allow;
}

async function main() {
  console.log(DRY_RUN ? '\n=== DRY RUN (no writes) ===\n' : '\n=== PURGE WHALES (likes >= 180K) ===\n');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const r2 = getR2();

  const allow = await buildAllowlist(db);
  console.log(`Allowlist: ${allow.size} usernames (TrendingOFCreator + onlyfans-creator campaigns)`);

  const creatorsCol = db.collection('onlyfanscreators');
  const allHigh = await creatorsCol.find({ likesCount: { $gte: MIN_LIKES } }).toArray();

  const toPurge = allHigh.filter((c) => !allow.has(norm(c.username)));
  const toKeep = allHigh.filter((c) => allow.has(norm(c.username)));

  console.log(`180K+ total: ${allHigh.length}`);
  console.log(`KEEP: ${toKeep.length}`, toKeep.map((c) => `@${c.username} (${c.likesCount})`).join(', ') || '(none)');
  console.log(`PURGE: ${toPurge.length}`);

  if (!toPurge.length) {
    console.log('Nothing to purge.');
    await mongoose.disconnect();
    return;
  }

  const creatorIds = [];
  const usernames = new Set();
  const slugs = new Set();

  for (let i = 0; i < toPurge.length; i++) {
    const c = toPurge[i];
    creatorIds.push(c._id);
    usernames.add(norm(c.username));
    slugs.add(c.slug);
    slugs.add(c.username);
    if (i < 5 || i === toPurge.length - 1 || (i + 1) % 200 === 0) {
      console.log(`→ [${i + 1}/${toPurge.length}] @${c.username} — ${c.likesCount} likes`);
    }
    if (!DRY_RUN) {
      for (const url of [c.avatar, c.header, ...(c.extraPhotos || [])]) {
        if (url) await deleteR2Url(r2, url);
      }
    }
  }

  const slugList = [...slugs].filter(Boolean);
  const usernameList = [...usernames].filter(Boolean);

  if (!DRY_RUN) {
    const rev = await db.collection('creatorreviews').deleteMany({
      $or: [
        { creatorSlug: { $in: slugList } },
        ...slugList.map((s) => ({ creatorSlug: new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })),
      ],
    });
    console.log(`\nCreatorReview deleted: ${rev.deletedCount}`);

    const users = await db.collection('users').updateMany(
      { savedCreators: { $in: creatorIds } },
      { $pull: { savedCreators: { $in: creatorIds } } },
    );
    console.log(`Users savedCreators cleaned: ${users.modifiedCount}`);

    const hard = await creatorsCol.deleteMany({ _id: { $in: creatorIds } });
    console.log(`OnlyFansCreator hard-deleted: ${hard.deletedCount}`);

    const te = await db.collection('trendingerograms').deleteMany({
      $or: [
        { username: { $in: usernameList } },
        { slug: { $in: slugList } },
        ...usernameList.map((u) => ({ username: new RegExp(`^${u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })),
      ],
    });
    console.log(`TrendingErogram entries removed: ${te.deletedCount}`);

    const sq = await db.collection('searchqueries').deleteMany({
      queryNormalized: { $in: usernameList },
    });
    console.log(`SearchQuery cache cleared: ${sq.deletedCount}`);
  } else {
    console.log('\n[dry-run] Would hard-delete', creatorIds.length, 'OnlyFansCreator docs');
    console.log('[dry-run] Would clean CreatorReview, savedCreators, TrendingErogram, SearchQuery');
  }

  console.log('\nDone.');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
