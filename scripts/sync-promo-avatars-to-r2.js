/**
 * sync-promo-avatars-to-r2.js
 *
 * Paid promos (TrendingOFCreator) store their own `avatar`. Many still hotlink
 * from onlyfans.com / onlyguider.com. This copies the matching creator's R2
 * avatar (already migrated in onlyfanscreators) into the promo doc.
 *
 * Strategy: match by username (case-insensitive). If the creator has an R2
 * avatar, reuse it (no re-download, no duplicate R2 object). If no creator
 * match or creator not yet on R2, the promo is left untouched and reported.
 *
 * Usage: node scripts/sync-promo-avatars-to-r2.js [--dry-run]
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
const DRY_RUN = process.argv.includes('--dry-run');

if (!MONGO_URI || !R2_PUBLIC_URL) {
  console.error('Missing MONGODB_URI or R2_PUBLIC_URL');
  process.exit(1);
}

function isOnR2(url) {
  return !!(url && url.includes(R2_PUBLIC_URL));
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const promos = mongoose.connection.db.collection('trendingofcreators');
  const creators = mongoose.connection.db.collection('onlyfanscreators');

  const list = await promos.find({}).project({ username: 1, avatar: 1 }).toArray();
  let synced = 0;
  const unresolved = [];

  for (const p of list) {
    if (isOnR2(p.avatar)) continue;
    const uname = (p.username || '').trim();
    if (!uname) { unresolved.push(`${p._id} (no username)`); continue; }

    const creator = await creators.findOne(
      { username: { $regex: new RegExp(`^${uname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      { projection: { avatar: 1 } },
    );

    if (creator && isOnR2(creator.avatar)) {
      if (DRY_RUN) {
        console.log(`[dry-run] @${uname} → ${creator.avatar}`);
      } else {
        await promos.updateOne({ _id: p._id }, { $set: { avatar: creator.avatar } });
        console.log(`✓ @${uname} → R2`);
      }
      synced++;
    } else {
      unresolved.push(`@${uname} (creator ${creator ? 'not on R2 yet' : 'not found'})`);
    }
  }

  console.log(`\nDone: ${synced} synced, ${unresolved.length} unresolved`);
  if (unresolved.length) console.log('Unresolved:\n  ' + unresolved.join('\n  '));
  await mongoose.disconnect();
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
