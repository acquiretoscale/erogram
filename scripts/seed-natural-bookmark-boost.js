/* eslint-disable */
/**
 * Boost creators with 3+ natural bookmarks to 16-27 total (seed users fill the gap).
 * Higher natural count -> higher target in range.
 *
 *   node scripts/seed-natural-bookmark-boost.js --dry-run
 *   node scripts/seed-natural-bookmark-boost.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const DRY_RUN = process.argv.includes('--dry-run');
const SEED_PASSWORD = 'seeduser123';

function hashSlug(slug) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (Math.imul(31, h) + slug.charCodeAt(i)) >>> 0;
  return h;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function targetFromNatural(natural, minN, maxN, slug) {
  const span = maxN > minN ? (natural - minN) / (maxN - minN) : 0.5;
  const base = 16 + Math.round(span * 11);
  const jitter = (hashSlug(slug) % 3) - 1;
  return clamp(base + jitter, 16, 27);
}

function pickSeedUsers(seedUsers, slug, count, alreadySavedUserIds) {
  const saved = new Set(alreadySavedUserIds.map(String));
  const available = seedUsers.filter((u) => !saved.has(String(u._id)));
  const shuffled = [...available].sort((a, b) => {
    const ah = hashSlug(slug + a._id.toString());
    const bh = hashSlug(slug + b._id.toString());
    return ah - bh;
  });
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

async function main() {
  console.log(DRY_RUN ? '\n=== DRY RUN ===\n' : '\n=== SEED NATURAL BOOKMARK BOOST ===\n');
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const usersCol = db.collection('users');
  const creatorsCol = db.collection('onlyfanscreators');

  const allUsers = await usersCol
    .find({ password: { $exists: true, $ne: '' } })
    .project({ _id: 1, username: 1, password: 1, savedCreators: 1 })
    .toArray();

  const seedUsers = [];
  const seedIds = new Set();
  for (const u of allUsers) {
    if (await bcrypt.compare(SEED_PASSWORD, u.password)) {
      seedUsers.push(u);
      seedIds.add(String(u._id));
    }
  }
  console.log(`Seed users: ${seedUsers.length}`);

  const creators = await creatorsCol
    .find({
      deleted: { $ne: true },
      avatar: { $ne: '' },
      gender: 'female',
      categories: { $exists: true, $ne: [] },
      submissionStatus: { $ne: 'pending' },
    })
    .sort({ createdAt: -1 })
    .limit(120)
    .project({ username: 1, slug: 1 })
    .toArray();

  const creatorIds = creators.map((c) => c._id);
  const savers = await usersCol
    .find({ savedCreators: { $in: creatorIds } })
    .project({ _id: 1, savedCreators: 1 })
    .toArray();

  const stats = new Map();
  for (const c of creators) {
    stats.set(String(c._id), { creator: c, natural: 0, total: 0, saverIds: [] });
  }
  for (const u of savers) {
    for (const cid of u.savedCreators || []) {
      const key = String(cid);
      const row = stats.get(key);
      if (!row) continue;
      row.total++;
      row.saverIds.push(u._id);
      if (!seedIds.has(String(u._id))) row.natural++;
    }
  }

  const eligible = [...stats.values()].filter((r) => r.natural > 2);
  if (eligible.length === 0) {
    console.log('No creators with 3+ natural bookmarks.');
    await mongoose.disconnect();
    return;
  }

  const naturals = eligible.map((r) => r.natural);
  const minN = Math.min(...naturals);
  const maxN = Math.max(...naturals);
  console.log(`Eligible: ${eligible.length} (natural ${minN}-${maxN})\n`);

  let totalAdds = 0;
  for (const row of eligible.sort((a, b) => b.natural - a.natural)) {
    const slug = row.creator.slug || row.creator.username || '';
    const target = targetFromNatural(row.natural, minN, maxN, slug);
    const need = Math.max(0, target - row.total);
    const picked = pickSeedUsers(seedUsers, slug, need, row.saverIds);

    console.log(
      `@${row.creator.username} natural=${row.natural} total=${row.total} -> target=${target} add=${picked.length}`,
    );

    if (!DRY_RUN) {
      for (const user of picked) {
        const res = await usersCol.updateOne(
          { _id: user._id },
          { $addToSet: { savedCreators: row.creator._id } },
        );
        if (res.modifiedCount) totalAdds++;
      }
    }
  }

  console.log(DRY_RUN ? '\nDry run done.\n' : `\nAdded ${totalAdds} seed saves.\n`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
