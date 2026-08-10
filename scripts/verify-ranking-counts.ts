import 'dotenv/config';
import connectDB from '../lib/db/mongodb';
import { OnlyFansCreator } from '../lib/models';
import { buildSlugCreatorMatch } from '../lib/tags/creatorMatch';

async function main() {
  await connectDB();
  for (const slug of ['blonde', 'redhead', 'brunette']) {
    const total = await OnlyFansCreator.countDocuments(buildSlugCreatorMatch(slug) as any);
    const band = await OnlyFansCreator.countDocuments({ ...(buildSlugCreatorMatch(slug) as any), likesCount: { $gte: 1000, $lte: 4000 } });
    console.log(`${slug}: eligible ${total}, of which 1K-4K ${band}`);
  }
  process.exit(0);
}
main();
