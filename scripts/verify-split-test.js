/* eslint-disable */
// READ-ONLY: replicate the dashboard's per-image (:v idx) parsing for a few creators and show
// per-image clicks vs total, proving untagged/backfill clicks bucket to -1 (total only, not Default).
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const trending = db.collection('trendingofcreators');
  const clicks = db.collection('campaignclicks');

  const names = ['clarablanc', 'taylorskully', 'vanessa.cherry18'];
  for (const uname of names) {
    const s = await trending.findOne({ username: new RegExp(`^${uname}$`, 'i') });
    if (!s || !s.linkedCampaignId) { console.log(`@${uname}: no linked campaign`); continue; }

    // Same parse as periodClicksByVariant: ':v{idx}' → idx, else -1.
    const rows = await clicks.aggregate([
      { $match: { campaignId: s.linkedCampaignId } },
      { $project: { v: { $let: { vars: { idx: { $indexOfBytes: ['$placement', ':v'] } },
        in: { $cond: [{ $gte: ['$$idx', 0] }, { $toInt: { $substrBytes: ['$placement', { $add: ['$$idx', 2] }, 2] } }, -1] } } } } },
      { $group: { _id: '$v', n: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray();
    const total = rows.reduce((a, r) => a + r.n, 0);
    const paused = new Set(s.pausedImageUrls || []);
    console.log(`\n@${uname}  total=${total}  pausedImages=${paused.size}`);
    for (const r of rows) {
      const label = r._id === -1 ? 'UNTAGGED (total only, not shown per-image)' : (r._id === 0 ? 'Default(#0)' : `#${r._id}`);
      console.log(`   v=${r._id}  ${label}: ${r.n}`);
    }
  }
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
