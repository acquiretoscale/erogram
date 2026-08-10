import 'dotenv/config';
import connectDB from '../lib/db/mongodb';
import { OnlyFansCreator } from '../lib/models';

async function main() {
  await connectDB();
  const rows = await OnlyFansCreator.find({
    deleted: { $ne: true },
    username: /free/i,
    likesCount: { $gt: 4000, $lte: 50000 },
  })
    .select('username likesCount')
    .sort({ likesCount: -1 })
    .lean() as any[];
  for (const r of rows) {
    console.log(`http://127.0.0.1:3939/onlyfanssearch/${r.username} (${r.likesCount})`);
  }
  console.log('TOTAL', rows.length);
  process.exit(0);
}
main();
