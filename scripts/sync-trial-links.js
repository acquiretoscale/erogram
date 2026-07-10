/* eslint-disable */
// ONE-TIME: where a Featured-rail (TrendingOFCreator) url differs from the master
// OnlyFansCreator.url, the rail is the freshly-edited trial link → push it to the
// master record AND the linked Campaign.destinationUrl so the whole site shows it.
// SAFE: only updates the url/destinationUrl field, only when rail has a real http link.
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const tr = mongoose.connection.db.collection('trendingofcreators');
  const ofc = mongoose.connection.db.collection('onlyfanscreators');
  const camp = mongoose.connection.db.collection('campaigns');

  const rails = await tr.find({ url: { $ne: '' } }).project({ username: 1, url: 1 }).toArray();
  let updatedCreators = 0;
  let updatedCampaigns = 0;

  for (const r of rails) {
    const railUrl = (r.url || '').trim();
    if (!/^https?:\/\//i.test(railUrl)) continue;
    const rx = new RegExp('^' + r.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');

    const master = await ofc.findOne({ username: rx }, { projection: { url: 1 } });
    if (master && (master.url || '') !== railUrl) {
      await ofc.updateOne({ _id: master._id }, { $set: { url: railUrl } });
      updatedCreators++;
      console.log('master url  ✓ @' + r.username);
    }

    const res = await camp.updateMany(
      { adType: 'onlyfans-creator', ofUsername: rx, destinationUrl: { $ne: railUrl } },
      { $set: { destinationUrl: railUrl } },
    );
    if (res.modifiedCount > 0) {
      updatedCampaigns += res.modifiedCount;
      console.log('campaign    ✓ @' + r.username + ' (' + res.modifiedCount + ')');
    }
  }

  console.log('\nDone. Master creators updated:', updatedCreators, '| Campaigns updated:', updatedCampaigns);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
