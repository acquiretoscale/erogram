/**
 * MongoDB storage audit — read-only.
 * Usage: node --env-file=.env.local scripts/mongo-storage-audit.mjs
 */
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Missing MONGODB_URI');
  process.exit(1);
}

function fmt(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  const dbStats = await db.command({ dbStats: 1, scale: 1 });
  console.log('=== DATABASE OVERVIEW ===');
  console.log(`Database: ${db.databaseName}`);
  console.log(`Data size:     ${fmt(dbStats.dataSize)}`);
  console.log(`Storage size:  ${fmt(dbStats.storageSize)}`);
  console.log(`Index size:    ${fmt(dbStats.indexSize)}`);
  console.log(`Total (data+idx): ${fmt(dbStats.dataSize + dbStats.indexSize)}`);
  console.log(`Collections:   ${dbStats.collections}`);
  console.log(`Documents:     ${dbStats.objects}`);
  console.log('');

  const collections = (await db.listCollections().toArray())
    .map((c) => c.name)
    .sort();

  const rows = [];
  for (const name of collections) {
    try {
      const stats = await db.command({ collStats: name, scale: 1 });
      rows.push({
        name,
        count: stats.count ?? 0,
        avgObj: stats.avgObjSize ?? 0,
        dataSize: stats.size ?? 0,
        storageSize: stats.storageSize ?? 0,
        indexSize: stats.totalIndexSize ?? 0,
        total: (stats.storageSize ?? 0) + (stats.totalIndexSize ?? 0),
      });
    } catch (e) {
      rows.push({ name, error: e.message });
    }
  }

  rows.sort((a, b) => (b.total ?? 0) - (a.total ?? 0));

  console.log('=== COLLECTIONS BY SIZE (storage + indexes) ===');
  for (const r of rows) {
    if (r.error) {
      console.log(`${r.name}: ERROR ${r.error}`);
      continue;
    }
    console.log(
      `${r.name.padEnd(32)} docs=${String(r.count).padStart(8)} avg=${fmt(r.avgObj).padStart(8)} data=${fmt(r.dataSize).padStart(10)} storage=${fmt(r.storageSize).padStart(10)} idx=${fmt(r.indexSize).padStart(10)} total=${fmt(r.total).padStart(10)}`
    );
  }
  console.log('');

  console.log('=== IMAGE / BINARY CHECKS ===');
  const imageCount = await db.collection('images').countDocuments();
  if (imageCount > 0) {
    const imageAgg = await db
      .collection('images')
      .aggregate([
        {
          $project: {
            dataLen: {
              $cond: [
                { $eq: [{ $type: '$data' }, 'binData'] },
                { $binarySize: '$data' },
                { $strLenBytes: { $ifNull: ['$data', ''] } },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalBytes: { $sum: '$dataLen' },
            avgBytes: { $avg: '$dataLen' },
            maxBytes: { $max: '$dataLen' },
          },
        },
      ])
      .toArray();
    const s = imageAgg[0] || {};
    console.log(
      `images: ${imageCount} docs, binary total ${fmt(s.totalBytes || 0)}, avg ${fmt(s.avgBytes || 0)}, max ${fmt(s.maxBytes || 0)}`
    );
  } else {
    console.log('images collection: 0 docs');
  }

  for (const [coll, field] of [
    ['groups', 'image'],
    ['bots', 'image'],
    ['adverts', 'image'],
    ['campaigns', 'creative'],
    ['articles', 'featuredImage'],
    ['onlyfanscreators', 'avatar'],
  ]) {
    const base64Count = await db.collection(coll).countDocuments({ [field]: { $regex: '^data:image/' } });
    if (!base64Count) continue;
    const agg = await db
      .collection(coll)
      .aggregate([
        { $match: { [field]: { $regex: '^data:image/' } } },
        { $project: { len: { $strLenBytes: `$${field}` } } },
        { $group: { _id: null, total: { $sum: '$len' }, avg: { $avg: '$len' }, max: { $max: '$len' } } },
      ])
      .toArray();
    const s = agg[0] || {};
    console.log(
      `${coll}.${field}: ${base64Count} base64, total ${fmt(s.total || 0)}, avg ${fmt(s.avg || 0)}, max ${fmt(s.max || 0)}`
    );
  }

  console.log('\n=== LARGE TEXT FIELDS ===');
  for (const [coll, field] of [
    ['onlyfanscreators', 'bio'],
    ['onlyfanscreators', 'rawBio'],
    ['onlyfanscreators', 'extraPhotos'],
    ['articles', 'content'],
    ['groups', 'image'],
    ['groups', 'description'],
  ]) {
    const agg = await db
      .collection(coll)
      .aggregate([
        { $match: { [field]: { $type: 'string', $ne: '' } } },
        { $project: { len: { $strLenBytes: `$${field}` } } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$len' }, avg: { $avg: '$len' }, max: { $max: '$len' } } },
      ])
      .toArray();
    const s = agg[0];
    if (!s) continue;
    console.log(`${coll}.${field}: ${s.count} docs, total ${fmt(s.total)}, avg ${fmt(s.avg)}, max ${fmt(s.max)}`);
  }

  const fsFiles = await db.collection('fs.files').countDocuments().catch(() => 0);
  const fsChunks = await db.collection('fs.chunks').countDocuments().catch(() => 0);
  console.log(`\nGridFS: fs.files=${fsFiles}, fs.chunks=${fsChunks}`);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  console.log('\n=== RECENT GROWTH (30d) ===');
  for (const name of [
    'trackingevents',
    'premiumevents',
    'campaignclicks',
    'campaignimpressiondailies',
    'searchqueries',
    'scraperuns',
  ]) {
    try {
      const total = await db.collection(name).countDocuments();
      if (!total) continue;
      const recent = await db.collection(name).countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
      console.log(`${name}: ${total} total, ${recent} last 30d`);
    } catch {}
  }

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
