import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
if (!uri) { console.log('NO MONGODB_URI'); process.exit(1); }
await mongoose.connect(uri);
const Campaign = mongoose.connection.collection('campaigns');
const docs = await Campaign.find({ status: 'active' }, { projection: { name:1, targetCountries:1, geoPinned:1, placements:1, videoUrl:1 } }).toArray();
for (const d of docs) {
  console.log(JSON.stringify({ name: d.name, targetCountries: d.targetCountries ?? null, geoPinned: d.geoPinned ?? null, hasVideo: !!d.videoUrl, placements: d.placements }));
}
console.log('TOTAL active:', docs.length);
await mongoose.disconnect();
