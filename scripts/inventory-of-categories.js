/* eslint-disable */
// READ-ONLY: inventory of OnlyFans creator categories + location/gender distribution.
// Answers: what categories exist, how many creators each has, and what we could build.
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const R2 = process.env.R2_PUBLIC_URL || '';
let avatarMatch = { $ne: '' };
try { if (R2) { const host = new URL(R2).host; avatarMatch = { $regex: host, $options: 'i' }; } } catch {}

async function main() {
  await mongoose.connect(MONGO_URI);
  const ofc = mongoose.connection.db.collection('onlyfanscreators');

  const totalAll = await ofc.estimatedDocumentCount();
  const baseMatch = { avatar: avatarMatch, gender: 'female', categories: { $exists: true, $ne: [] }, deleted: { $ne: true } };
  const servable = await ofc.countDocuments(baseMatch);

  console.log(`TOTAL creators in DB: ${totalAll}`);
  console.log(`SERVABLE (female + R2 avatar + has categories + not deleted): ${servable}\n`);

  console.log('=== CATEGORY INVENTORY (servable creators) ===');
  const cats = await ofc.aggregate([
    { $match: baseMatch },
    { $unwind: '$categories' },
    { $group: { _id: '$categories', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray();
  console.log(`Distinct category values: ${cats.length}`);
  cats.forEach((c) => console.log(`  ${String(c.count).padStart(6)}  ${c._id}`));

  console.log('\n=== LOCATION INVENTORY (top 40, for country top-10s) ===');
  const locs = await ofc.aggregate([
    { $match: { ...baseMatch, location: { $ne: '' } } },
    { $group: { _id: '$location', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 40 },
  ]).toArray();
  locs.forEach((l) => console.log(`  ${String(l.count).padStart(6)}  ${l._id}`));

  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
