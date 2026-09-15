/**
 * Line-item sales detail for last 90 days.
 * Usage: node --env-file=.env.local scripts/sales-detail-90d.mjs
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI missing'); process.exit(1); }

await mongoose.connect(uri);
const db = mongoose.connection.db;
const since = new Date();
since.setDate(since.getDate() - 90);

const isCryptoCharge = (id) => typeof id === 'string' && /^[0-9]+$/.test(id);
const users = db.collection('users');
const cfg = await db.collection('premiumconfigs').findOne({ key: 'default' });
const planUsd = {
  monthly: cfg?.monthly?.priceUsd || 12.97,
  quarterly: cfg?.quarterly?.priceUsd || 19.97,
  yearly: cfg?.yearly?.priceUsd || 29,
};

// ── MANUAL ──
const manual = await db.collection('manualrevenues').find({ paidAt: { $gte: since } }).sort({ paidAt: -1 }).toArray();

// ── CRYPTO premium events ──
const cryptoEvents = await db.collection('premiumevents').find({
  createdAt: { $gte: since },
  $or: [
    { event: { $in: ['crypto_payment_success', 'crypto_webhook_finished'] } },
    { event: 'submission_payment_success', paymentMethod: 'crypto' },
  ],
}).sort({ createdAt: -1 }).toArray();

// ── Paid groups/bots in period ──
const groups = await db.collection('groups').find({
  paidBoost: true,
  $or: [{ featuredAt: { $gte: since } }, { featuredAt: null, createdAt: { $gte: since } }],
}).toArray();

const bots = await db.collection('bots').find({
  paidBoost: true,
  $or: [{ featuredAt: { $gte: since } }, { featuredAt: null, createdAt: { $gte: since } }],
}).toArray();

const latestRate = await db.collection('starsrates').findOne({}, { sort: { fetchedAt: -1 } });
const starsRate = latestRate?.usdtPerStar || 0.013;

async function buyerInfo(createdBy, fallbackUsername) {
  if (!createdBy) return { username: fallbackUsername || 'unknown' };
  const u = await users.findOne({ _id: createdBy }, { projection: { username: 1, country: 1, telegramUsername: 1, firstName: 1 } });
  if (!u) return { username: fallbackUsername || 'unknown' };
  return { username: u.username, country: u.country, telegram: u.telegramUsername, firstName: u.firstName };
}

const report = {
  period: { since: since.toISOString(), days: 90 },

  manualRevenue: manual.map((m) => ({
    date: m.paidAt,
    amountUsd: m.amount,
    currency: m.currency || 'USD',
    client: m.clientName || '(no client name)',
    category: m.category,
    description: m.description,
    recurring: m.recurring || false,
  })),

  cryptoSales: [],
  starsGroupBotSales: [],
  brSales: [],
};

// Crypto from groups/bots
for (const g of groups) {
  const buyer = await buyerInfo(g.createdBy, g.createdByUsername);
  const method = isCryptoCharge(g.lastPaymentChargeId) ? 'crypto' : 'stars';
  const stars = g.paidBoostStars || 0;
  const usd = method === 'crypto' ? stars : stars * starsRate;
  const row = {
    type: 'group_boost',
    name: g.name,
    slug: g.slug,
    method,
    amountUsd: Math.round(usd * 100) / 100,
    paidBoostStars: stars,
    chargeId: g.lastPaymentChargeId,
    boostDuration: g.boostDuration,
    date: g.featuredAt || g.createdAt,
    buyer,
  };
  if (method === 'crypto') report.cryptoSales.push(row);
  else report.starsGroupBotSales.push(row);
  if (buyer.country === 'BR') report.brSales.push(row);
}

for (const b of bots) {
  const buyer = await buyerInfo(b.createdBy, b.createdByUsername);
  const method = isCryptoCharge(b.lastPaymentChargeId) ? 'crypto' : 'stars';
  const stars = b.paidBoostStars || 0;
  const usd = method === 'crypto' ? stars : stars * starsRate;
  const row = {
    type: 'bot_boost',
    name: b.name,
    slug: b.slug,
    method,
    amountUsd: Math.round(usd * 100) / 100,
    paidBoostStars: stars,
    chargeId: b.lastPaymentChargeId,
    date: b.featuredAt || b.createdAt,
    buyer,
  };
  if (method === 'crypto') report.cryptoSales.push(row);
  else report.starsGroupBotSales.push(row);
  if (buyer.country === 'BR') report.brSales.push(row);
}

// Crypto from premium events
for (const e of cryptoEvents) {
  report.cryptoSales.push({
    type: 'premium_event',
    event: e.event,
    plan: e.plan,
    entityType: e.entityType,
    listingType: e.listingType,
    reason: e.reason,
    chargeId: e.chargeId,
    orderId: e.orderId,
    paymentId: e.paymentId,
    date: e.createdAt,
    username: e.username,
  });
}

// BR premium subs
const brSubs = await users.find({
  country: 'BR',
  isSeedUser: { $ne: true },
  lastPaymentChargeId: { $exists: true, $nin: [null, ''] },
  premiumSince: { $gte: since },
}).project({ username: 1, premiumPlan: 1, premiumSince: 1, paymentMethod: 1, lastPaymentChargeId: 1, telegramUsername: 1 }).toArray();

for (const u of brSubs) {
  const plan = u.premiumPlan || 'monthly';
  report.brSales.push({
    type: 'subscription',
    method: u.paymentMethod || 'stars',
    plan,
    amountUsd: planUsd[plan] || 0,
    chargeId: u.lastPaymentChargeId,
    date: u.premiumSince,
    buyer: { username: u.username, country: 'BR', telegram: u.telegramUsername },
  });
}

// Also check groups/bots where buyer country is BR but we might have missed
const brGroups = await groups.filter(async () => false); // already handled above

report.totals = {
  manualUsd: manual.reduce((s, m) => s + (m.amount || 0), 0),
  cryptoUsd: report.cryptoSales.reduce((s, x) => s + (x.amountUsd || 0), 0),
  cryptoCount: report.cryptoSales.length,
  brUsd: report.brSales.reduce((s, x) => s + (x.amountUsd || 0), 0),
  brCount: report.brSales.length,
};

console.log(JSON.stringify(report, null, 2));
await mongoose.disconnect();
