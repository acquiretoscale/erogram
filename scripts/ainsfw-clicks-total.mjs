import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('Missing MONGODB_URI'); process.exit(1); }

const client = new MongoClient(uri);
await client.connect();
const db = client.db();
const col = db.collection('ainsfwsubmissions');

const [agg] = await col.aggregate([
  { $group: {
    _id: null,
    tools: { $sum: 1 },
    views: { $sum: { $ifNull: ['$views', 0] } },
    clicks: { $sum: { $ifNull: ['$clickCount', 0] } },
  } }
]).toArray();

const [approvedAgg] = await col.aggregate([
  { $match: { status: 'approved' } },
  { $group: {
    _id: null,
    tools: { $sum: 1 },
    views: { $sum: { $ifNull: ['$views', 0] } },
    clicks: { $sum: { $ifNull: ['$clickCount', 0] } },
  } }
]).toArray();

console.log('ALL:', agg);
console.log('APPROVED:', approvedAgg);

await client.close();
