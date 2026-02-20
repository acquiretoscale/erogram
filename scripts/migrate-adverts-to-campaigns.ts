/**
 * One-time migration: copy active, non-popup Adverts into Campaigns (slot=feed).
 *
 * Easiest: paste your MongoDB URI when you run it (no .env needed):
 *   npx tsx scripts/migrate-adverts-to-campaigns.ts "mongodb+srv://user:pass@cluster.mongodb.net/dbname"
 *
 * Or use .env.local with MONGODB_URI set, then: npx tsx scripts/migrate-adverts-to-campaigns.ts
 */
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Allow URI from command line so you don't need to create .env
const cliUri = process.argv[2];
if (cliUri) process.env.MONGODB_URI = cliUri;

if (!process.env.MONGODB_URI) {
  console.log('Missing MongoDB URI.');
  console.log('');
  console.log('Run (paste your connection string from MongoDB Atlas or your host):');
  console.log('  npx tsx scripts/migrate-adverts-to-campaigns.ts "mongodb+srv://..."');
  console.log('');
  console.log('Or set MONGODB_URI in erogram-v2/.env.local and run:');
  console.log('  npx tsx scripts/migrate-adverts-to-campaigns.ts');
  process.exit(1);
}

async function migrate() {
  const { default: connectDB } = await import('../lib/db/mongodb');
  const { Advert, Advertiser, Campaign } = await import('../lib/models');
  await connectDB();
  console.log('✅ Connected to MongoDB');

  const adverts = await (Advert as any)
    .find({ status: 'active', isPopupAdvert: { $ne: true } })
    .sort({ createdAt: 1 })
    .lean();
  if (!adverts.length) {
    console.log('No active non-popup adverts found. Nothing to migrate.');
    process.exit(0);
  }

  let advertiser = await Advertiser.findOne({}).sort({ createdAt: 1 }).lean();
  if (!advertiser) {
    const created = await Advertiser.create({
      name: 'Legacy Adverts',
      email: 'legacy@erogram.pro',
      company: 'Migrated from Adverts',
      status: 'active',
    });
    advertiser = created.toObject();
    console.log('✅ Created advertiser "Legacy Adverts"');
  } else {
    console.log('✅ Using existing advertiser:', (advertiser as any).name);
  }
  const advertiserId = (advertiser as any)._id;
  const now = new Date();
  const endDefault = new Date(now.getTime() + 90 * 86400000);

  let position = 1;
  const maxFeedPositions = 12;
  for (const a of adverts) {
    const existing = await Campaign.findOne({
      slot: 'feed',
      advertiserId,
      name: a.name,
    });
    if (existing) {
      console.log('  Skip (already exists):', a.name);
      continue;
    }
    await Campaign.create({
      advertiserId,
      name: a.name,
      slot: 'feed',
      creative: a.image || '/assets/image.jpg',
      destinationUrl: a.url,
      startDate: a.createdAt ? new Date(a.createdAt) : now,
      endDate: endDefault,
      status: 'active',
      isVisible: true,
      clicks: a.clickCount || 0,
      position: Math.min(position, maxFeedPositions),
      description: a.description || '',
      buttonText: a.buttonText || 'Visit Site',
    });
    console.log('  Created feed campaign:', a.name, 'position', position);
    position++;
  }
  console.log('✅ Migration done. Feed is now driven by Advertisers (Campaigns).');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
