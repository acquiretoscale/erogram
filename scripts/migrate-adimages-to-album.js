/**
 * ONE-OFF migration: fold the old split-test `adImages` (on TrendingOFCreator) into the
 * creator's real album (`extraPhotos` on OnlyFansCreator), so scraped + uploaded photos are
 * ONE grouped album. Also maps old numeric `pausedVariants` (-1=avatar, 0..n=adImages) to the
 * new URL-based `pausedImageUrls`. Idempotent: re-running won't duplicate.
 *
 * Run: node scripts/migrate-adimages-to-album.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const trending = db.collection('trendingofcreators');
  const creators = db.collection('onlyfanscreators');

  const docs = await trending.find({ adImages: { $exists: true, $ne: [] } }).toArray();
  console.log(`Found ${docs.length} trending creators with legacy adImages.`);

  for (const t of docs) {
    const uname = String(t.username || '').toLowerCase();
    if (!uname) continue;
    const creator = await creators.findOne({ username: new RegExp(`^${uname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    if (!creator) { console.log(`  ! no scraped creator for @${uname}, skipping`); continue; }

    const avatar = creator.avatar || '';
    const existingExtra = creator.extraPhotos || [];
    const adImages = t.adImages || [];

    // Merge adImages into extraPhotos (dedup, skip if already there or equals avatar).
    const mergedExtra = [...existingExtra];
    for (const url of adImages) {
      if (!url || url === avatar || mergedExtra.includes(url)) continue;
      mergedExtra.push(url);
    }

    // Build the album exactly as the app will: [avatar, ...mergedExtra].
    const album = [avatar, ...mergedExtra].filter(Boolean);

    // Map old numeric pausedVariants -> URLs. Old scheme: -1 = avatar, i = adImages[i].
    const oldPaused = t.pausedVariants || [];
    const pausedUrls = [];
    for (const v of oldPaused) {
      if (v === -1 && avatar) pausedUrls.push(avatar);
      else if (v >= 0 && adImages[v]) pausedUrls.push(adImages[v]);
    }
    const dedupPaused = [...new Set(pausedUrls)].filter((u) => album.includes(u));

    if (mergedExtra.length !== existingExtra.length) {
      await creators.updateOne({ _id: creator._id }, { $set: { extraPhotos: mergedExtra } });
    }
    await trending.updateOne(
      { _id: t._id },
      { $set: { adImages: [], pausedImageUrls: dedupPaused }, $unset: { pausedVariants: '', activeImageIndex: '' } },
    );

    console.log(`  ✓ @${uname}: album=${album.length} (extra ${existingExtra.length}->${mergedExtra.length}), paused=${dedupPaused.length}`);
  }

  console.log('Done.');
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
