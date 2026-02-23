/**
 * One-time migration: find all campaigns whose destinationUrl starts with
 * https://lovescape.com/ and assign (or create) a "Lovescape" advertiser.
 *
 * Run from erogram-v2 (uses MONGODB_URI from .env.local, or pass URI as first arg):
 *   npx tsx scripts/assign-lovescape-advertiser.ts
 *   npx tsx scripts/assign-lovescape-advertiser.ts "mongodb+srv://..."
 */
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const cliUri = process.argv[2];
if (cliUri) process.env.MONGODB_URI = cliUri;

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI. Set it in erogram-v2/.env.local or pass as first argument.');
    process.exit(1);
  }

  const { default: connectDB } = await import('../lib/db/mongodb');
  const { Advertiser, Campaign } = await import('../lib/models');

  await connectDB();
  console.log('Connected to MongoDB\n');

  // 1) Ensure Lovescape advertiser exists
  let lovescape = await (Advertiser as any).findOne({ name: /^lovescape$/i }).lean();
  if (!lovescape) {
    const created = await (Advertiser as any).create({
      name: 'Lovescape',
      email: 'lovescape@erogram.pro',
      company: 'Lovescape',
      status: 'active',
    });
    lovescape = created.toObject();
    console.log('Created advertiser: Lovescape');
  } else {
    console.log(`Using existing advertiser: ${(lovescape as any).name} (${(lovescape as any)._id})`);
  }
  const lovescapeId = (lovescape as any)._id;

  // 2) Find all campaigns with destinationUrl starting with https://lovescape.com/
  const campaigns = await (Campaign as any)
    .find({ destinationUrl: { $regex: /^https?:\/\/(www\.)?lovescape\.com/i } })
    .lean();

  console.log(`\nCampaigns matching lovescape.com: ${campaigns.length}`);
  if (campaigns.length === 0) {
    console.log('Nothing to update.');
    process.exit(0);
  }

  for (const c of campaigns) {
    await (Campaign as any).updateOne(
      { _id: c._id },
      { $set: { advertiserId: lovescapeId } }
    );
    console.log(`  Assigned "${c.name}" (${c.slot}) -> Lovescape`);
  }

  console.log(`\nDone. ${campaigns.length} campaign(s) assigned to Lovescape.`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
