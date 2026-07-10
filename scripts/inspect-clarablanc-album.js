/* eslint-disable */
// READ-ONLY: show clarablanc's full album, which are paused, and what the rotating pool sends
// (album + stable albumIdx) — so we can confirm #1/#2 actually rotate and tag correctly.
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const trending = db.collection('trendingofcreators');
  const ofc = db.collection('onlyfanscreators');

  const s = await trending.findOne({ username: /^clarablanc$/i });
  const c = await ofc.findOne({ username: /^clarablanc$/i }, { projection: { avatar: 1, extraPhotos: 1 } });
  const full = [c.avatar, ...((c.extraPhotos) || [])].filter(Boolean);
  const paused = new Set(s.pausedImageUrls || []);

  console.log('FULL ALBUM (index = the :v tag):');
  full.forEach((u, i) => console.log(`  #${i} ${paused.has(u) ? '[PAUSED]' : '[LIVE]  '} ${u.slice(0, 80)}`));

  const album = [], albumIdx = [];
  full.forEach((u, i) => { if (!paused.has(u)) { album.push(u); albumIdx.push(i); } });
  console.log('\nROTATING POOL sent to cards (these rotate per refresh):');
  album.forEach((u, p) => console.log(`  pool[${p}] -> stable #${albumIdx[p]}  ${u.slice(0, 70)}`));
  console.log(`\nPool size = ${album.length} → ${album.length > 1 ? 'ROTATES' : 'single image, no rotation'}`);

  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
