import 'dotenv/config';
import connectDB from '../lib/db/mongodb';
import { OnlyFansCreator } from '../lib/models';

async function main() {
  await connectDB();
  const base = { deleted: { $ne: true } };
  const dotFree = await OnlyFansCreator.countDocuments({ ...base, username: /\.free$/i });
  const hasFree = await OnlyFansCreator.countDocuments({ ...base, username: /free/i });
  const endsFree = await OnlyFansCreator.countDocuments({ ...base, username: /free$/i });
  const containsFreeNotDot = await OnlyFansCreator.countDocuments({
    ...base,
    username: /free/i,
    username: { $not: /\.free$/i, $regex: /free/i },
  });

  const all = await OnlyFansCreator.find({ ...base, username: /free/i })
    .select('username likesCount categories isFree')
    .lean() as any[];

  const dotFreeList = all.filter(c => /\.free$/i.test(c.username));
  const otherFree = all.filter(c => !/\.free$/i.test(c.username));

  const band = (arr: any[]) => ({
    under1k: arr.filter(c => (c.likesCount ?? 0) < 1000).length,
    k1to4k: arr.filter(c => (c.likesCount ?? 0) >= 1000 && (c.likesCount ?? 0) <= 4000).length,
    k4to50k: arr.filter(c => (c.likesCount ?? 0) > 4000 && (c.likesCount ?? 0) <= 50000).length,
    over50k: arr.filter(c => (c.likesCount ?? 0) > 50000).length,
    whale180k: arr.filter(c => (c.likesCount ?? 0) >= 180000).length,
  });

  console.log('TOTAL with "free" in username:', all.length);
  console.log('Ends with .free:', dotFreeList.length);
  console.log('Has free but NOT .free ending:', otherFree.length);
  console.log('Ends with free (any):', endsFree);
  console.log('Likes band — ALL free-handle:', JSON.stringify(band(all)));
  console.log('Likes band — .free ending:', JSON.stringify(band(dotFreeList)));
  console.log('Likes band — other free in handle:', JSON.stringify(band(otherFree)));

  const bigSmall = dotFreeList.filter(c => (c.likesCount ?? 0) <= 4000).slice(0, 15);
  console.log('Sample .free accounts <=4K likes:', bigSmall.map(c => `${c.username} (${c.likesCount})`).join(', '));

  process.exit(0);
}
main();
