/* eslint-disable */
// TEST PROBE (self-cleaning): simulate ONE tagged click on clarablanc's image #1, verify the
// dashboard's per-image parse credits #1 (not the paused Default), then DELETE the probe row so
// the client's real stats are untouched. Net change to production data = ZERO.
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const PROBE_DATE = new Date('2099-01-01T00:00:00.000Z'); // unique marker for safe deletion

function parseVariant(campaignId, clicks) {
  return clicks.aggregate([
    { $match: { campaignId } },
    { $project: { v: { $let: { vars: { idx: { $indexOfBytes: ['$placement', ':v'] } },
      in: { $cond: [{ $gte: ['$$idx', 0] }, { $toInt: { $substrBytes: ['$placement', { $add: ['$$idx', 2] }, 2] } }, -1] } } } } },
    { $group: { _id: '$v', n: { $sum: 1 } } }, { $sort: { _id: 1 } },
  ]).toArray();
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const trending = db.collection('trendingofcreators');
  const clicks = db.collection('campaignclicks');

  const s = await trending.findOne({ username: /^clarablanc$/i });
  if (!s || !s.linkedCampaignId) { console.log('clarablanc not linked'); await mongoose.disconnect(); return; }
  const campId = s.linkedCampaignId;

  console.log('BEFORE:', await parseVariant(campId, clicks));

  // Simulate a tagged click on image #1 (exactly what trackTrendingClick(id, 1) writes).
  await clicks.insertOne({ campaignId: campId, clickedAt: PROBE_DATE, placement: 'of-cat:v1' });
  console.log('AFTER insert of-cat:v1:', await parseVariant(campId, clicks));

  // Clean up the probe so the client's real numbers are unaffected.
  const del = await clicks.deleteOne({ campaignId: campId, clickedAt: PROBE_DATE, placement: 'of-cat:v1' });
  console.log(`CLEANED UP probe row (deleted ${del.deletedCount}).`);
  console.log('AFTER cleanup:', await parseVariant(campId, clicks));

  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
