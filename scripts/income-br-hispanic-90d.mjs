/**
 * Income from Brazil + Spanish-speaking countries — last 90 days.
 * Stars: Telegram invoice_payment ground truth.
 * Also: crypto charges + manual revenue where identifiable.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BOT = process.env.TELEGRAM_PAYMENT_BOT_TOKEN;
const uri = process.env.MONGODB_URI;
if (!uri || !BOT) { console.error('missing env'); process.exit(1); }

const HISPANIC = new Set([
  'ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU', 'BO', 'DO',
  'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'GQ', 'PR', 'AD', // PR/ad optional
]);
const TARGET = (c) => c === 'BR' || HISPANIC.has(c);
const DAYS = 90;
const since = new Date(); since.setDate(since.getDate() - DAYS);
const sinceTs = Math.floor(since.getTime() / 1000);
const rate = 0.013;

function parsePayload(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}
function productLabel(p) {
  if (!p) return 'unknown';
  if (p.plan && ['monthly', 'quarterly', 'yearly', 'lifetime'].includes(p.plan)) return `premium_${p.plan}`;
  if (p.groupId && p.type) return `${p.entityType || 'group'}_${p.type}`;
  if (p.ainsfwSubmissionId) return `ainsfw_${p.plan || '?'}`;
  return 'other';
}
function isCrypto(id) { return typeof id === 'string' && /^[0-9]+$/.test(id); }

async function fetchStarPayments() {
  let offset = '0';
  const all = [];
  for (let i = 0; i < 100; i++) {
    const res = await fetch(`https://api.telegram.org/bot${BOT}/getStarTransactions?offset=${encodeURIComponent(offset)}&limit=100`);
    const raw = await res.json();
    if (!raw?.ok) break;
    const txs = raw.result?.transactions || [];
    all.push(...txs);
    const next = raw.result?.next_offset;
    if (next && next !== offset && txs.length) { offset = next; continue; }
    const n = Number(offset);
    if (Number.isFinite(n) && txs.length === 100) { offset = String(n + 100); continue; }
    break;
  }
  return all.filter((t) => t.date >= sinceTs && t.source?.transaction_type === 'invoice_payment');
}

await mongoose.connect(uri);
const db = mongoose.connection.db;
const users = db.collection('users');
const groups = db.collection('groups');
const bots = db.collection('bots');
const latestRate = await db.collection('starsrates').findOne({}, { sort: { fetchedAt: -1 } });
const usdPerStar = latestRate?.usdtPerStar || rate;

async function countryForPayload(payload) {
  if (payload?.userId && mongoose.isValidObjectId(payload.userId)) {
    const u = await users.findOne({ _id: new mongoose.Types.ObjectId(payload.userId) }, { projection: { country: 1, username: 1 } });
    return { country: u?.country || null, username: u?.username, source: 'user' };
  }
  if (payload?.groupId && mongoose.isValidObjectId(payload.groupId)) {
    const col = payload.entityType === 'bot' ? bots : groups;
    const e = await col.findOne({ _id: new mongoose.Types.ObjectId(payload.groupId) }, { projection: { name: 1, createdBy: 1, createdByUsername: 1 } });
    if (e?.createdBy) {
      const u = await users.findOne({ _id: e.createdBy }, { projection: { country: 1, username: 1 } });
      return { country: u?.country || null, username: u?.username || e.createdByUsername, entityName: e.name, source: 'creator' };
    }
    return { country: null, username: e?.createdByUsername, entityName: e?.name, source: 'no_creator' };
  }
  return { country: null, username: null, source: 'none' };
}

const starTxs = await fetchStarPayments();
const starsRows = [];
for (const t of starTxs) {
  const payload = parsePayload(t.source?.invoice_payload);
  const meta = await countryForPayload(payload);
  const stars = t.amount || 0;
  starsRows.push({
    method: 'stars',
    date: new Date(t.date * 1000).toISOString(),
    product: productLabel(payload),
    stars,
    usd: Math.round(stars * usdPerStar * 100) / 100,
    country: meta.country,
    username: meta.username,
    entityName: meta.entityName || null,
    tgFrom: t.source?.user?.username ? `@${t.source.user.username}` : t.source?.user?.id,
  });
}

// Crypto paid groups/bots in period
const cryptoRows = [];
for (const col of ['groups', 'bots']) {
  const docs = await db.collection(col).find({
    paidBoost: true,
    lastPaymentChargeId: { $exists: true, $ne: null },
    $or: [{ featuredAt: { $gte: since } }, { featuredAt: null, createdAt: { $gte: since } }],
  }).toArray();
  for (const d of docs) {
    if (!isCrypto(d.lastPaymentChargeId)) continue;
    const buyer = d.createdBy ? await users.findOne({ _id: d.createdBy }, { projection: { country: 1, username: 1 } }) : null;
    const stars = d.paidBoostStars || 0;
    cryptoRows.push({
      method: 'crypto',
      date: (d.featuredAt || d.createdAt).toISOString(),
      product: `${col === 'bots' ? 'bot' : 'group'}_boost`,
      stars,
      usd: Math.round(stars * usdPerStar * 100) / 100,
      country: buyer?.country || null,
      username: buyer?.username || d.createdByUsername,
      entityName: d.name,
      chargeId: d.lastPaymentChargeId,
    });
  }
}

// Crypto premium subs
const cryptoSubs = await users.find({
  paymentMethod: 'crypto',
  premiumSince: { $gte: since },
  lastPaymentChargeId: { $regex: /^[0-9]+$/ },
}).project({ username: 1, country: 1, premiumPlan: 1, premiumSince: 1, lastPaymentChargeId: 1 }).toArray();
const cfg = await db.collection('premiumconfigs').findOne({ key: 'default' });
const planUsd = { monthly: cfg?.monthly?.priceUsd || 12.97, quarterly: cfg?.quarterly?.priceUsd || 19.97, yearly: cfg?.yearly?.priceUsd || 29 };
for (const u of cryptoSubs) {
  cryptoRows.push({
    method: 'crypto',
    date: u.premiumSince.toISOString(),
    product: `premium_${u.premiumPlan || '?'}`,
    usd: planUsd[u.premiumPlan] || 0,
    country: u.country,
    username: u.username,
    chargeId: u.lastPaymentChargeId,
  });
}

// Manual revenue — scan client/description for BR/Hispanic hints
const manualAll = await db.collection('manualrevenues').find({ paidAt: { $gte: since } }).toArray();
const manualRows = manualAll.map((m) => ({
  method: 'manual',
  date: m.paidAt.toISOString(),
  product: m.category,
  usd: m.amount,
  client: m.clientName,
  description: m.description,
  country: /colombia/i.test(m.clientName + m.description) ? 'CO' : null,
}));

const allIncome = [...starsRows, ...cryptoRows, ...manualRows.map((m) => ({ ...m, stars: 0 }))];

function bucket(country) {
  if (country === 'BR') return 'brazil';
  if (country && HISPANIC.has(country)) return 'hispanic';
  return 'other';
}

const br = allIncome.filter((r) => r.country === 'BR');
const hispanic = allIncome.filter((r) => r.country && HISPANIC.has(r.country));
const brOrHispanic = allIncome.filter((r) => TARGET(r.country));

// Also: users FROM these countries who paid but country null — check language field?
const nullCountryStars = starsRows.filter((r) => !r.country);

// Hispanic-looking usernames in unknown? skip — user said no bullshit

// Traffic: new users from BR/Hispanic in 90d (context, not income)
const newUsersBR = await users.countDocuments({ createdAt: { $gte: since }, country: 'BR', isSeedUser: { $ne: true } });
const newUsersHispanic = await users.countDocuments({ createdAt: { $gte: since }, country: { $in: [...HISPANIC] }, isSeedUser: { $ne: true } });

// Invoice attempts (not paid) from BR/Hispanic
const invoiceAttempts = await db.collection('premiumevents').aggregate([
  { $match: { createdAt: { $gte: since }, event: 'invoice_created', userId: { $ne: null } } },
  { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'u' } },
  { $unwind: '$u' },
  { $match: { 'u.country': { $in: ['BR', ...HISPANIC] } } },
  { $group: { _id: '$u.country', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
]).toArray();

const paidByCountry = {};
for (const r of brOrHispanic) {
  const c = r.country;
  if (!paidByCountry[c]) paidByCountry[c] = { payments: 0, usd: 0, items: [] };
  paidByCountry[c].payments++;
  paidByCountry[c].usd += r.usd || 0;
  paidByCountry[c].items.push(r);
}

console.log(JSON.stringify({
  period: { days: DAYS, since: since.toISOString() },
  summary: {
    brazil: { payments: br.length, usd: Math.round(br.reduce((s, r) => s + (r.usd || 0), 0) * 100) / 100 },
    hispanic: { payments: hispanic.length, usd: Math.round(hispanic.reduce((s, r) => s + (r.usd || 0), 0) * 100) / 100 },
    combined: { payments: brOrHispanic.length, usd: Math.round(brOrHispanic.reduce((s, r) => s + (r.usd || 0), 0) * 100) / 100 },
    manualColombiaOnly: manualRows.filter((m) => m.country === 'CO'),
  },
  brazilPayments: br,
  hispanicPayments: hispanic,
  byCountry: Object.entries(paidByCountry).map(([country, v]) => ({
    country, payments: v.payments, usd: Math.round(v.usd * 100) / 100, items: v.items,
  })).sort((a, b) => b.usd - a.usd),
  unpaidSignals: {
    invoiceAttemptsByCountry: invoiceAttempts,
    newUsersBR,
    newUsersHispanic,
    starsPaymentsUnknownCountry: nullCountryStars.length,
  },
  hispanicCountriesWithZeroIncome: [...HISPANIC].filter((c) => !paidByCountry[c]),
}, null, 2));

await mongoose.disconnect();
