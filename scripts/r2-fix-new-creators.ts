import 'dotenv/config';
import connectDB from '../lib/db/mongodb';
import { OnlyFansCreator } from '../lib/models';
import { processCreatorImages } from '../lib/actions/creatorImages';

async function main() {
  await connectDB();
  const since = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const docs = await OnlyFansCreator.find({ scrapedAt: { $gte: since } }).select('slug avatar').lean() as any[];
  console.log('candidates', docs.length);
  let ok = 0, fail = 0;
  for (const d of docs) {
    try {
      const r = await processCreatorImages(d.slug);
      if (r.avatarR2) { ok++; } else { fail++; console.log('no avatar', d.slug, r.error || ''); }
    } catch (e: any) { fail++; console.log('err', d.slug, e.message); }
  }
  console.log('R2 OK', ok, 'FAILED', fail);
  process.exit(0);
}
main();
