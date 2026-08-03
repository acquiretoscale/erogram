/* eslint-disable */
/**
 * EMERGENCY category restore — merges every recoverable source.
 * Does NOT wipe. Uses $addToSet then optional full replace for top-100 snapshot.
 *
 * Sources:
 *  1. tmp/top100-creators-social-clicks.csv (Jul 30 snapshot — 100 creators)
 *  2. tmp/DESTRUCTION-before-after-top100.csv (categories_BEFORE)
 *  3. ScrapeRun search rows (saved=1): add query tag to matching username
 *  4. ScrapeRun bulk/search rows: add query tag to creators scraped in run window
 *  5. Apify datasets still alive (runId on ScrapeRun)
 *
 * Run:  node scripts/restore-of-categories.js --dry-run
 * Apply: node scripts/restore-of-categories.js
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = path.join(__dirname, '..');

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { q = !q; continue; }
    if (ch === ',' && !q) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function splitTags(s) {
  if (!s) return [];
  return s.split(/[|,]/).map((t) => t.trim().toLowerCase()).filter(Boolean);
}

function loadTop100Csv() {
  const map = new Map();
  const file = path.join(ROOT, 'tmp/top100-creators-social-clicks.csv');
  if (!fs.existsSync(file)) return map;
  const lines = fs.readFileSync(file, 'utf8').split('\n').slice(1);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    const username = (cols[2] || '').trim().toLowerCase();
    const cats = splitTags(cols[10] || cols[cols.length - 1] || '');
    if (username && cats.length) map.set(username, cats);
  }
  return map;
}

function loadBeforeTop100Csv() {
  const map = new Map();
  const file = path.join(ROOT, 'tmp/DESTRUCTION-before-after-top100.csv');
  if (!fs.existsSync(file)) return map;
  const lines = fs.readFileSync(file, 'utf8').split('\n').slice(1);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    const username = (cols[2] || '').trim().toLowerCase();
    const cats = splitTags(cols[4] || '');
    if (username && cats.length) map.set(username, cats);
  }
  return map;
}

function mergeTagMaps(...maps) {
  const out = new Map();
  for (const m of maps) {
    for (const [u, tags] of m) {
      const prev = out.get(u) || [];
      const merged = [...new Set([...prev, ...tags])];
      out.set(u, merged);
    }
  }
  return out;
}

function slugify(u) {
  return u.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function buildScrapeRunTags(db) {
  const col = db.collection('onlyfanscreators');
  const runs = db.collection('scraperuns');
  const map = new Map();

  const allRuns = await runs.find({ saved: { $gt: 0 }, query: { $exists: true, $ne: '' } }).toArray();

  for (const run of allRuns) {
    const tag = (run.query || '').toLowerCase().trim();
    if (!tag) continue;

    // Direct username match for single-save search runs
    if (run.source === 'search' && run.saved === 1) {
      const creator = await col.findOne({
        $or: [
          { username: new RegExp(`^${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          { slug: slugify(tag) },
        ],
      });
      if (creator) {
        const u = creator.username.toLowerCase();
        const prev = map.get(u) || [];
        if (!prev.includes(tag)) map.set(u, [...prev, tag]);
      }
      continue;
    }

    // Skip bulk/multi-save runs — time-window matching tags thousands wrongly.
  }

  return map;
}

async function tryApifyTags(db, apiKey) {
  const map = new Map();
  if (!apiKey) return map;

  const runs = await db.collection('scraperuns').find({
    runId: { $nin: ['', null] },
    saved: { $gt: 0 },
    query: { $exists: true, $ne: '' },
  }).sort({ createdAt: -1 }).limit(200).toArray();

  let alive = 0;
  for (const run of runs) {
    try {
      const runRes = await fetch(`https://api.apify.com/v2/actor-runs/${run.runId}?token=${apiKey}`);
      if (!runRes.ok) continue;
      const runData = await runRes.json();
      const ds = runData.data?.defaultDatasetId;
      if (!ds) continue;

      const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${ds}/items?token=${apiKey}&limit=500`);
      if (!itemsRes.ok) continue;
      const items = await itemsRes.json();
      if (!Array.isArray(items) || !items.length) continue;
      alive++;

      const tag = (run.query || '').toLowerCase().trim();
      for (const item of items) {
        const username = (item.onlyfansUsername || item.username || '').toLowerCase();
        if (!username) continue;
        const prev = map.get(username) || [];
        const add = [tag];
        if (Array.isArray(item.category)) add.push(...item.category.map((x) => String(x).toLowerCase()));
        const merged = [...new Set([...prev, ...add.filter(Boolean)])];
        map.set(username, merged);
      }
    } catch {
      // skip expired datasets
    }
  }
  console.log(`Apify datasets still alive (of last 200 runs checked): ${alive}`);
  return map;
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing');
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const col = db.collection('onlyfanscreators');

  const settings = await db.collection('ofmsettings').findOne({ key: 'default' });
  const apiKey = settings?.apifyKeys?.find((k) => k.active && !k.burned)?.apiKey || process.env.APIFY_API_TOKEN;

  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE RESTORE ===');

  const top100 = mergeTagMaps(loadTop100Csv(), loadBeforeTop100Csv());
  console.log(`Top-100 snapshot tags: ${top100.size} creators`);

  console.log('Building tags from ScrapeRun logs...');
  const scrapeTags = await buildScrapeRunTags(db);
  console.log(`ScrapeRun-derived tags: ${scrapeTags.size} creators`);

  console.log('Checking Apify datasets...');
  const apifyTags = await tryApifyTags(db, apiKey);
  console.log(`Apify-derived tags: ${apifyTags.size} creators`);

  // Merge all sources per username
  const allUsers = new Set([...top100.keys(), ...scrapeTags.keys(), ...apifyTags.keys()]);
  let updated = 0;
  let tagsAdded = 0;
  let top100Full = 0;

  for (const username of allUsers) {
    const isTop100 = top100.has(username);
    const fromTop = top100.get(username) || [];
    const fromScrape = scrapeTags.get(username) || [];
    const fromApify = apifyTags.get(username) || [];

    let target;
    if (isTop100) {
      // Top 100: use snapshot as authoritative base, merge scrape/apify extras
      target = [...new Set([...fromTop, ...fromScrape, ...fromApify])];
      top100Full++;
    } else {
      // Everyone else: ADD recovered tags without wiping current
      target = null; // handled via $addToSet below
    }

    const creator = await col.findOne({
      $or: [
        { username: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        { slug: slugify(username) },
      ],
    });
    if (!creator) continue;

    if (isTop100 && target) {
      const before = creator.categories || [];
      if (DRY_RUN) {
        if (JSON.stringify(before.sort()) !== JSON.stringify(target.sort())) {
          console.log(`[top100] ${username}: ${before.join('|')} -> ${target.join('|')}`);
        }
      } else {
        await col.updateOne({ _id: creator._id }, { $set: { categories: target } });
      }
      updated++;
      tagsAdded += target.length;
    } else {
      const toAdd = [...new Set([...fromScrape, ...fromApify])].filter(Boolean);
      if (!toAdd.length) continue;
      if (DRY_RUN) {
        const merged = [...new Set([...(creator.categories || []), ...toAdd])];
        if (merged.length > (creator.categories || []).length) {
          console.log(`[add] ${username}: +${toAdd.join(',')} -> ${merged.join('|')}`);
        }
      } else {
        await col.updateOne({ _id: creator._id }, { $addToSet: { categories: { $each: toAdd } } });
      }
      updated++;
      tagsAdded += toAdd.length;
    }
  }

  const zeroAfter = await col.countDocuments({
    deleted: { $ne: true },
    $or: [{ categories: { $size: 0 } }, { categories: { $exists: false } }],
  });
  const distinct = await col.aggregate([
    { $match: { deleted: { $ne: true }, categories: { $exists: true, $ne: [] } } },
    { $unwind: '$categories' },
    { $group: { _id: null, tags: { $addToSet: '$categories' } } },
  ]).toArray();

  console.log('\n=== RESULT ===');
  console.log(`Creators touched: ${updated}`);
  console.log(`Top-100 full restore: ${top100Full}`);
  console.log(`Tags added (approx): ${tagsAdded}`);
  console.log(`Zero-category creators now: ${zeroAfter}`);
  console.log(`Distinct tags now: ${distinct[0]?.tags?.length || 0}`);

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
