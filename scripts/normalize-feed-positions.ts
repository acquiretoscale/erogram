/**
 * One-time migration: compact all feed campaign positions so active ads
 * are numbered 1, 2, 3… with no gaps, and inactive ads follow after.
 *
 * Run from erogram-v2:
 *   npx tsx scripts/normalize-feed-positions.ts
 *   npx tsx scripts/normalize-feed-positions.ts "mongodb+srv://..."
 */
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const cliUri = process.argv[2];
if (cliUri) process.env.MONGODB_URI = cliUri;

const FEED_TIER_POSITIONS: Record<number, number[]> = {
  1: [3, 6, 9, 12],
  2: [15, 18, 21, 24],
  3: [27, 30, 33, 36],
};

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI.');
    process.exit(1);
  }
  const { default: connectDB } = await import('../lib/db/mongodb');
  const { Campaign } = await import('../lib/models');
  await connectDB();
  console.log('Connected to MongoDB\n');

  const allFeed = await (Campaign as any).find({ slot: 'feed' })
    .select('_id name status position feedTier tierSlot')
    .lean();

  console.log(`Feed campaigns found: ${allFeed.length}`);

  const withKey = allFeed.map((c: any) => {
    const tier = c.feedTier as number | null;
    const slot = c.tierSlot as number | null;
    const stored = c.position != null ? Number(c.position) : 999;
    const tierPos = tier != null ? FEED_TIER_POSITIONS[tier] : null;
    const sortKey =
      tierPos != null && slot != null && slot >= 1 && slot <= 4 && tierPos[slot - 1] != null
        ? tierPos[slot - 1]
        : stored;
    return { c, sortKey, isActive: c.status === 'active' };
  });

  withKey.sort((a: any, b: any) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.sortKey - b.sortKey;
  });

  const bulkOps = withKey.map((item: any, i: number) => ({
    updateOne: {
      filter: { _id: item.c._id },
      update: { $set: { position: i + 1 } },
    },
  }));

  await (Campaign as any).bulkWrite(bulkOps);

  console.log('\nNew order:');
  withKey.forEach((item: any, i: number) => {
    const displaySlot = item.isActive ? ` → slot ${(withKey.filter((x: any) => x.isActive).indexOf(item) + 1) * 5}` : ' (inactive)';
    console.log(`  #${i + 1} [${item.c.status}] "${item.c.name}"${displaySlot}`);
  });

  console.log('\nDone. Feed positions normalized.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
