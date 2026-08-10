import 'dotenv/config';
import connectDB from '../lib/db/mongodb';
import { OnlyFansCreator } from '../lib/models';
import { BEST_OF_PAGES } from '../app/best-onlyfans-accounts/bestOfPages';
import { buildBestOfCreatorMatch } from '../lib/tags/creatorMatch';

async function main() {
  await connectDB();
  const rows: { slug: string; label: string; type: string; count: number }[] = [];
  for (const page of BEST_OF_PAGES) {
    const count = await OnlyFansCreator.countDocuments(buildBestOfCreatorMatch(page) as any);
    rows.push({ slug: page.slug, label: page.label, type: page.type, count });
  }
  const under5 = rows.filter((r) => r.count < 5).sort((a, b) => a.count - b.count);
  const zero = under5.filter((r) => r.count === 0);
  console.log('TOTAL_PAGES', rows.length);
  console.log('UNDER_5', under5.length);
  console.log('ZERO', zero.length);
  console.log('--- UNDER 5 ---');
  for (const r of under5) console.log(`${r.count}\t${r.slug}\t${r.label}\t(${r.type})`);
  process.exit(0);
}
main();
