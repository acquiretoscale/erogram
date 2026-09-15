/**
 * Stars payments by country — last 90 days.
 * Source of truth: Telegram getStarTransactions (invoice_payment only).
 * Country: User.country from DB via invoice_payload userId or entity creator.
 * Usage: node --env-file=.env.local scripts/stars-by-country-90d.mjs
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BOT = process.env.TELEGRAM_PAYMENT_BOT_TOKEN;
const uri = process.env.MONGODB_URI;
if (!uri || !BOT) { console.error('MONGODB_URI or TELEGRAM_PAYMENT_BOT_TOKEN missing'); process.exit(1); }

const DAYS = 90;
const since = new Date();
since.setDate(since.getDate() - DAYS);
const sinceTs = Math.floor(since.getTime() / 1000);

await mongoose.connect(uri);
const db = mongoose.connection.db;
const users = db.collection('users');
const groups = db.collection('groups');
const bots = db.collection('bots');

function parsePayload(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function productLabel(p) {
  if (!p) return 'unknown';
  if (p.slutbotPack) return 'slutbot';
  if (p.plan && ['monthly', 'quarterly', 'yearly', 'lifetime'].includes(p.plan)) return `premium_${p.plan}`;
  if (p.ainsfwSubmissionId) return `ainsfw_${p.plan || 'unknown'}`;
  if (p.groupId && p.type) return `${p.entityType || 'group'}_${p.type}`;
  return `other_${Object.keys(p).join(',')}`;
}

async function fetchAllStarTxs() {
  let offset = '0';
  const all = [];
  for (let page = 0; page < 100; page++) {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT}/getStarTransactions?offset=${encodeURIComponent(offset)}&limit=100`
    );
    const raw = await res.json();
    if (!raw?.ok) throw new Error('Telegram API failed: ' + JSON.stringify(raw));
    const txs = raw.result?.transactions || [];
    all.push(...txs);
    const next = raw.result?.next_offset;
    if (typeof next === 'string' && next.length && next !== offset && txs.length) {
      offset = next;
      continue;
    }
    const n = Number(offset);
    if (Number.isFinite(n) && txs.length === 100) { offset = String(n + 100); continue; }
    break;
  }
  return all.filter((t) => t.date >= sinceTs && t.source?.transaction_type === 'invoice_payment');
}

const txs = await fetchAllStarTxs();
const latestRate = await db.collection('starsrates').findOne({}, { sort: { fetchedAt: -1 } });
const usdPerStar = latestRate?.usdtPerStar || 0.013;

const rows = [];
const countryAgg = {};
const productAgg = {};
const countryProductAgg = {};

for (const t of txs) {
  const payload = parsePayload(t.source?.invoice_payload);
  const product = productLabel(payload);
  const stars = t.amount || 0;
  const usd = Math.round(stars * usdPerStar * 100) / 100;
  const date = new Date(t.date * 1000).toISOString();

  let country = null;
  let buyerUsername = null;
  let entityName = null;
  let countrySource = null;

  // Premium sub — userId in payload
  if (payload?.userId && mongoose.isValidObjectId(payload.userId)) {
    const u = await users.findOne(
      { _id: new mongoose.Types.ObjectId(payload.userId) },
      { projection: { country: 1, username: 1 } }
    );
    country = u?.country || null;
    buyerUsername = u?.username || null;
    countrySource = u ? 'user.country' : 'user_not_found';
  }

  // Group/bot submission — groupId in payload
  if (!country && payload?.groupId && mongoose.isValidObjectId(payload.groupId)) {
    const Model = payload.entityType === 'bot' ? bots : groups;
    const entity = await Model.findOne(
      { _id: new mongoose.Types.ObjectId(payload.groupId) },
      { projection: { name: 1, createdBy: 1, createdByUsername: 1 } }
    );
    entityName = entity?.name || null;
    if (entity?.createdBy) {
      const u = await users.findOne(
        { _id: entity.createdBy },
        { projection: { country: 1, username: 1 } }
      );
      country = u?.country || null;
      buyerUsername = u?.username || entity.createdByUsername || null;
      countrySource = u?.country ? 'entity_creator.country' : 'creator_no_country';
    } else {
      buyerUsername = entity?.createdByUsername || null;
      countrySource = 'no_creator_on_entity';
    }
  }

  // AI NSFW submission
  if (!country && payload?.ainsfwSubmissionId) {
    const sub = await db.collection('ainsfwsubmissions').findOne(
      { _id: new mongoose.Types.ObjectId(payload.ainsfwSubmissionId) },
      { projection: { name: 1, submittedBy: 1 } }
    );
    entityName = sub?.name || null;
    if (sub?.submittedBy) {
      const u = await users.findOne({ _id: sub.submittedBy }, { projection: { country: 1, username: 1 } });
      country = u?.country || null;
      buyerUsername = u?.username || null;
      countrySource = u?.country ? 'ainsfw_submitter.country' : 'submitter_no_country';
    }
  }

  // Telegram user from tx (fallback only — not geo)
  const tgUser = t.source?.user;

  const row = {
    date,
    stars,
    usd,
    product,
    country: country || 'UNKNOWN',
    buyerUsername,
    entityName,
    countrySource: countrySource || 'no_match',
    tgFrom: tgUser?.username ? `@${tgUser.username}` : tgUser?.id || null,
    txId: t.id,
  };
  rows.push(row);

  const c = row.country;
  if (!countryAgg[c]) countryAgg[c] = { payments: 0, stars: 0, usd: 0 };
  countryAgg[c].payments++;
  countryAgg[c].stars += stars;
  countryAgg[c].usd += usd;

  if (!productAgg[product]) productAgg[product] = { payments: 0, stars: 0, usd: 0 };
  productAgg[product].payments++;
  productAgg[product].stars += stars;
  productAgg[product].usd += usd;

  const cp = `${c}|${product}`;
  if (!countryProductAgg[cp]) countryProductAgg[cp] = { country: c, product, payments: 0, stars: 0, usd: 0 };
  countryProductAgg[cp].payments++;
  countryProductAgg[cp].stars += stars;
  countryProductAgg[cp].usd += usd;
}

// Sort countries by USD
const byCountry = Object.entries(countryAgg)
  .map(([country, v]) => ({ country, ...v, usd: Math.round(v.usd * 100) / 100 }))
  .sort((a, b) => b.usd - a.usd);

const byProduct = Object.entries(productAgg)
  .map(([product, v]) => ({ product, ...v, usd: Math.round(v.usd * 100) / 100 }))
  .sort((a, b) => b.usd - a.usd);

const byCountryProduct = Object.values(countryProductAgg)
  .map((v) => ({ ...v, usd: Math.round(v.usd * 100) / 100 }))
  .sort((a, b) => b.usd - a.usd);

// Split: subs vs boosts/listings
const isSub = (p) => p.startsWith('premium_');
const subsByCountry = {};
const boostsByCountry = {};
for (const r of rows) {
  const bucket = isSub(r.product) ? subsByCountry : boostsByCountry;
  const c = r.country;
  if (!bucket[c]) bucket[c] = { payments: 0, stars: 0, usd: 0 };
  bucket[c].payments++;
  bucket[c].stars += r.stars;
  bucket[c].usd += r.usd;
}

function toSorted(obj) {
  return Object.entries(obj)
    .map(([country, v]) => ({ country, ...v, usd: Math.round(v.usd * 100) / 100 }))
    .sort((a, b) => b.usd - a.usd);
}

const unknownRows = rows.filter((r) => r.country === 'UNKNOWN');

console.log(JSON.stringify({
  period: { days: DAYS, since: since.toISOString(), txCount: rows.length },
  usdPerStar,
  totals: {
    payments: rows.length,
    stars: rows.reduce((s, r) => s + r.stars, 0),
    usd: Math.round(rows.reduce((s, r) => s + r.usd, 0) * 100) / 100,
    unknownCountry: unknownRows.length,
  },
  byCountry,
  premiumSubsByCountry: toSorted(subsByCountry),
  boostsAndListingsByCountry: toSorted(boostsByCountry),
  byProduct,
  byCountryProduct,
  unknownPayments: unknownRows.map((r) => ({
    date: r.date, product: r.product, stars: r.stars, usd: r.usd,
    buyerUsername: r.buyerUsername, entityName: r.entityName, countrySource: r.countrySource, tgFrom: r.tgFrom,
  })),
  allPayments: rows,
}, null, 2));

await mongoose.disconnect();
