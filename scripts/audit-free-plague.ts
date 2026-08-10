import 'dotenv/config';
import connectDB from '../lib/db/mongodb';
import { OnlyFansCreator } from '../lib/models';

async function main() {
  await connectDB();
  const q = { deleted: { $ne: true }, username: /free/i };
  const big = await OnlyFansCreator.find({ ...q, likesCount: { $gt: 4000 } })
    .select('username likesCount isFree scrapedAt createdAt adminImported featured categories source')
    .sort({ likesCount: -1 })
    .lean() as any[];

  console.log('FREE-HANDLE OVER 4K LIKES:', big.length);
  for (const c of big) {
    console.log([
      c.username,
      c.likesCount,
      'featured=' + !!c.featured,
      'adminImported=' + !!c.adminImported,
      'scraped=' + (c.scrapedAt ? new Date(c.scrapedAt).toISOString().slice(0,10) : 'none'),
      'created=' + (c.createdAt ? new Date(c.createdAt).toISOString().slice(0,10) : 'none'),
    ].join(' | '));
  }

  const exactly10k = big.filter(c => c.likesCount === 10000);
  console.log('\nEXACTLY 10000 likes:', exactly10k.length);

  const bands = [
    ['4k-10k', 4000, 10000],
    ['10k-50k', 10000, 50000],
    ['50k+', 50000, 999999999],
  ];
  for (const [label, lo, hi] of bands) {
    const n = await OnlyFansCreator.countDocuments({ ...q, likesCount: { $gt: lo, $lte: hi } });
    console.log(label + ':', n);
  }

  const recent = await OnlyFansCreator.countDocuments({
    ...q,
    likesCount: { $gt: 4000 },
    scrapedAt: { $gte: new Date('2026-08-10') },
  });
  console.log('\nOver 4K free-handle scraped today (Aug 10):', recent);

  process.exit(0);
}
main();
