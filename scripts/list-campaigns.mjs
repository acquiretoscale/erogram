#!/usr/bin/env node
/**
 * List all campaigns in the DB. Run: node scripts/list-campaigns.mjs
 * Use this to verify your banner campaign has slot "top-banner".
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Set MONGODB_URI in .env.local');
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const campaigns = await db.collection('campaigns').find({}).sort({ createdAt: -1 }).toArray();

  console.log('Total campaigns:', campaigns.length);
  console.log('');
  campaigns.forEach((c, i) => {
    console.log(`${i + 1}. name="${c.name}" slot="${c.slot}" status=${c.status} isVisible=${c.isVisible}`);
    console.log('   creative:', (c.creative || '').slice(0, 80) + (c.creative && c.creative.length > 80 ? '...' : ''));
    console.log('   startDate:', c.startDate);
    console.log('   endDate:', c.endDate);
    console.log('');
  });

  const topBanner = campaigns.filter((c) => c.slot === 'top-banner');
  console.log('--- Campaigns with slot "top-banner":', topBanner.length);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
