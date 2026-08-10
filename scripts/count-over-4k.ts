import 'dotenv/config';
import connectDB from '../lib/db/mongodb';
import { OnlyFansCreator } from '../lib/models';

async function main() {
  await connectDB();
  const base = { deleted: { $ne: true } };
  const over4k = await OnlyFansCreator.countDocuments({ ...base, likesCount: { $gt: 4000 } });
  const over4kFemale = await OnlyFansCreator.countDocuments({ ...base, likesCount: { $gt: 4000 }, gender: 'female' });
  const whale180k = await OnlyFansCreator.countDocuments({ ...base, likesCount: { $gte: 180000 } });
  const k4to50k = await OnlyFansCreator.countDocuments({ ...base, likesCount: { $gt: 4000, $lte: 50000 } });
  const k50to180k = await OnlyFansCreator.countDocuments({ ...base, likesCount: { $gt: 50000, $lt: 180000 } });
  const total = await OnlyFansCreator.countDocuments(base);
  console.log('TOTAL creators:', total);
  console.log('OVER 4K likes:', over4k);
  console.log('OVER 4K female:', over4kFemale);
  console.log('4K-50K:', k4to50k);
  console.log('50K-180K:', k50to180k);
  console.log('180K+ whale:', whale180k);
  process.exit(0);
}
main();
