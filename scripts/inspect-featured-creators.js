/* eslint-disable */
// READ-ONLY diagnostic: for every featured OF creator, show its TrendingOFCreator slot,
// its linked Ad Network campaign, the campaign's placements/tierSlot/status, and which
// front-end surfaces it will therefore appear on. Writes NOTHING.
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

// Mirror of lib/adPlacements.ts PLACEMENTS → legacyTierSlot, plus which surface each maps to.
const PLACEMENT_INFO = {
  'top-groups-1': { tierSlot: 6, surface: '/groups Top Groups Spot 1' },
  'top-groups-2': { tierSlot: 1, surface: '/groups Top Groups Spot 2' },
  'top-groups-3': { tierSlot: 11, surface: '/groups Top Groups Spot 3' },
  'top-groups-4': { tierSlot: 5, surface: '/groups Top Groups Spot 4' },
  'feed-2': { tierSlot: 2, surface: '/groups+/bots in-feed (after 2)' },
  'feed-3': { tierSlot: 3, surface: '/groups+/bots in-feed (after 7)' },
  'feed-4': { tierSlot: 4, surface: '/groups+/bots in-feed (loops)' },
  'feed-5': { tierSlot: 5, surface: 'in-feed Featured Bot' },
  'top-bots-1': { tierSlot: 7, surface: '/bots Top Bots Spot 1' },
  'top-bots-2': { tierSlot: 8, surface: '/bots Top Bots Spot 2' },
  'top-bots-3': { tierSlot: 9, surface: '/bots Top Bots Spot 3' },
  'top-bots-4': { tierSlot: 10, surface: '/bots Top Bots Spot 4' },
  'join-cta': { tierSlot: null, surface: 'group/bot page Join CTA (NOT feed)' },
  'group-sidebar': { tierSlot: null, surface: 'group/bot page sidebar (NOT feed)' },
  'ainsfw-featured': { tierSlot: null, surface: '/ainsfw featured row (NOT feed tierSlot)' },
  'ainsfw-feed': { tierSlot: null, surface: '/ainsfw grid (NOT feed tierSlot)' },
  'home-block-1': { tierSlot: null, surface: 'Spotlight/main Adspace 1 (NOT feed)' },
  'home-block-2': { tierSlot: null, surface: 'Spotlight/main Adspace 2 (NOT feed)' },
  'top-banner': { tierSlot: null, surface: 'Top banner (NOT feed)' },
  'navbar-cta': { tierSlot: null, surface: 'Navbar CTA (NOT feed)' },
  'best-of': { tierSlot: null, surface: 'Top 10 Best OnlyFans (keyword-targeted)' },
  'best-groups': { tierSlot: null, surface: 'Top 10 Best Telegram (keyword-targeted)' },
  'of-cat': { tierSlot: null, surface: 'OF Search category pages (keyword-targeted)' },
};

function describePlacements(pls) {
  if (!Array.isArray(pls) || pls.length === 0) return '(none assigned)';
  return pls.map((p) => `${p} → ${PLACEMENT_INFO[p]?.surface || 'UNKNOWN'}`).join('\n        ');
}

// Replicate effectiveTierSlots() from campaigns.ts to predict actual feed visibility.
function effectiveFeedSlots(camp) {
  const pls = Array.isArray(camp.placements) ? camp.placements : [];
  if (pls.length > 0) {
    const slots = new Set();
    for (const p of pls) {
      const ts = PLACEMENT_INFO[p]?.tierSlot;
      if (ts != null) slots.add(ts);
    }
    return [...slots];
  }
  if (camp.tierSlot != null) return [camp.tierSlot];
  return [4];
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const trending = mongoose.connection.db.collection('trendingofcreators');
  const campaigns = mongoose.connection.db.collection('campaigns');

  const slots = await trending.find({}).sort({ position: 1 }).toArray();
  console.log(`\n=== ${slots.length} featured slot(s) in TrendingOFCreator ===\n`);

  for (const s of slots) {
    let camp = null;
    if (s.linkedCampaignId) camp = await campaigns.findOne({ _id: s.linkedCampaignId });
    if (!camp && s.username) {
      camp = await campaigns.findOne({
        adType: 'onlyfans-creator',
        ofUsername: { $regex: new RegExp(`^${s.username}$`, 'i') },
      });
    }

    console.log(`#${s.position}  @${s.username}  (${s.name})`);
    console.log(`    slot.active: ${s.active}   clicks: ${s.clicks || 0}   budget: ${s.clickBudget || 0}   note: ${s.note || '-'}`);
    console.log(`    categories: ${(s.categories || []).join(', ') || '(none)'}`);

    if (!camp) {
      console.log(`    Ad Network campaign: NONE FOUND  → only shows in OF Search rail, NOT in feeds`);
      console.log('');
      continue;
    }

    const feedSlots = effectiveFeedSlots(camp);
    console.log(`    campaign status: ${camp.status}   isVisible: ${camp.isVisible}   tierSlot(legacy): ${camp.tierSlot}`);
    console.log(`    placements:\n        ${describePlacements(camp.placements)}`);
    console.log(`    targetKeywords: ${(camp.targetKeywords || []).join(', ') || '(none → all category pages of targeted type)'}`);
    console.log(`    EFFECTIVE feed tierSlots: [${feedSlots.join(', ')}]  ${feedSlots.length === 0 ? '⚠ NOT IN ANY /groups /bots /ainsfw FEED' : ''}`);
    console.log('');
  }

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
