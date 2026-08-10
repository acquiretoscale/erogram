import mongoose from 'mongoose';

const connectDB = (await import('../lib/db/mongodb.js')).default;
const { OnlyFansCreator } = await import('../lib/models/index.js');

await connectDB();

const q = {
  deleted: { $ne: true },
  categories: { $in: ['arab', 'muslim', 'hijabi', 'moroccan', 'turkish'] },
  $or: [{ avatar: '' }, { avatar: null }, { avatar: { $exists: false } }],
};

const totalBefore = await OnlyFansCreator.countDocuments({ deleted: { $ne: true } });
const toDelete = await OnlyFansCreator.countDocuments(q);
const res = await OnlyFansCreator.deleteMany(q);
const totalAfter = await OnlyFansCreator.countDocuments({ deleted: { $ne: true } });

console.log(JSON.stringify({ deleted: res.deletedCount, matched: toDelete, totalBefore, totalAfter }, null, 2));
process.exit(0);
