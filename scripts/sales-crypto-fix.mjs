import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;
const since = new Date(); since.setDate(since.getDate() - 90);
const rate = 0.013;
const isCrypto = (id) => typeof id === 'string' && /^[0-9]+$/.test(id);

const groups = await db.collection('groups').find({ paidBoost: true, lastPaymentChargeId: { $exists: true, $ne: null } }).toArray();
const bots = await db.collection('bots').find({ paidBoost: true, lastPaymentChargeId: { $exists: true, $ne: null } }).toArray();

const cryptoSales = [];
for (const g of groups.filter((x) => isCrypto(x.lastPaymentChargeId))) {
  const at = g.featuredAt || g.createdAt;
  const stars = g.paidBoostStars || 0;
  const buyer = g.createdBy ? await db.collection('users').findOne({ _id: g.createdBy }, { projection: { username: 1, country: 1 } }) : null;
  cryptoSales.push({
    type: 'group', name: g.name, slug: g.slug, chargeId: g.lastPaymentChargeId,
    paidBoostStars: stars, usd: Math.round(stars * rate * 100) / 100,
    boostDuration: g.boostDuration, date: at, inPeriod: at >= since,
    buyer: buyer?.username, country: buyer?.country,
  });
}
for (const b of bots.filter((x) => isCrypto(x.lastPaymentChargeId))) {
  const at = b.featuredAt || b.createdAt;
  const stars = b.paidBoostStars || 0;
  const buyer = b.createdBy ? await db.collection('users').findOne({ _id: b.createdBy }, { projection: { username: 1, country: 1 } }) : null;
  cryptoSales.push({
    type: 'bot', name: b.name, slug: b.slug, chargeId: b.lastPaymentChargeId,
    paidBoostStars: stars, usd: Math.round(stars * rate * 100) / 100,
    date: at, inPeriod: at >= since,
    buyer: buyer?.username, country: buyer?.country,
  });
}

const cryptoUsers = await db.collection('users').find({
  paymentMethod: 'crypto',
  premiumSince: { $gte: since },
}).project({ username: 1, premiumPlan: 1, premiumSince: 1, lastPaymentChargeId: 1, country: 1 }).toArray();

console.log(JSON.stringify({ cryptoSales, cryptoPremiumUsers: cryptoUsers, inPeriodOnly: cryptoSales.filter((s) => s.inPeriod) }, null, 2));
await mongoose.disconnect();
