/**
 * Migration Script: Convert legacy adverts to the new Campaign system.
 *
 * Creates Advertiser entries for CPAMatica and Lovescape, then converts
 * all 55 active ads from the `adverts` collection into Campaign documents
 * with exact feed positions based on click performance rank.
 *
 * Run: node scripts/migrate-adverts-to-campaigns.mjs
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

  // ──────────────────────────────────────
  // 1. Create Advertisers
  // ──────────────────────────────────────
  const advertisers = db.collection('advertisers');

  // Remove any previously migrated advertisers to allow re-running
  const existingCPA = await advertisers.findOne({ name: 'CPAMatica' });
  const existingLove = await advertisers.findOne({ name: 'Lovescape' });

  let cpaId, loveId;

  if (existingCPA) {
    cpaId = existingCPA._id;
    console.log('CPAMatica advertiser already exists: ' + cpaId);
  } else {
    const res = await advertisers.insertOne({
      name: 'CPAMatica',
      email: 'affiliate@cpamatica.com',
      company: 'CPAMatica (Affiliate Network)',
      logo: '',
      notes: 'CPA affiliate network. Offers: meFeSO (casual dating), H5FwCW (trans dating), uOxkgV (AI girl), G5GaC8 (AI girl).',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    cpaId = res.insertedId;
    console.log('Created CPAMatica advertiser: ' + cpaId);
  }

  if (existingLove) {
    loveId = existingLove._id;
    console.log('Lovescape advertiser already exists: ' + loveId);
  } else {
    const res = await advertisers.insertOne({
      name: 'Lovescape',
      email: 'partners@lovescape.com',
      company: 'Lovescape (AI Girlfriend)',
      logo: '',
      notes: 'AI girlfriend platform. Single offer with Erogram-specific tracking link.',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    loveId = res.insertedId;
    console.log('Created Lovescape advertiser: ' + loveId);
  }

  console.log('');

  // ──────────────────────────────────────
  // 2. Fetch active adverts sorted by clicks
  // ──────────────────────────────────────
  const adverts = await db
    .collection('adverts')
    .find({ status: 'active', isPopupAdvert: { $ne: true } })
    .sort({ clickCount: -1 })
    .toArray();

  console.log('Found ' + adverts.length + ' active adverts to migrate.\n');

  // ──────────────────────────────────────
  // 3. Convert to Campaign documents
  // ──────────────────────────────────────
  const campaigns = db.collection('campaigns');
  const oneYearFromNow = new Date(Date.now() + 365 * 86400000);
  let created = 0;
  let skipped = 0;

  // Assign positions: rank 1 = position 2 (after 2nd group), then spaced every 2-3 groups
  // This gives a natural feel: positions 2, 4, 7, 9, 12, 14, 17, 19, ...
  function positionForRank(rank) {
    // First ad at position 2, then alternating gaps of 2 and 3
    let pos = 2;
    for (let i = 1; i < rank; i++) {
      pos += i % 2 === 0 ? 3 : 2;
    }
    return pos;
  }

  for (let i = 0; i < adverts.length; i++) {
    const a = adverts[i];
    const url = a.url || '';
    const position = positionForRank(i + 1);

    // Determine advertiser
    let advertiserId;
    if (url.includes('lovescape')) {
      advertiserId = loveId;
    } else {
      advertiserId = cpaId;
    }

    // Check if this advert was already migrated (by name + slot)
    const existing = await campaigns.findOne({ name: a.name, slot: 'feed' });
    if (existing) {
      skipped++;
      continue;
    }

    await campaigns.insertOne({
      advertiserId,
      name: a.name || 'Untitled Ad',
      slot: 'feed',
      creative: a.image || '/assets/image.jpg',
      destinationUrl: url || 'https://erogram.pro',
      startDate: a.createdAt || new Date(),
      endDate: oneYearFromNow,
      status: 'active',
      isVisible: true,
      impressions: 0,
      clicks: a.clickCount || 0,
      position,
      description: (a.description || '').slice(0, 300),
      category: a.category || 'All',
      country: a.country || 'All',
      buttonText: a.buttonText || 'Visit Site',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    created++;
    console.log(
      '  [' + (i + 1) + '] pos=' + position + ' | ' +
      String(a.clickCount || 0).padStart(5) + ' clicks | ' +
      (url.includes('lovescape') ? 'Lovescape' : 'CPAMatica').padEnd(10) + ' | ' +
      a.name
    );
  }

  console.log('\nFeed campaigns created: ' + created + ', skipped (already exist): ' + skipped);

  // ──────────────────────────────────────
  // 4. Create sidebar-feed campaigns from top 3 performers
  // ──────────────────────────────────────
  console.log('\n--- Creating sidebar-feed campaigns ---');

  const topAds = adverts.slice(0, 3);
  let sidebarCreated = 0;

  for (let i = 0; i < topAds.length; i++) {
    const a = topAds[i];
    const url = a.url || '';
    const existing = await campaigns.findOne({ name: a.name, slot: 'sidebar-feed' });
    if (existing) {
      console.log('  Sidebar-feed already exists: ' + a.name);
      continue;
    }

    let advertiserId = url.includes('lovescape') ? loveId : cpaId;

    await campaigns.insertOne({
      advertiserId,
      name: a.name || 'Untitled Ad',
      slot: 'sidebar-feed',
      creative: a.image || '/assets/image.jpg',
      destinationUrl: url || 'https://erogram.pro',
      startDate: a.createdAt || new Date(),
      endDate: oneYearFromNow,
      status: 'active',
      isVisible: true,
      impressions: 0,
      clicks: a.clickCount || 0,
      position: i + 1,
      description: (a.description || '').slice(0, 300),
      category: a.category || 'All',
      country: a.country || 'All',
      buttonText: a.buttonText || 'Visit Site',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    sidebarCreated++;
    console.log('  [sidebar ' + (i + 1) + '] ' + a.name);
  }

  console.log('\nSidebar-feed campaigns created: ' + sidebarCreated);

  // ──────────────────────────────────────
  // 5. Summary
  // ──────────────────────────────────────
  const totalCampaigns = await campaigns.countDocuments();
  const feedCount = await campaigns.countDocuments({ slot: 'feed' });
  const sidebarFeedCount = await campaigns.countDocuments({ slot: 'sidebar-feed' });
  const advertiserCount = await advertisers.countDocuments();

  console.log('\n=== Migration Summary ===');
  console.log('Advertisers: ' + advertiserCount);
  console.log('Total campaigns: ' + totalCampaigns);
  console.log('  Feed campaigns: ' + feedCount);
  console.log('  Sidebar-feed campaigns: ' + sidebarFeedCount);
  console.log('  Other campaigns: ' + (totalCampaigns - feedCount - sidebarFeedCount));
  console.log('\nDone! The adverts collection is preserved as a historical archive.');

  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
