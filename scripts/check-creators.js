/* eslint-disable */
// READ-ONLY. Picks 10 random creators, hits each URL, reports status + title.
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const BASE = 'http://127.0.0.1:3939';

async function hit(url) {
  const start = Date.now();
  const res = await fetch(url, { headers: { 'user-agent': 'local-smoke-test' } });
  const text = await res.text();
  const ms = Date.now() - start;
  const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '(no title)';
  const hasProfile = text.includes('CreatorProfileClient') || text.includes('creator.url') || text.includes('OnlyFans');
  const isNotFound = /Page Not Found|notFound|Not Found/i.test(title);
  return { status: res.status, ms, title, isNotFound, hasProfile };
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const col = mongoose.connection.db.collection('onlyfanscreators');

  // 3 admin-imported + 7 scraped
  const admin = await col.aggregate([
    { $match: { adminImported: true, deleted: { $ne: true }, avatar: { $ne: '' } } },
    { $sample: { size: 3 } },
    { $project: { name: 1, username: 1, slug: 1 } },
  ]).toArray();

  const scraped = await col.aggregate([
    { $match: { adminImported: { $ne: true }, deleted: { $ne: true }, avatar: { $ne: '' } } },
    { $sample: { size: 7 } },
    { $project: { name: 1, username: 1, slug: 1 } },
  ]).toArray();

  const picks = [...admin, ...scraped];
  // Always include Felline for sanity
  const felline = await col.findOne({ username: 'felline' }, { projection: { name: 1, username: 1, slug: 1 } });
  if (felline) picks.unshift({ ...felline, kind: 'felline' });

  console.log('\n== Hitting local /{slug}-onlyfans for each creator ==\n');
  for (let i = 0; i < picks.length; i++) {
    const c = picks[i];
    const urlSlug = c.slug.endsWith('-onlyfans') ? c.slug : `${c.slug}-onlyfans`;
    const url = `${BASE}/${urlSlug}`;
    try {
      const r = await hit(url);
      const verdict = r.status === 200 && !r.isNotFound ? 'RENDERED' : (r.isNotFound ? '404 PAGE' : `HTTP ${r.status}`);
      console.log(`  ${String(i + 1).padStart(2)}. [${verdict}]  ${url}`);
      console.log(`      name=${c.name}  db_slug=${c.slug}  ${r.ms}ms`);
      console.log(`      title: ${r.title}`);
    } catch (e) {
      console.log(`  ${i + 1}. [ERROR] ${url} -> ${e.message}`);
    }
  }

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
