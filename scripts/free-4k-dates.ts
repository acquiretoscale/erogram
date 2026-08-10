import 'dotenv/config';
import connectDB from '../lib/db/mongodb';
import { OnlyFansCreator } from '../lib/models';

async function main() {
  await connectDB();
  const rows = await OnlyFansCreator.find({
    deleted: { $ne: true },
    username: /free/i,
    likesCount: { $gt: 4000, $lte: 50000 },
  }).select('username likesCount createdAt scrapedAt').lean() as any[];

  const byDay: Record<string, number> = {};
  for (const r of rows) {
    const d = (r.createdAt || r.scrapedAt) ? new Date(r.createdAt || r.scrapedAt).toISOString().slice(0, 10) : 'unknown';
    byDay[d] = (byDay[d] || 0) + 1;
  }
  console.log('TOTAL', rows.length);
  console.log('BY ADD DATE (createdAt):');
  Object.entries(byDay).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([d,n])=>console.log(d, n));

  const oldest = rows.map(r=>({u:r.username,c:r.createdAt,s:r.scrapedAt})).sort((a,b)=>new Date(a.c||0).getTime()-new Date(b.c||0).getTime());
  const newest = [...oldest].reverse();
  console.log('\nOLDEST 5:');
  oldest.slice(0,5).forEach(r=>console.log(r.u, 'created', r.c?.toISOString?.().slice(0,10), 'scraped', r.s?.toISOString?.().slice(0,10)));
  console.log('\nNEWEST 5:');
  newest.slice(0,5).forEach(r=>console.log(r.u, 'created', r.c?.toISOString?.().slice(0,10), 'scraped', r.s?.toISOString?.().slice(0,10)));
  process.exit(0);
}
main();
