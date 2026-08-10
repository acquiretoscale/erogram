/**
 * FAST: import under-2K blonde/brunette/redhead from existing Apify igola runs.
 * No new paid scrape. Usage: npx tsx --env-file=.env.local scripts/import-hair-2k-from-apify-runs.mjs
 */
import mongoose from 'mongoose';
import fs from 'fs';

const CATS = ['blonde', 'brunette', 'redhead'];
const TARGET = 20;
const LIKES_MAX = 2000;
const ACTOR = 'igolaizola~onlyfans-scraper';

function slugify(u) {
  return String(u)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
function parseLikes(v) {
  if (typeof v === 'number') return v;
  const s = String(v || '0').replace(/,/g, '').trim();
  const m = s.match(/^([0-9.]+)\s*([KkMm]?)$/);
  if (!m) return parseInt(s, 10) || 0;
  const n = parseFloat(m[1]);
  const suf = (m[2] || '').toUpperCase();
  if (suf === 'M') return Math.round(n * 1e6);
  if (suf === 'K') return Math.round(n * 1e3);
  return Math.round(n);
}

async function main() {
  const connectDB = (await import('../lib/db/mongodb.js')).default;
  const { OnlyFansCreator } = await import('../lib/models/index.js');
  const { processCreatorImages } = await import('../lib/actions/creatorImages.js');

  await connectDB();
  const db = mongoose.connection.db;
  const s = await db.collection('ofmsettings').findOne({ key: 'default' });
  const keys = (s.apifyKeys || []).filter((k) => k.active && !k.burned).map((k) => k.apiKey);
  const key = keys.find((k) => k.endsWith('R2A6')) || keys[0];
  if (!key) throw new Error('No Apify key');

  const list = await (
    await fetch(`https://api.apify.com/v2/acts/${ACTOR}/runs?token=${key}&limit=30&desc=1`)
  ).json();
  const runs = list.data?.items || [];
  console.log(`Found ${runs.length} igola runs`);

  const pools = { blonde: new Map(), brunette: new Map(), redhead: new Map() };

  for (const r of runs) {
    if (r.status !== 'SUCCEEDED' || !r.defaultDatasetId) continue;

    let input = null;
    try {
      const meta = await (await fetch(`https://api.apify.com/v2/actor-runs/${r.id}?token=${key}`)).json();
      const storeId = meta.data?.defaultKeyValueStoreId;
      if (storeId) {
        const inpRes = await fetch(
          `https://api.apify.com/v2/key-value-stores/${storeId}/records/INPUT?token=${key}`,
        );
        if (inpRes.ok) input = await inpRes.json();
      }
    } catch {}

    const cat = String(input?.category || input?.keyword || '').toLowerCase();
    if (!CATS.includes(cat)) {
      console.log(`skip ${r.id} cat=${cat}`);
      continue;
    }

    const dsRes = await fetch(
      `https://api.apify.com/v2/datasets/${r.defaultDatasetId}/items?token=${key}&limit=500`,
    );
    const items = await dsRes.json();
    if (!Array.isArray(items)) {
      console.log(`bad dataset ${r.id}`, JSON.stringify(items).slice(0, 120));
      continue;
    }

    let under = 0;
    for (const it of items) {
      if (!it?.username) continue;
      const likes = parseLikes(it.likes);
      if (likes >= LIKES_MAX) continue;
      under++;
      const prev = pools[cat].get(it.username.toLowerCase());
      if (!prev || likes < prev.likes) pools[cat].set(it.username.toLowerCase(), { ...it, likes });
    }
    console.log(`${cat} ${r.id}: raw ${items.length}, under2k ${under}, pool ${pools[cat].size}`);
  }

  const summary = {};
  for (const cat of CATS) {
    const list2 = [...pools[cat].values()].sort((a, b) => a.likes - b.likes).slice(0, TARGET);
    let saved = 0;
    for (const it of list2) {
      const slug = slugify(it.username);
      const price = typeof it.price === 'number' ? it.price : parseFloat(String(it.price || '0')) || 0;
      await OnlyFansCreator.findOneAndUpdate(
        { slug },
        {
          $set: {
            name: it.name || it.username,
            username: it.username,
            slug,
            avatar: it.image || it.images?.[0]?.url || '',
            header: it.images?.length > 1 ? it.images[1].url : '',
            bio: (it.description || '').slice(0, 500),
            gender: 'female',
            price,
            isFree: price === 0 || it.price == null || it.price === 'Free',
            likesCount: it.likes,
            location: [it.city, it.state, it.country].filter(Boolean).join(', '),
            lastSeen: it.lastSeen || '',
            scrapedAt: new Date(),
            adminImported: true,
          },
          $addToSet: { categories: cat },
          $setOnInsert: { url: it.link || `https://onlyfans.com/${it.username}` },
        },
        { upsert: true, strict: false },
      );
      try {
        await processCreatorImages(slug);
      } catch {}
      saved++;
      console.log(`[${cat}] ${saved}/${TARGET} @${it.username} likes=${it.likes}`);
    }
    summary[cat] = { pool: pools[cat].size, saved };
    console.log(`→ ${cat}: ${saved}/${TARGET}`);
    console.log(`  http://127.0.0.1:3939/onlyfanssearch/top-10-${cat}-onlyfans-models`);
  }

  fs.writeFileSync(
    '/Users/themaf/Desktop/Lists/hair-2k-import.json',
    JSON.stringify({ at: new Date().toISOString(), summary, pools: Object.fromEntries(CATS.map((c) => [c, [...pools[c].values()].map((x) => ({ u: x.username, likes: x.likes }))])) }, null, 2),
  );
  console.log('\nDONE', summary);
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
