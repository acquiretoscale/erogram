/* eslint-disable */
// Consolidate OnlyFans creator campaigns under the ONE system advertiser.
//
// Problem: OF-creator campaigns are split across two advertiser docs:
//   - "OnlyFans Creators"          (system, created by ofSync.ts)  <- canonical, keep
//   - "Erogram Featured Creators"  (legacy, manually created)      <- merge away
// This splits the advertiser dashboard into competing lines.
//
// This script:
//   1. Re-links every OF-creator campaign owned by "Erogram Featured Creators"
//      to "OnlyFans Creators".
//   2. If "Erogram Featured Creators" has NO campaigns left, deletes it.
//      If it still owns non-OF campaigns, it is KEPT (and we report which).
//
// DEFAULT = DRY RUN (writes nothing). Pass --commit to apply.
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const COMMIT = process.argv.includes('--commit');
const CANONICAL = 'OnlyFans Creators';   // all OF-creator campaigns live here (one red line)
const LEGACY = 'Erogram Featured Creators'; // legacy split bucket — to be emptied + deleted
const ADNET = 'EROGRAM';                 // Erogram ad-network advertiser — gets leftover sponsor ads

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const advertisers = db.collection('advertisers');
  const campaigns = db.collection('campaigns');

  const canonical = await advertisers.findOne({ name: CANONICAL });
  const legacy = await advertisers.findOne({ name: LEGACY });
  const adnet = await advertisers.findOne({ name: ADNET });

  console.log(`\n=== MERGE OF ADVERTISER ${COMMIT ? '(COMMIT)' : '(DRY RUN)'} ===`);
  if (!canonical) { console.error(`Canonical advertiser "${CANONICAL}" not found — aborting.`); process.exit(1); }
  if (!adnet) { console.error(`Ad-network advertiser "${ADNET}" not found — aborting.`); process.exit(1); }
  if (!legacy) { console.log(`Legacy advertiser "${LEGACY}" not found — nothing to do.`); await mongoose.disconnect(); return; }

  console.log(`canonical "${CANONICAL}" = ${canonical._id}`);
  console.log(`adnet     "${ADNET}"     = ${adnet._id}`);
  console.log(`legacy    "${LEGACY}"   = ${legacy._id}`);

  const ofCampaigns = await campaigns.find({ advertiserId: legacy._id, adType: 'onlyfans-creator' }).project({ name:1, ofUsername:1 }).toArray();
  const nonOf = await campaigns.find({ advertiserId: legacy._id, adType: { $ne: 'onlyfans-creator' } }).project({ name:1, adType:1 }).toArray();

  console.log(`\nOF-creator campaigns → "${CANONICAL}": ${ofCampaigns.length}`);
  ofCampaigns.forEach(c => console.log(`  - ${c.ofUsername || c.name}`));
  console.log(`\nNon-OF sponsor campaigns → "${ADNET}": ${nonOf.length}`);
  nonOf.forEach(c => console.log(`  - [${c.adType}] ${c.name}`));

  if (COMMIT) {
    if (ofCampaigns.length) {
      const r = await campaigns.updateMany(
        { advertiserId: legacy._id, adType: 'onlyfans-creator' },
        { $set: { advertiserId: canonical._id } },
      );
      console.log(`\nRe-linked ${r.modifiedCount} OF campaigns to "${CANONICAL}".`);
    }
    if (nonOf.length) {
      const r2 = await campaigns.updateMany(
        { advertiserId: legacy._id, adType: { $ne: 'onlyfans-creator' } },
        { $set: { advertiserId: adnet._id } },
      );
      console.log(`Re-linked ${r2.modifiedCount} sponsor campaigns to "${ADNET}".`);
    }
    const remaining = await campaigns.countDocuments({ advertiserId: legacy._id });
    if (remaining === 0) {
      await advertisers.deleteOne({ _id: legacy._id });
      console.log(`Deleted empty advertiser "${LEGACY}".`);
    } else {
      console.log(`KEPT "${LEGACY}" — still owns ${remaining} campaign(s) (unexpected).`);
    }
  } else {
    console.log(`\nWould re-link ${ofCampaigns.length} OF campaigns → "${CANONICAL}".`);
    console.log(`Would re-link ${nonOf.length} sponsor campaigns → "${ADNET}".`);
    console.log(`Would DELETE "${LEGACY}" (no campaigns left after move).`);
    console.log(`\nDRY RUN only. Re-run with --commit to apply.`);
  }

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
