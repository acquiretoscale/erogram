/**
 * Apply tiered feed structure and archive non–top performers.
 *
 * - Feed: 12 slots (Tier 1: 4, Tier 2: 4, Tier 3: 4).
 *   - Tier 1: Top 4 Lovescape campaigns by clicks.
 *   - Tier 2: Top 4 CPAMatica campaigns by clicks.
 *   - Tier 3: Next 4 campaigns by clicks (any advertiser).
 *   - All other feed campaigns → status 'ended'.
 * - Sidebar: 4 slots. Keep 2 Lovescape + 2 CPAMatica (top 2 each by clicks). End the rest.
 *
 * Run: node scripts/apply-feed-tiers-and-archive.mjs
 */

import dns from 'node:dns';
import mongoose from 'mongoose';

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://erogrampro:ke5K2CXlFmYB36sj@cluster0.dlph1wf.mongodb.net/erogram?appName=Cluster0';

async function run() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;

  console.log('Connected to MongoDB.\n');

  const campaigns = db.collection('campaigns');
  const advertisers = db.collection('advertisers');

  const now = new Date();

  // Resolve advertiser names to IDs
  const cpa = await advertisers.findOne({ name: 'CPAMatica' });
  const love = await advertisers.findOne({ name: 'Lovescape' });
  const cpaId = cpa?._id?.toString();
  const loveId = love?._id?.toString();
  if (!cpaId || !loveId) {
    console.error('CPAMatica or Lovescape advertiser not found.');
    process.exit(1);
  }

  // ─── FEED: assign tiers and archive rest ─────────────────────────
  const feedCampaigns = await campaigns
    .find({
      slot: 'feed',
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
    .sort({ clicks: -1 })
    .toArray();

  const lovescapeFeed = feedCampaigns.filter((c) => c.advertiserId?.toString() === loveId);
  const cpamaticaFeed = feedCampaigns.filter((c) => c.advertiserId?.toString() === cpaId);
  const otherFeed = feedCampaigns.filter(
    (c) => c.advertiserId?.toString() !== loveId && c.advertiserId?.toString() !== cpaId
  );

  const tier1 = lovescapeFeed.slice(0, 4);
  const tier2 = cpamaticaFeed.slice(0, 4);
  const tier3Candidates = [
    ...lovescapeFeed.slice(4),
    ...cpamaticaFeed.slice(4),
    ...otherFeed,
  ].sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
  const tier3 = tier3Candidates.slice(0, 4);

  const toArchive = feedCampaigns.filter(
    (c) =>
      !tier1.some((t) => t._id.equals(c._id)) &&
      !tier2.some((t) => t._id.equals(c._id)) &&
      !tier3.some((t) => t._id.equals(c._id))
  );

  console.log('--- FEED ---');
  console.log('Tier 1 (Lovescape, top 4):');
  for (let i = 0; i < tier1.length; i++) {
    await campaigns.updateOne(
      { _id: tier1[i]._id },
      { $set: { feedTier: 1, tierSlot: i + 1, position: null, updatedAt: now } }
    );
    console.log(`  ${i + 1}. ${tier1[i].name} (${tier1[i].clicks || 0} clicks)`);
  }
  console.log('Tier 2 (CPAMatica, top 4):');
  for (let i = 0; i < tier2.length; i++) {
    await campaigns.updateOne(
      { _id: tier2[i]._id },
      { $set: { feedTier: 2, tierSlot: i + 1, position: null, updatedAt: now } }
    );
    console.log(`  ${i + 1}. ${tier2[i].name} (${tier2[i].clicks || 0} clicks)`);
  }
  console.log('Tier 3 (next 4 by clicks):');
  for (let i = 0; i < tier3.length; i++) {
    await campaigns.updateOne(
      { _id: tier3[i]._id },
      { $set: { feedTier: 3, tierSlot: i + 1, position: null, updatedAt: now } }
    );
    const adv = tier3[i].advertiserId?.toString() === loveId ? 'Lovescape' : tier3[i].advertiserId?.toString() === cpaId ? 'CPAMatica' : 'Other';
    console.log(`  ${i + 1}. ${tier3[i].name} (${tier3[i].clicks || 0} clicks, ${adv})`);
  }
  if (toArchive.length > 0) {
    const res = await campaigns.updateMany(
      { _id: { $in: toArchive.map((c) => c._id) } },
      { $set: { status: 'ended', updatedAt: now } }
    );
    console.log(`\nArchived ${res.modifiedCount} feed campaigns.`);
  }

  // ─── SIDEBAR: keep 2 Lovescape + 2 CPAMatica, archive rest ───────
  const sidebarCampaigns = await campaigns
    .find({
      slot: 'sidebar-feed',
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
    .sort({ clicks: -1 })
    .toArray();

  const loveSidebar = sidebarCampaigns.filter((c) => c.advertiserId?.toString() === loveId).slice(0, 2);
  const cpaSidebar = sidebarCampaigns.filter((c) => c.advertiserId?.toString() === cpaId).slice(0, 2);
  const keepSidebar = [...loveSidebar, ...cpaSidebar];
  const archiveSidebar = sidebarCampaigns.filter((c) => !keepSidebar.some((k) => k._id.equals(c._id)));

  console.log('\n--- SIDEBAR (4 slots) ---');
  console.log('Keeping: 2 Lovescape, 2 CPAMatica');
  keepSidebar.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.name} (${c.advertiserId?.toString() === loveId ? 'Lovescape' : 'CPAMatica'})`);
  });
  if (archiveSidebar.length > 0) {
    await campaigns.updateMany(
      { _id: { $in: archiveSidebar.map((c) => c._id) } },
      { $set: { status: 'ended', updatedAt: now } }
    );
    console.log(`Archived ${archiveSidebar.length} sidebar campaign(s).`);
  }

  console.log('\nDone.');
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
