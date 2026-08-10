import 'dotenv/config';
import connectDB from '../lib/db/mongodb';
import { OnlyFansCreator } from '../lib/models';

function sample(arr: any[], n = 5) {
  return arr.slice(0, n).map(c => `${c.username} | ${c.likesCount ?? 0} likes | free=${!!c.isFree}`);
}

async function main() {
  await connectDB();
  const all = await OnlyFansCreator.find({ deleted: { $ne: true }, username: /free/i })
    .select('username likesCount isFree url')
    .sort({ likesCount: 1 })
    .lean() as any[];

  const dotFree = all.filter(c => /\.free$/i.test(c.username));
  const otherFree = all.filter(c => !/\.free$/i.test(c.username));
  const endsFree = all.filter(c => /free$/i.test(c.username) && !/\.free$/i.test(c.username));
  const midFree = all.filter(c => /free/i.test(c.username) && !/free$/i.test(c.username));

  const bands = [
    ['under1k', (c: any) => (c.likesCount ?? 0) < 1000],
    ['1k-4k', (c: any) => (c.likesCount ?? 0) >= 1000 && (c.likesCount ?? 0) <= 4000],
    ['4k-50k', (c: any) => (c.likesCount ?? 0) > 4000 && (c.likesCount ?? 0) <= 50000],
    ['50k+', (c: any) => (c.likesCount ?? 0) > 50000],
  ] as const;

  console.log('=== HANDLE TYPE ===');
  console.log('ends .free (n=' + dotFree.length + '):');
  console.log(sample(dotFree, 5).join('\n'));
  console.log('\nends free but not .free (n=' + endsFree.length + '):');
  console.log(sample(endsFree, 5).join('\n'));
  console.log('\nfree in middle of handle (n=' + midFree.length + '):');
  console.log(sample(midFree, 5).join('\n'));

  console.log('\n=== LIKES BAND (all free-handle) ===');
  for (const [name, fn] of bands) {
    const bucket = all.filter(fn);
    console.log(`\n${name} (n=${bucket.length}):`);
    console.log(sample(bucket.sort((a,b)=>(b.likesCount??0)-(a.likesCount??0)), 5).join('\n'));
  }
  process.exit(0);
}
main();
