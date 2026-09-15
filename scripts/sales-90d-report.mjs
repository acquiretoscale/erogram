/**
 * 90-day Erogram sales + funnel report (read-only).
 * Usage: node --env-file=.env.local scripts/sales-90d-report.mjs
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const DAYS = 90;
const uri = process.env.MONGODB_URI;
const BOT_TOKEN = process.env.TELEGRAM_PAYMENT_BOT_TOKEN || '';
if (!uri) { console.error('MONGODB_URI missing'); process.exit(1); }

await mongoose.connect(uri);
const db = mongoose.connection.db;

const since = new Date();
since.setDate(since.getDate() - DAYS);

function pct(n, d) { return d ? ((n / d) * 100).toFixed(1) + '%' : '0%'; }
function fmtUsd(n) { return '$' + (n || 0).toFixed(2); }

const premiumEvents = db.collection('premiumevents');
const users = db.collection('users');
const groups = db.collection('groups');
const bots = db.collection('bots');
const manualRevenue = db.collection('manualrevenues');
const premiumConfig = db.collection('premiumconfigs');
const starsRates = db.collection('starsrates');

const cfg = await premiumConfig.findOne({ key: 'default' });
const planStars = {
  monthly: cfg?.monthly?.starsAmount || 865,
  quarterly: cfg?.quarterly?.starsAmount || 1332,
  yearly: cfg?.yearly?.starsAmount || 1934,
  lifetime: 0,
};
const planUsd = {
  monthly: cfg?.monthly?.priceUsd || 12.97,
  quarterly: cfg?.quarterly?.priceUsd || 19.97,
  yearly: cfg?.yearly?.priceUsd || 29,
  lifetime: cfg?.lifetime?.priceUsd || 0,
};

const latestRate = await starsRates.findOne({}, { sort: { fetchedAt: -1 } });
const starsRate = latestRate?.usdtPerStar || 0.013;

const isCryptoCharge = (id) => typeof id === 'string' && /^[0-9]+$/.test(id);
const cryptoPrices = { basic: 49, boost: 147, startup: 297, platinum: 297, featured_creator: 197 };

// ── Funnel events (90d) ──
const funnelEvents = [
  'page_view', 'modal_open', 'plan_click', 'crypto_plan_click',
  'invoice_created', 'crypto_invoice_created', 'invoice_error', 'crypto_invoice_error',
  'pre_checkout', 'submission_pre_checkout',
  'payment_success', 'crypto_payment_success', 'submission_payment_success',
  'crypto_webhook_expired', 'crypto_webhook_failed', 'crypto_webhook_finished',
  'crypto_partial_payment', 'already_premium', 'slots_full',
  'submission_invoice_created', 'submission_crypto_invoice_created',
];

const eventCounts = await premiumEvents.aggregate([
  { $match: { createdAt: { $gte: since }, event: { $in: funnelEvents } } },
  { $group: { _id: '$event', count: { $sum: 1 } } },
]).toArray();
const counts = Object.fromEntries(eventCounts.map((e) => [e._id, e.count]));

// ── Completed sales in period ──
const paymentEvents = await premiumEvents.find({
  createdAt: { $gte: since },
  event: { $in: ['payment_success', 'crypto_payment_success', 'submission_payment_success'] },
}).project({ userId: 1, plan: 1, paymentMethod: 1, createdAt: 1, event: 1, entityType: 1, listingType: 1, reason: 1, chargeId: 1 }).toArray();

const newSubsInPeriod = await users.find({
  isSeedUser: { $ne: true },
  lastPaymentChargeId: { $exists: true, $nin: [null, ''] },
  premiumSince: { $gte: since },
}).project({ country: 1, premiumPlan: 1, paymentMethod: 1, premiumSince: 1, username: 1 }).toArray();

const paidGroups = await groups.find({
  paidBoost: true,
  $or: [{ featuredAt: { $gte: since } }, { featuredAt: null, createdAt: { $gte: since } }],
}).project({ name: 1, paidBoostStars: 1, lastPaymentChargeId: 1, createdBy: 1, featuredAt: 1, createdAt: 1 }).toArray();

const paidBots = await bots.find({
  paidBoost: true,
  $or: [{ featuredAt: { $gte: since } }, { featuredAt: null, createdAt: { $gte: since } }],
}).project({ name: 1, paidBoostStars: 1, lastPaymentChargeId: 1, createdBy: 1, featuredAt: 1, createdAt: 1 }).toArray();

const manual = await manualRevenue.find({ paidAt: { $gte: since } }).toArray();

// Build sales list with USD
const sales = [];

for (const u of newSubsInPeriod) {
  const plan = u.premiumPlan || 'monthly';
  sales.push({
    type: 'subscription',
    plan,
    method: u.paymentMethod || 'stars',
    usd: planUsd[plan] || (planStars[plan] || 0) * starsRate,
    stars: planStars[plan] || 0,
    country: u.country || 'Unknown',
    at: u.premiumSince,
  });
}

for (const g of paidGroups) {
  const stars = g.paidBoostStars || 0;
  const method = isCryptoCharge(g.lastPaymentChargeId) ? 'crypto' : 'stars';
  let country = 'Unknown';
  if (g.createdBy) {
    const buyer = await users.findOne({ _id: g.createdBy }, { projection: { country: 1 } });
    country = buyer?.country || 'Unknown';
  }
  sales.push({
    type: 'group_boost',
    plan: null,
    method,
    usd: method === 'crypto' ? stars : stars * starsRate,
    stars,
    country,
    at: g.featuredAt || g.createdAt,
  });
}

for (const b of paidBots) {
  const stars = b.paidBoostStars || 0;
  const method = isCryptoCharge(b.lastPaymentChargeId) ? 'crypto' : 'stars';
  let country = 'Unknown';
  if (b.createdBy) {
    const buyer = await users.findOne({ _id: b.createdBy }, { projection: { country: 1 } });
    country = buyer?.country || 'Unknown';
  }
  sales.push({
    type: 'bot_boost',
    plan: null,
    method,
    usd: method === 'crypto' ? stars : stars * starsRate,
    stars,
    country,
    at: b.featuredAt || b.createdAt,
  });
}

for (const ev of paymentEvents) {
  if (ev.event === 'submission_payment_success') {
    const tier = ev.listingType || 'basic';
    const isFeatured = ev.reason?.includes('featured') || tier === 'featured_creator';
    sales.push({
      type: 'listing',
      plan: tier,
      method: ev.paymentMethod || 'stars',
      usd: isFeatured ? 197 : (cryptoPrices[tier] || 49),
      stars: 0,
      country: 'Unknown',
      at: ev.createdAt,
    });
    continue;
  }
  // subscription payment events not already counted via premiumSince
  if (!ev.userId) continue;
  const uid = String(ev.userId);
  const already = sales.some((s) => s.type === 'subscription' && s._uid === uid);
  if (already) continue;
  const u = await users.findOne({ _id: ev.userId }, { projection: { country: 1, premiumSince: 1 } });
  if (u?.premiumSince && u.premiumSince >= since) continue; // already counted
  const plan = ev.plan || 'monthly';
  sales.push({
    type: 'subscription',
    plan,
    method: ev.paymentMethod || 'stars',
    usd: planUsd[plan] || 0,
    stars: planStars[plan] || 0,
    country: u?.country || 'Unknown',
    at: ev.createdAt,
    _uid: uid,
  });
}

for (const m of manual) {
  sales.push({
    type: 'manual_ad',
    plan: m.category,
    method: 'manual',
    usd: m.amount || 0,
    stars: 0,
    country: 'N/A',
    at: m.paidAt,
  });
}

// Country rollup
const byCountry = {};
for (const s of sales) {
  const c = s.country || 'Unknown';
  if (!byCountry[c]) byCountry[c] = { count: 0, usd: 0, subs: 0, boosts: 0, listings: 0, manual: 0 };
  byCountry[c].count++;
  byCountry[c].usd += s.usd;
  if (s.type === 'subscription') byCountry[c].subs++;
  else if (s.type === 'group_boost' || s.type === 'bot_boost') byCountry[c].boosts++;
  else if (s.type === 'listing') byCountry[c].listings++;
  else if (s.type === 'manual_ad') byCountry[c].manual++;
}

// By product type
const byType = {};
for (const s of sales) {
  byType[s.type] = byType[s.type] || { count: 0, usd: 0 };
  byType[s.type].count++;
  byType[s.type].usd += s.usd;
}

// By plan (subs only)
const byPlan = {};
for (const s of sales.filter((x) => x.type === 'subscription')) {
  byPlan[s.plan] = byPlan[s.plan] || { count: 0, usd: 0 };
  byPlan[s.plan].count++;
  byPlan[s.plan].usd += s.usd;
}

// By payment method
const byMethod = {};
for (const s of sales) {
  byMethod[s.method] = byMethod[s.method] || { count: 0, usd: 0 };
  byMethod[s.method].count++;
  byMethod[s.method].usd += s.usd;
}

// ── Abandonment analysis ──
// Stars: invoice_created users who never got payment_success
const invoiceCreated = await premiumEvents.find({
  createdAt: { $gte: since },
  event: { $in: ['invoice_created', 'crypto_invoice_created', 'submission_invoice_created', 'submission_crypto_invoice_created'] },
}).project({ userId: 1, event: 1, plan: 1, paymentMethod: 1, createdAt: 1, orderId: 1 }).toArray();

const paymentSuccess = await premiumEvents.find({
  createdAt: { $gte: since },
  event: { $in: ['payment_success', 'crypto_payment_success', 'submission_payment_success'] },
}).project({ userId: 1, orderId: 1, createdAt: 1 }).toArray();

const abandonedInvoices = [];
for (const inv of invoiceCreated) {
  const uid = inv.userId ? String(inv.userId) : null;
  const paid = paymentSuccess.some((p) => {
    if (inv.orderId && p.orderId && inv.orderId === p.orderId) return true;
    if (uid && p.userId && String(p.userId) === uid && new Date(p.createdAt) >= new Date(inv.createdAt)) return true;
    return false;
  });
  if (!paid) {
    let country = 'Unknown';
    if (inv.userId) {
      const u = await users.findOne({ _id: inv.userId }, { projection: { country: 1, username: 1 } });
      country = u?.country || 'Unknown';
    }
    abandonedInvoices.push({
      event: inv.event,
      plan: inv.plan,
      method: inv.paymentMethod || (inv.event.includes('crypto') ? 'crypto' : 'stars'),
      country,
      at: inv.createdAt,
    });
  }
}

const preCheckouts = counts.pre_checkout || 0;
const starsPayments = counts.payment_success || 0;
const cryptoPayments = counts.crypto_payment_success || 0;
const starsInvoices = counts.invoice_created || 0;
const cryptoInvoices = counts.crypto_invoice_created || 0;
const invoiceErrors = (counts.invoice_error || 0) + (counts.crypto_invoice_error || 0);
const cryptoExpired = counts.crypto_webhook_expired || 0;
const cryptoFailed = counts.crypto_webhook_failed || 0;

// Abandoned by country
const abandonByCountry = {};
for (const a of abandonedInvoices) {
  const c = a.country || 'Unknown';
  abandonByCountry[c] = (abandonByCountry[c] || 0) + 1;
}

// Abandoned by plan
const abandonByPlan = {};
for (const a of abandonedInvoices) {
  if (!a.plan) continue;
  abandonByPlan[a.plan] = (abandonByPlan[a.plan] || 0) + 1;
}

// Plan click breakdown
const planClicks = await premiumEvents.aggregate([
  { $match: { createdAt: { $gte: since }, event: { $in: ['plan_click', 'crypto_plan_click'] }, plan: { $ne: null } } },
  { $group: { _id: '$plan', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
]).toArray();

// Source breakdown
const sourceBreakdown = await premiumEvents.aggregate([
  { $match: { createdAt: { $gte: since }, event: 'page_view', source: { $ne: null } } },
  { $group: { _id: '$source', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
]).toArray();

// Weekly trend
const weeklySales = await premiumEvents.aggregate([
  { $match: { createdAt: { $gte: since }, event: { $in: ['payment_success', 'crypto_payment_success'] } } },
  { $group: { _id: { $dateToString: { format: '%Y-W%V', date: '$createdAt' } }, count: { $sum: 1 } } },
  { $sort: { _id: 1 } },
]).toArray();

const totalUsd = sales.reduce((s, x) => s + x.usd, 0);
const totalSales = sales.length;

// Telegram ground truth (paginated)
let telegramStats = null;
if (BOT_TOKEN) {
  try {
    const sinceTs = Math.floor(since.getTime() / 1000);
    let offset = '0';
    const allTxs = [];
    for (let page = 0; page < 50; page++) {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getStarTransactions?offset=${encodeURIComponent(offset)}&limit=100`);
      const raw = await res.json();
      if (!raw?.ok) break;
      const txs = raw.result?.transactions || [];
      allTxs.push(...txs);
      const next = raw.result?.next_offset;
      if (typeof next === 'string' && next.length && next !== offset && txs.length) {
        offset = next;
        continue;
      }
      const num = Number(offset);
      if (Number.isFinite(num) && txs.length === 100) { offset = String(num + 100); continue; }
      break;
    }
    const inPeriod = allTxs.filter((t) => t.date >= sinceTs);
    const payments = inPeriod.filter((t) => t?.source?.transaction_type === 'invoice_payment');
    const totalStars = payments.reduce((s, t) => s + (t.amount || 0), 0);
    telegramStats = {
      paymentCount: payments.length,
      totalStars,
      totalUsd: Math.round(totalStars * starsRate * 100) / 100,
      txPagesFetched: Math.ceil(allTxs.length / 100),
    };
  } catch (e) {
    telegramStats = { error: String(e.message || e) };
  }
}

const report = {
  period: { days: DAYS, since: since.toISOString(), generatedAt: new Date().toISOString() },
  totals: {
    salesCount: totalSales,
    revenueUsd: Math.round(totalUsd * 100) / 100,
    starsRate,
  },
  byProductType: byType,
  byPlan,
  byPaymentMethod: byMethod,
  byCountry: Object.entries(byCountry)
    .sort((a, b) => b[1].usd - a[1].usd)
    .map(([country, v]) => ({ country, ...v, usd: Math.round(v.usd * 100) / 100 })),
  funnel: {
    pageViews: (counts.page_view || 0) + (counts.modal_open || 0),
    planClicks: (counts.plan_click || 0) + (counts.crypto_plan_click || 0),
    starsInvoices,
    cryptoInvoices,
    totalInvoices: starsInvoices + cryptoInvoices,
    preCheckouts,
    starsPayments,
    cryptoPayments,
    totalPayments: starsPayments + cryptoPayments,
    invoiceErrors,
    cryptoExpired,
    cryptoFailed,
    alreadyPremium: counts.already_premium || 0,
    slotsFull: counts.slots_full || 0,
    conversionRates: {
      viewToClick: pct((counts.plan_click || 0) + (counts.crypto_plan_click || 0), (counts.page_view || 0) + (counts.modal_open || 0)),
      clickToInvoice: pct(starsInvoices + cryptoInvoices, (counts.plan_click || 0) + (counts.crypto_plan_click || 0)),
      invoiceToPay: pct(starsPayments + cryptoPayments, starsInvoices + cryptoInvoices),
      preCheckoutToPay: pct(starsPayments, preCheckouts),
      overallViewToPay: pct(starsPayments + cryptoPayments, (counts.page_view || 0) + (counts.modal_open || 0)),
    },
  },
  abandonment: {
    invoicesCreatedNotPaid: abandonedInvoices.length,
    starsAbandoned: abandonedInvoices.filter((a) => a.method === 'stars').length,
    cryptoAbandoned: abandonedInvoices.filter((a) => a.method === 'crypto').length,
    invoiceErrorCount: invoiceErrors,
    cryptoExpiredCount: cryptoExpired,
    cryptoFailedCount: cryptoFailed,
    abandonRate: pct(abandonedInvoices.length, starsInvoices + cryptoInvoices),
    byCountry: Object.entries(abandonByCountry).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([country, count]) => ({ country, count })),
    byPlan: Object.entries(abandonByPlan).sort((a, b) => b[1] - a[1]).map(([plan, count]) => ({ plan, count })),
  },
  planClicks: planClicks.map((p) => ({ plan: p._id, clicks: p.count })),
  pageViewSources: sourceBreakdown.map((s) => ({ source: s._id, count: s.count })),
  weeklyPremiumPayments: weeklySales,
  telegramGroundTruth: telegramStats,
};

console.log(JSON.stringify(report, null, 2));
await mongoose.disconnect();
