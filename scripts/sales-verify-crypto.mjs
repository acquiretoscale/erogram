import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;
const since = new Date(); since.setDate(since.getDate() - 90);

const ev = await db.collection('premiumevents').find({
  createdAt: { $gte: since },
  $or: [
    { paymentMethod: 'crypto' },
    { event: { $regex: /^crypto_/ } },
    { event: 'submission_payment_success' },
  ],
}).sort({ createdAt: -1 }).toArray();

console.log('CRYPTO EVENTS:', JSON.stringify(ev.map(e => ({
  date: e.createdAt, event: e.event, plan: e.plan, entityType: e.entityType,
  listingType: e.listingType, reason: e.reason, paymentId: e.paymentId,
  orderId: e.orderId, chargeId: e.chargeId, username: e.username,
})), null, 2));

for (const slug of ['haremhub-ai-chat-18', 'vixgram-mini-adult-movies-sfwnsfw-by-ai-artists', 'kay-redhead']) {
  const col = slug.includes('harem') ? 'bots' : 'groups';
  const doc = await db.collection(col).findOne({ slug });
  console.log(slug.toUpperCase(), JSON.stringify({
    paidBoost: doc?.paidBoost, paidBoostStars: doc?.paidBoostStars,
    lastPaymentChargeId: doc?.lastPaymentChargeId, featuredAt: doc?.featuredAt,
    boostDuration: doc?.boostDuration, status: doc?.status,
  }, null, 2));
}

await mongoose.disconnect();
