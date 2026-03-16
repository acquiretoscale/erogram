/**
 * Backfill country/city/timezone for existing users by resolving their IPs.
 *
 * Strategy:
 *   1. Find users without a country field set.
 *   2. Batch-lookup the most recent IP per user from PremiumEvent / TrackingEvent.
 *   3. Resolve IP → country/city/timezone via ip-api.com batch endpoint (free, no key).
 *   4. Update user documents.
 *
 * Usage:
 *   node --env-file=.env.local scripts/backfill-user-countries.mjs
 *   node --env-file=.env.local scripts/backfill-user-countries.mjs --dry-run
 *   node --env-file=.env.local scripts/backfill-user-countries.mjs --premium-only
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI is required'); process.exit(1); }

const DRY_RUN = process.argv.includes('--dry-run');
const PREMIUM_ONLY = process.argv.includes('--premium-only');

await mongoose.connect(MONGODB_URI);
const db = mongoose.connection.db;

const usersCol = db.collection('users');
const premiumEventsCol = db.collection('premiumevents');

async function resolveIPs(ips) {
  const res = await fetch('http://ip-api.com/batch?fields=query,country,countryCode,city,timezone,status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ips.map(ip => ({ query: ip }))),
  });
  if (!res.ok) throw new Error(`ip-api batch failed: ${res.status}`);
  return res.json();
}

// Find users missing country
const userQuery = { $or: [{ country: { $exists: false } }, { country: null }, { country: '' }] };
if (PREMIUM_ONLY) userQuery.premium = true;

const users = await usersCol.find(userQuery).toArray();
console.log(`Found ${users.length} users without country${PREMIUM_ONLY ? ' (premium only)' : ''}`);
if (users.length === 0) { await mongoose.disconnect(); process.exit(0); }

// Separate users who already have an IP stored on their document
const userIpMap = new Map();
const needIpLookup = [];

for (const user of users) {
  if (user.ip) {
    userIpMap.set(user._id.toString(), user.ip);
  } else {
    needIpLookup.push(user._id);
  }
}

console.log(`${userIpMap.size} users have IP on their document, ${needIpLookup.length} need event lookup`);

// Batch aggregate: get most recent IP per userId from premiumevents
if (needIpLookup.length > 0) {
  console.log('Aggregating IPs from PremiumEvent...');
  const pipeline = [
    { $match: { userId: { $in: needIpLookup }, ip: { $ne: null } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$userId', ip: { $first: '$ip' } } },
  ];
  const results = await premiumEventsCol.aggregate(pipeline).toArray();
  for (const r of results) {
    userIpMap.set(r._id.toString(), r.ip);
  }
  console.log(`Found IPs for ${results.length} users from PremiumEvent`);
}

const usersWithIps = users.filter(u => userIpMap.has(u._id.toString()));
const usersWithoutIps = users.filter(u => !userIpMap.has(u._id.toString()));

console.log(`\nTotal: ${usersWithIps.length} have IPs, ${usersWithoutIps.length} have no IP data`);

if (usersWithoutIps.length > 0 && usersWithoutIps.length <= 30) {
  console.log('Users with no IP data:');
  usersWithoutIps.forEach(u => console.log(`  - ${u.username} (${u.premium ? 'PREMIUM' : 'free'})`));
}

if (usersWithIps.length === 0) {
  console.log('Nothing to backfill.');
  await mongoose.disconnect();
  process.exit(0);
}

// Resolve IPs in batches of 100
const uniqueIps = [...new Set(usersWithIps.map(u => userIpMap.get(u._id.toString())))];
console.log(`\nResolving ${uniqueIps.length} unique IPs...`);

const ipGeoMap = new Map();
const BATCH_SIZE = 100;

for (let i = 0; i < uniqueIps.length; i += BATCH_SIZE) {
  const batch = uniqueIps.slice(i, i + BATCH_SIZE);
  try {
    const results = await resolveIPs(batch);
    for (const r of results) {
      if (r.status === 'success') {
        ipGeoMap.set(r.query, { country: r.countryCode, city: r.city, timezone: r.timezone });
      }
    }
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: resolved ${results.filter(r => r.status === 'success').length}/${batch.length}`);
  } catch (err) {
    console.error(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, err.message);
  }
  if (i + BATCH_SIZE < uniqueIps.length) await new Promise(r => setTimeout(r, 4000));
}

console.log(`Resolved ${ipGeoMap.size}/${uniqueIps.length} IPs\n`);

// Bulk update users
const bulkOps = [];
let skipped = 0;

for (const user of usersWithIps) {
  const ip = userIpMap.get(user._id.toString());
  const geo = ipGeoMap.get(ip);
  if (!geo) { skipped++; continue; }

  const tag = user.premium ? '⭐ PREMIUM' : '   free';
  console.log(`${DRY_RUN ? '[DRY] ' : ''}${tag}  ${(user.username || '?').padEnd(25)} → ${geo.country} / ${geo.city} / ${geo.timezone}`);

  if (!DRY_RUN) {
    bulkOps.push({
      updateOne: {
        filter: { _id: user._id },
        update: { $set: { ip, country: geo.country, city: geo.city, timezone: geo.timezone } },
      },
    });
  }
}

if (!DRY_RUN && bulkOps.length > 0) {
  const result = await usersCol.bulkWrite(bulkOps);
  console.log(`\nBulk updated ${result.modifiedCount} users`);
} else {
  console.log(`\n${DRY_RUN ? '[DRY RUN] Would update' : 'Updated'} ${usersWithIps.length - skipped} users, ${skipped} skipped (IP unresolvable)`);
}

await mongoose.disconnect();
