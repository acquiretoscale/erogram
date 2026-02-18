/**
 * Seed script: Pre-populate Navbar CTA and Join page CTA with the current
 * Lovescape buttons that are live on the website (so Advertiser admin shows 1/1 filled).
 *
 * Run: node scripts/seed-cta-campaigns.mjs
 * Uses MONGODB_URI from .env.local or env.
 */

import dotenv from 'dotenv';
import dns from 'node:dns';

// Load .env.local so MONGODB_URI is available when run from project root
dotenv.config({ path: '.env.local' });
dotenv.config();
import mongoose from 'mongoose';

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Set MONGODB_URI in .env.local or env');
  process.exit(1);
}

const LOVESCAPE_URL =
  'https://lovescape.com/create-ai-sex-girlfriend/style?userId=5ebe4f139af9bcff39155f3e9f06fbce233415fd82fd4da2a9c51ea0921d4c0e&sourceId=Erogram&creativeId=6step_hent&p1=test';

async function run() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  const advertisers = db.collection('advertisers');
  const campaigns = db.collection('campaigns');

  console.log('Connected to MongoDB.\n');

  // 1. Find or create Lovescape advertiser
  let love = await advertisers.findOne({ name: 'Lovescape' });
  if (!love) {
    const res = await advertisers.insertOne({
      name: 'Lovescape',
      email: 'partners@lovescape.com',
      company: 'Lovescape (AI Girlfriend)',
      logo: '',
      notes: 'AI girlfriend platform. Navbar & Join page CTAs.',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    love = { _id: res.insertedId };
    console.log('Created Lovescape advertiser:', love._id.toString());
  } else {
    console.log('Lovescape advertiser exists:', love._id.toString());
  }

  const loveId = love._id;
  const now = new Date();
  const oneYearLater = new Date(now.getTime() + 365 * 86400000);

  // 2. Navbar CTA – same as site default
  const existingNavbar = await campaigns.findOne({
    slot: 'navbar-cta',
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now },
  });
  if (!existingNavbar) {
    await campaigns.insertOne({
      advertiserId: loveId,
      name: 'Navbar CTA (Meet your AI…)',
      slot: 'navbar-cta',
      creative: '',
      destinationUrl: LOVESCAPE_URL,
      startDate: now,
      endDate: oneYearLater,
      status: 'active',
      isVisible: true,
      impressions: 0,
      clicks: 0,
      description: '🫦 Meet Your AI slut',
      buttonText: '🫦 Meet Your AI slut',
      createdAt: now,
      updatedAt: now,
    });
    console.log('Created Navbar CTA campaign (Lovescape).');
  } else {
    console.log('Navbar CTA campaign already exists.');
  }

  // 3. Join page CTA – same as site default
  const existingJoin = await campaigns.findOne({
    slot: 'join-cta',
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now },
  });
  if (!existingJoin) {
    await campaigns.insertOne({
      advertiserId: loveId,
      name: 'Join page CTA (Build your AI girlfriend…)',
      slot: 'join-cta',
      creative: '',
      destinationUrl: LOVESCAPE_URL,
      startDate: now,
      endDate: oneYearLater,
      status: 'active',
      isVisible: true,
      impressions: 0,
      clicks: 0,
      description: 'Build your own AI girlfriend 💖',
      buttonText: 'Build your own AI girlfriend 💖',
      createdAt: now,
      updatedAt: now,
    });
    console.log('Created Join page CTA campaign (Lovescape).');
  } else {
    console.log('Join page CTA campaign already exists.');
  }

  console.log('\nDone. Advertiser admin should now show Navbar CTA and Join page CTA as 1/1 filled.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
