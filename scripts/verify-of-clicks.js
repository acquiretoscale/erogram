/* eslint-disable */
// READ-ONLY verify: for each linked OF campaign, compare backfilled CampaignClick rows vs the
// old TrendingClickDaily total, and show the campaign's current Campaign.clicks. Writes nothing.
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const trending = db.collection('trendingofcreators');
  const campaigns = db.collection('campaigns');
  const clicks = db.collection('campaignclicks');
  const daily = db.collection('trendingclickdailies');

  const slots = await trending.find({ linkedCampaignId: { $ne: null } }).toArray();
  let mismatches = 0;
  for (const s of slots) {
    const oldTotal = (await daily.find({ creatorId: s._id }).toArray()).reduce((n, r) => n + (r.clicks || 0), 0);
    const backfilled = await clicks.countDocuments({ campaignId: s.linkedCampaignId, placement: 'of-cat:backfill' });
    const liveNew = await clicks.countDocuments({ campaignId: s.linkedCampaignId, placement: 'of-cat' });
    const camp = await campaigns.findOne({ _id: s.linkedCampaignId }, { projection: { clicks: 1 } });
    const ok = backfilled === oldTotal;
    if (!ok) mismatches++;
    console.log(`@${s.username}: oldDaily=${oldTotal} backfilled=${backfilled} liveNew(of-cat)=${liveNew} Campaign.clicks=${camp?.clicks ?? '?'} ${ok ? 'OK' : 'MISMATCH'}`);
  }
  console.log(`\n${mismatches === 0 ? 'ALL MATCH ✓' : mismatches + ' MISMATCH(ES)'}`);
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
