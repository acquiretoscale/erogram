/**
 * One-time migration: drop the partial unique index on (slot, feedTier, tierSlot)
 * from the campaigns collection. This allows multiple campaigns (A/B variants)
 * to share the same feed position.
 *
 * Usage:  node --env-file=.env.local --import tsx scripts/drop-feed-unique-index.ts
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI as string);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db!;
  const collection = db.collection('campaigns');

  const indexes = await collection.indexes();
  console.log('Current indexes on campaigns:');
  for (const idx of indexes) {
    console.log(`  ${idx.name}  keys=${JSON.stringify(idx.key)}  unique=${idx.unique ?? false}`);
  }

  const target = indexes.find(
    (idx) =>
      idx.key &&
      (idx.key as Record<string, number>).slot === 1 &&
      (idx.key as Record<string, number>).feedTier === 1 &&
      (idx.key as Record<string, number>).tierSlot === 1 &&
      idx.unique === true
  );

  if (!target) {
    console.log('\nNo unique index on (slot, feedTier, tierSlot) found — already dropped or never existed.');
  } else {
    console.log(`\nDropping unique index: ${target.name}`);
    await collection.dropIndex(target.name!);
    console.log('Dropped successfully.');
  }

  const campaigns = await collection.countDocuments({ slot: 'feed' });
  console.log(`\nFeed campaigns in DB: ${campaigns} (unchanged)`);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
