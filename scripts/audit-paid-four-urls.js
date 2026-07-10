/* eslint-disable */
// READ-ONLY: compare tracking URLs across OnlyFansCreator, TrendingOFCreator, Campaign for the 4 paid creators.
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const FOUR = ['marialuna18', 'vanessa.cherry18', 'saracore', 'clarablanc'];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function main() {
  await mongoose.connect(MONGO_URI);
  const ofc = mongoose.connection.db.collection('onlyfanscreators');
  const tr = mongoose.connection.db.collection('trendingofcreators');
  const camp = mongoose.connection.db.collection('campaigns');

  console.log('=== URL AUDIT — 4 paid creators ===\n');
  let driftCount = 0;

  for (const u of FOUR) {
    const rx = new RegExp(`^${esc(u)}$`, 'i');
    const cr = await ofc.findOne({ username: rx }, { projection: { name: 1, username: 1, url: 1, slug: 1 } });
    const slot = await tr.findOne({ username: rx }, { projection: { url: 1, active: 1, position: 1, linkedCampaignId: 1, note: 1 } });
    const campaigns = await camp.find({ adType: 'onlyfans-creator', ofUsername: rx })
      .project({ destinationUrl: 1, status: 1, isVisible: 1, placements: 1, _id: 1, internalName: 1 })
      .toArray();
    const linked = slot?.linkedCampaignId
      ? await camp.findOne({ _id: slot.linkedCampaignId }, { projection: { destinationUrl: 1, status: 1, isVisible: 1 } })
      : null;

    console.log(`--- @${u} (${cr?.name || '?'}) ---`);
    console.log(`  OnlyFansCreator.url:     ${cr?.url || 'MISSING'}`);
    console.log(`  TrendingOFCreator.url:   ${slot?.url || 'NO SLOT'}${slot ? ` [slot#${slot.position} active=${slot.active}]` : ''}`);
    console.log(`  Linked campaign url:     ${linked?.destinationUrl || 'NONE'}${linked ? ` [status=${linked.status} visible=${linked.isVisible}]` : ''}`);
    console.log(`  All onlyfans-creator campaigns (${campaigns.length}):`);
    for (const c of campaigns) {
      const matchMaster = cr?.url === c.destinationUrl;
      const matchRail = slot?.url === c.destinationUrl;
      const tag = matchMaster || matchRail ? 'OK' : 'MISMATCH';
      const active = c.status === 'active' && c.isVisible;
      console.log(`    ${c._id} [${active ? 'LIVE' : c.status}] → ${c.destinationUrl} (${tag})`);
      if (c.internalName) console.log(`      note: ${c.internalName}`);
    }

    const urls = new Set([cr?.url, slot?.url, linked?.destinationUrl, ...campaigns.map((c) => c.destinationUrl)].filter(Boolean));
    if (urls.size > 1) {
      driftCount++;
      console.log(`  ⚠ URL DRIFT — ${urls.size} different URLs:`);
      for (const x of urls) console.log(`      ${x}`);
    } else if (urls.size === 1) {
      console.log('  ✓ All stores agree on URL');
    } else {
      console.log('  ✗ No URLs found anywhere');
    }
    console.log('');
  }

  console.log(`\nSummary: ${driftCount} creator(s) with URL drift across stores`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
