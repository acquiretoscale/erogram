/**
 * One-time script: mark Lovescape as featured in AINsfwToolStats
 * and create the associated Campaign for impression/click tracking.
 *
 * Usage: node scripts/feature-lovescape.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const SLUG = 'ai-girlfriend-lovescape';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const statsCol = mongoose.connection.collection('ainsfwtoolstats');
  const campaignsCol = mongoose.connection.collection('campaigns');
  const advertisersCol = mongoose.connection.collection('advertisers');

  // Ensure the "AI NSFW Featured" advertiser exists
  let advertiser = await advertisersCol.findOne({ name: 'AI NSFW Featured' });
  if (!advertiser) {
    const res = await advertisersCol.insertOne({
      name: 'AI NSFW Featured',
      email: 'internal@erogram.pro',
      company: 'Internal',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    advertiser = { _id: res.insertedId };
    console.log('Created AI NSFW Featured advertiser');
  }

  // Check if already featured
  const existing = await statsCol.findOne({ slug: SLUG });
  if (existing?.featured && existing?.campaignId) {
    console.log(`${SLUG} is already featured with campaignId ${existing.campaignId}`);
    await mongoose.disconnect();
    return;
  }

  // Create campaign for tracking
  const now = new Date();
  const endDate = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
  const campaignRes = await campaignsCol.insertOne({
    advertiserId: advertiser._id,
    name: `Featured NSFW: ${SLUG}`,
    internalName: SLUG,
    slot: 'ainsfw',
    creative: '',
    destinationUrl: `/${SLUG}`,
    startDate: now,
    endDate,
    status: 'active',
    isVisible: true,
    adType: 'featured-nsfw',
    description: `Featured AI NSFW tool: ${SLUG}`,
    buttonText: 'Try Now',
    impressions: 0,
    clicks: 0,
    createdAt: now,
    updatedAt: now,
  });
  console.log(`Created campaign: ${campaignRes.insertedId}`);

  // Upsert the stats doc with featured + some initial upvotes
  await statsCol.updateOne(
    { slug: SLUG },
    {
      $set: {
        featured: true,
        campaignId: campaignRes.insertedId,
        updatedAt: now,
      },
      $setOnInsert: {
        upvotes: 12,
        downvotes: 0,
        reviews: [],
        createdAt: now,
      },
    },
    { upsert: true },
  );
  console.log(`${SLUG} is now featured`);

  await mongoose.disconnect();
  console.log('Done');
}

main().catch((err) => { console.error(err); process.exit(1); });
