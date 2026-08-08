/* eslint-disable */
/**
 * Seed savedCreators bookmarks (3-13) for newest creators with 2+ unique extra photos.
 * Uses engagement seed users (password seeduser123).
 *
 *   node scripts/seed-community-bookmarks.js --dry-run
 *   node scripts/seed-community-bookmarks.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const DRY_RUN = process.argv.includes('--dry-run');
const SEED_PASSWORD = 'seeduser123';

function countUniqueExtraPhotos(creator) {
  const avatar = (creator.avatar || '').trim();
  const cover = (creator.header || '').trim();
  const seen = new Set([avatar, cover].filter(Boolean));
  let count = 0;
  for (const url of creator.extraPhotos || []) {
    const u = (url || '').trim();
    if (!u.startsWith('http') || seen.has(u)) continue;
    seen.add(u);
    count++;
  }
  return count;
}

function hashSlug(slug) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (Math.imul(31, h) + slug.charCodeAt(i)) >>> 0;
  return h;
}

function pickSeedUsers(seedUsers, slug, count) {
  const shuffled = [...seedUsers].sort((a, b) => {
    const ah = hashSlug(slug + a._id.toString());
    const bh = hashSlug(slug + b._id.toString());
    return ah - bh;
  });
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

async function main() {
  console.log(DRY_RUN ? '\n=== DRY RUN ===\n' : '\n=== SEED COMMUNITY BOOKMARKS ===\n');
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const usersCol = db.collection('users');
  const creatorsCol = db.collection('onlyfanscreators');

  const allUsers = await usersCol.find({ password: { $exists: true, $ne: '' } }).project({ _id: 1, username: 1, password: 1 }).toArray();
  const seedUsers = [];
  for (const u of allUsers) {
    if (await bcrypt.compare(SEED_PASSWORD, u.password)) seedUsers.push(u);
  }
  console.log(`Seed users: ${seedUsers.length}`);
  if (seedUsers.length < 3) {
    console.error('Need at least 3 seed users.');
    process.exit(1);
  }

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
    .project({ username: 1, slug: 1, name: 1, avatar: 1, header: 1, extraPhotos: 1 })
    .toArray();

  const eligible = creators
    .map((c) => ({ ...c, extraCount: countUniqueExtraPhotos(c) }))
    .filter((c) => c.extraCount >= 2)
    .sort((a, b) => b.extraCount - a.extraCount);

  console.log(`Eligible creators (2+ unique extras): ${eligible.length}\n`);

  let totalAdds = 0;
  for (const creator of eligible) {
    const slug = creator.slug || creator.username || '';
    const h = hashSlug(slug);
    const targetCount = 3 + (h % 11);
    const picked = pickSeedUsers(seedUsers, slug, targetCount);

    console.log(`@${creator.username} extras=${creator.extraCount} -> ${picked.length} bookmarks`);

    if (!DRY_RUN) {
      for (const user of picked) {
        const res = await usersCol.updateOne(
          { _id: user._id },
          { $addToSet: { savedCreators: creator._id } },
        );
        if (res.modifiedCount) totalAdds++;
      }
    }
  }

  console.log(DRY_RUN ? '\nDry run done.\n' : `\nUpdated ${totalAdds} user saves.\n`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
