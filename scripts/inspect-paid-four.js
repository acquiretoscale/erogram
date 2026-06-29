/* eslint-disable */
// READ-ONLY: full state of the 4 paying creators across OnlyFansCreator, TrendingOFCreator, Campaign.
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const FOUR = ['marialuna18', 'vanessa.cherry18', 'saracore', 'clarablanc'];

async function main() {
  await mongoose.connect(MONGO_URI);
  const creators = mongoose.connection.db.collection('onlyfanscreators');
  const trending = mongoose.connection.db.collection('trendingofcreators');
  const campaigns = mongoose.connection.db.collection('campaigns');

  for (const u of FOUR) {
    const rx = new RegExp(`^${u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const cr = await creators.findOne({ username: rx }, { projection: { username: 1, name: 1, avatar: 1, url: 1, slug: 1 } });
    const tr = await trending.findOne({ username: rx });
    const camp = await campaigns.findOne({ adType: 'onlyfans-creator', ofUsername: rx });

    console.log(`\n=== @${u} ===`);
    console.log(`  OnlyFansCreator: ${cr ? `✓ exists (slug=${cr.slug}, avatar=${cr.avatar ? (cr.avatar.includes('r2.dev') ? 'R2' : 'non-R2') : 'NONE'})` : '✗ MISSING'}`);
    if (tr) {
      console.log(`  TrendingOFCreator: ✓ slot #${tr.position}  active=${tr.active}  clicks=${tr.clicks||0}  budget=${tr.clickBudget||0}  linkedCampaignId=${tr.linkedCampaignId || 'NONE'}`);
      console.log(`      categories=${(tr.categories||[]).join(', ')||'(none)'}  liveHour=${tr.liveHourStart}/${tr.liveHourEnd}`);
    } else {
      console.log(`  TrendingOFCreator: ✗ MISSING (not in featured rail)`);
    }
    if (camp) {
      console.log(`  Campaign: ✓ _id=${camp._id}  status=${camp.status}  isVisible=${camp.isVisible}  tierSlot=${camp.tierSlot}  priority=${camp.priority||'normal'}  dailyClickCap=${camp.dailyClickCap == null ? 'NONE (uncapped)' : camp.dailyClickCap}`);
      console.log(`      placements=[${(camp.placements||[]).join(', ')||'NONE'}]`);
      console.log(`      start=${camp.startDate}  end=${camp.endDate}  ofTrendingId=${camp.ofTrendingId||'NONE'}  clicks=${camp.clicks||0}`);
    } else {
      console.log(`  Campaign: ✗ MISSING (no Ad Network campaign → not in any feed)`);
    }
  }
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
