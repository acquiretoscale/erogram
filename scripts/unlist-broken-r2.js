/**
 * unlist-broken-r2.js
 *
 * The r2.dev public URL is 403ing (rate-limited). Creators whose avatar points
 * at r2.dev show broken images. This SAFELY unlists them WITHOUT data loss:
 *   1. Copies avatar  → avatarBackup  (only if no backup yet)
 *   2. Copies header  → headerBackup
 *   3. Blanks avatar (+ header) so listing queries (avatar != '') drop them
 *   4. Tags unlistedReason = 'r2dev-403'
 *
 * RESTORE later (after custom domain fixes R2): node scripts/unlist-broken-r2.js --restore
 *
 * Usage:
 *   node scripts/unlist-broken-r2.js            # unlist
 *   node scripts/unlist-broken-r2.js --restore  # restore
 *   node scripts/unlist-broken-r2.js --dry-run
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('Missing MONGODB_URI'); process.exit(1); }

const RESTORE = process.argv.includes('--restore');
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  await mongoose.connect(MONGO_URI);
  const col = mongoose.connection.db.collection('onlyfanscreators');

  if (RESTORE) {
    const toRestore = await col.find({ unlistedReason: 'r2dev-403', avatarBackup: { $exists: true } })
      .project({ avatarBackup: 1, headerBackup: 1 }).toArray();
    console.log(`Restoring ${toRestore.length} creators...`);
    if (DRY_RUN) { console.log('[dry-run] would restore'); await mongoose.disconnect(); return; }
    let n = 0;
    for (const c of toRestore) {
      const set = { avatar: c.avatarBackup };
      if (c.headerBackup) set.header = c.headerBackup;
      await col.updateOne({ _id: c._id }, {
        $set: set,
        $unset: { avatarBackup: '', headerBackup: '', unlistedReason: '' },
      });
      if (++n % 200 === 0) console.log(`  ${n}/${toRestore.length}`);
    }
    console.log(`Restored ${n}.`);
    await mongoose.disconnect();
    return;
  }

  // UNLIST
  const targets = await col.find({
    deleted: { $ne: true },
    avatar: { $regex: 'r2\\.dev' },
    avatarBackup: { $exists: false },
  }).project({ avatar: 1, header: 1 }).toArray();

  console.log(`Found ${targets.length} broken-r2 creators to unlist.`);
  if (DRY_RUN) { console.log('[dry-run] no writes'); await mongoose.disconnect(); return; }

  let n = 0;
  for (const c of targets) {
    await col.updateOne({ _id: c._id }, {
      $set: {
        avatarBackup: c.avatar,
        headerBackup: c.header || '',
        unlistedReason: 'r2dev-403',
        avatar: '',
        header: '',
      },
    });
    if (++n % 200 === 0) console.log(`  ${n}/${targets.length}`);
  }
  console.log(`Unlisted ${n} creators (avatar blanked, originals saved to avatarBackup).`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
