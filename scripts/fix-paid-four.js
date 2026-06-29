/* eslint-disable */
/**
 * ONE-TIME FIX for the first paid OF deal (4 creators, $350, +4K clicks/week combined).
 * For each of the 4: ensure an active TrendingOFCreator featured slot AND a linked active
 * onlyfans-creator Campaign with the DEFAULT max-exposure placement set, tagged with a shared
 * PILOT note so their combined clicks are easy to total. Idempotent — safe to re-run.
 *
 * Mirrors lib/actions/ofSync.ts (syncTrendingToCampaign) exactly so the data matches the app.
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const FOUR = ['marialuna18', 'vanessa.cherry18', 'saracore', 'clarablanc'];
const PILOT_NOTE = 'PILOT: Agency deal #1 — $350 / 4K clks combined / 1 week';
const OF_NO_END_DATE = new Date('2099-12-31T00:00:00.000Z');

// Must match lib/adPlacements.ts DEFAULT_OF_CREATOR_PLACEMENTS.
const DEFAULT_OF_CREATOR_PLACEMENTS = [
  'top-groups-1', 'top-groups-2', 'top-groups-3', 'top-groups-4',
  'feed-2', 'feed-3', 'feed-4', 'feed-5',
  'top-bots-1', 'top-bots-2', 'top-bots-3', 'top-bots-4',
  'ainsfw-featured', 'ainsfw-feed',
  'home-block-1', 'home-block-2',
  'best-of', 'of-cat',
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const creators = db.collection('onlyfanscreators');
  const trending = db.collection('trendingofcreators');
  const campaigns = db.collection('campaigns');
  const advertisers = db.collection('advertisers');

  // System advertiser that owns OF-creator campaigns (mirror getOFSystemAdvertiserId).
  let sysAdv = await advertisers.findOne({ name: 'OnlyFans Creators' });
  if (!sysAdv) {
    const r = await advertisers.insertOne({
      name: 'OnlyFans Creators', email: 'of-creators@erogram.internal',
      company: 'Erogram', status: 'active', createdAt: new Date(), updatedAt: new Date(),
    });
    sysAdv = { _id: r.insertedId };
    console.log('Created system advertiser "OnlyFans Creators"');
  }

  // Lowest free featured position 1..12. If full, recycle an ENDED/inactive slot
  // (a finished old campaign) so a paying creator can take its position. Never touches
  // an ACTIVE slot. Returns { position, recycledFrom } or null if nothing can be freed.
  async function acquirePosition() {
    const rows = await trending.find({}).sort({ position: 1 }).toArray();
    const taken = new Set(rows.map((r) => r.position));
    for (let p = 1; p <= 12; p++) if (!taken.has(p)) return { position: p, recycledFrom: null };

    // All 12 full → find the lowest-position INACTIVE slot whose campaign is ended/paused.
    for (const r of rows) {
      if (r.active) continue; // never displace an active creator
      let camp = r.linkedCampaignId ? await campaigns.findOne({ _id: r.linkedCampaignId }) : null;
      if (!camp) camp = await campaigns.findOne({ adType: 'onlyfans-creator', ofUsername: new RegExp(`^${esc(r.username)}$`, 'i') });
      const ended = !camp || camp.status === 'ended' || camp.status === 'paused' || camp.isVisible === false;
      if (ended) {
        // Remove the dead featured slot (and detach its campaign link). Leave the campaign
        // row itself for its historical click stats; it's already not running.
        await trending.deleteOne({ _id: r._id });
        return { position: r.position, recycledFrom: r.username };
      }
    }
    return null;
  }

  for (const u of FOUR) {
    const rx = new RegExp(`^${esc(u)}$`, 'i');
    console.log(`\n=== @${u} ===`);

    const cr = await creators.findOne({ username: rx }, { projection: { name: 1, avatar: 1, url: 1 } });
    if (!cr) { console.log('  ⚠ NOT in OnlyFansCreator — skipping (add it in /OF first).'); continue; }
    const name = cr.name || u;
    const avatar = cr.avatar || '';
    const url = cr.url || `https://onlyfans.com/${u}`;

    // 1) Ensure an active featured slot.
    let slot = await trending.findOne({ username: rx });
    if (!slot) {
      const acq = await acquirePosition();
      if (acq == null) { console.log('  ⚠ All 12 slots full and none are ended/paused — free one manually, then re-run.'); continue; }
      const pos = acq.position;
      if (acq.recycledFrom) console.log(`  ↻ Recycled slot #${pos} from ended/paused @${acq.recycledFrom}`);
      const r = await trending.insertOne({
        name, username: u, avatar, url, bio: '', categories: [], position: pos,
        note: PILOT_NOTE, dealPrice: 0, active: true, clicks: 0, clickBudget: 0,
        dailyClickCap: 0, isStarPick: false, liveHourStart: 0, liveHourEnd: 0,
        source: 'ofadmin', createdAt: new Date(), updatedAt: new Date(),
      });
      slot = await trending.findOne({ _id: r.insertedId });
      console.log(`  + Created featured slot #${pos} (active, live 24/7)`);
    } else {
      await trending.updateOne({ _id: slot._id }, { $set: { active: true, note: PILOT_NOTE } });
      console.log(`  ✓ Featured slot #${slot.position} → active, note tagged`);
      slot = await trending.findOne({ _id: slot._id });
    }

    // 2) Ensure a linked active campaign with default max-exposure placements.
    let camp = slot.linkedCampaignId ? await campaigns.findOne({ _id: slot.linkedCampaignId }) : null;
    if (!camp) camp = await campaigns.findOne({ adType: 'onlyfans-creator', ofUsername: rx });

    if (!camp) {
      const r = await campaigns.insertOne({
        advertiserId: sysAdv._id, name, internalName: PILOT_NOTE, slot: 'feed',
        creative: avatar, destinationUrl: url, adType: 'onlyfans-creator', ofUsername: u,
        startDate: new Date(), endDate: OF_NO_END_DATE, status: 'active', isVisible: true,
        impressions: 0, clicks: 0, feedTier: 1, tierSlot: 2, position: 2,
        placements: DEFAULT_OF_CREATOR_PLACEMENTS, targetKeywords: [],
        feedPlacement: 'both', buttonText: 'View Profile', socialProof: 'random',
        // First paid client → BOOST priority (10× visibility), NO daily cap (uncapped toward 4K).
        priority: 'boost', dailyClickCap: null,
        ofTrendingId: slot._id, createdAt: new Date(), updatedAt: new Date(),
      });
      camp = await campaigns.findOne({ _id: r.insertedId });
      await trending.updateOne({ _id: slot._id }, { $set: { linkedCampaignId: camp._id } });
      console.log(`  + Created campaign with ${DEFAULT_OF_CREATOR_PLACEMENTS.length} placements (max exposure)`);
    } else {
      await campaigns.updateOne({ _id: camp._id }, {
        $set: {
          status: 'active', isVisible: true, startDate: new Date(), endDate: OF_NO_END_DATE,
          placements: DEFAULT_OF_CREATOR_PLACEMENTS, internalName: PILOT_NOTE,
          ofTrendingId: slot._id, feedPlacement: 'both',
          // First paid client → BOOST priority (10× visibility), NO daily cap.
          priority: 'boost', dailyClickCap: null,
        },
      });
      if (!slot.linkedCampaignId) await trending.updateOne({ _id: slot._id }, { $set: { linkedCampaignId: camp._id } });
      console.log(`  ✓ Campaign updated → active, ${DEFAULT_OF_CREATOR_PLACEMENTS.length} placements, linked`);
    }
  }

  console.log('\nDone. Run: node scripts/inspect-paid-four.js to verify.');
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
