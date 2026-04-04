const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const col = db.collection('onlyfanscreators');

  const fixes = [
    { username: 'waifumiia',   likesCount: 5405685 },
    { username: 'miamalkova',  likesCount: 3721932 },
    { username: 'violetmyers', likesCount: 2717197 },
    { username: 'virtual_lady',likesCount: 77717   },
  ];

  for (const fix of fixes) {
    const before = await col.findOne({ username: fix.username }, { projection: { username: 1, likesCount: 1 } });
    const result = await col.updateOne(
      { username: fix.username },
      { $set: { likesCount: fix.likesCount } }
    );
    console.log(`${fix.username}: ${before?.likesCount ?? 'not found'} -> ${fix.likesCount} (matched: ${result.matchedCount}, modified: ${result.modifiedCount})`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
