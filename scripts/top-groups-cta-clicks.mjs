#!/usr/bin/env node
/**
 * One-off analytics: Top groups by CTA (join) clicks.
 * clickCount = tracked on the "Join / View on Telegram" CTA button.
 * Run: node --env-file=.env.local scripts/top-groups-cta-clicks.mjs
 */
import mongoose from 'mongoose';
import 'dotenv/config';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Missing MONGODB_URI');
  process.exit(1);
}

const groupSchema = new mongoose.Schema({}, { strict: false, collection: 'groups' });
const Group = mongoose.model('Group', groupSchema);

async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10); // YYYY-MM-DD

  // 1) Lifetime totals
  const [lifetimeAgg] = await Group.aggregate([
    { $match: { status: 'approved', isAdvertisement: { $ne: true } } },
    { $group: { _id: null, totalClicks: { $sum: '$clickCount' }, groupCount: { $sum: 1 } } },
  ]);

  const totalLifetimeCtaClicks = lifetimeAgg?.totalClicks || 0;
  const approvedGroupCount = lifetimeAgg?.groupCount || 0;

  console.log('\n=== GROUPS CTA CLICKS (join button) ===');
  console.log(`Approved non-ad groups: ${approvedGroupCount}`);
  console.log(`Lifetime total CTA clicks (all groups): ${totalLifetimeCtaClicks.toLocaleString()}`);

  // 2) Top 20 by lifetime clickCount
  const topLifetime = await Group.find({
    status: 'approved',
    isAdvertisement: { $ne: true },
  })
    .sort({ clickCount: -1 })
    .limit(20)
    .select('name slug clickCount weeklyClicks lastClickedAt')
    .lean();

  console.log('\n--- TOP 20 GROUPS BY LIFETIME CTA CLICKS ---');
  topLifetime.forEach((g, i) => {
    console.log(`${(i + 1).toString().padStart(2)}. ${g.name}  —  ${ (g.clickCount || 0).toLocaleString() } clicks  (weekly: ${g.weeklyClicks || 0})`);
  });

  // 3) Attempt to compute "last ~30d" from clickCountByDay map (if history exists)
  // clickCountByDay is a Map stored as object in Mongo: { "2026-06-01": 12, ... }
  const recentByGroup = await Group.aggregate([
    { $match: { status: 'approved', isAdvertisement: { $ne: true }, clickCountByDay: { $exists: true, $ne: {} } } },
    { $project: {
        name: 1,
        slug: 1,
        clickCount: 1,
        recentClicks: {
          $sum: {
            $map: {
              input: { $objectToArray: '$clickCountByDay' },
              as: 'd',
              in: {
                $cond: [
                  { $gte: ['$$d.k', thirtyDaysAgoStr] },
                  '$$d.v',
                  0
                ]
              }
            }
          }
        }
      }
    },
    { $match: { recentClicks: { $gt: 0 } } },
    { $sort: { recentClicks: -1 } },
    { $limit: 20 }
  ]);

  if (recentByGroup.length > 0) {
    console.log('\n--- TOP 20 BY CTA CLICKS IN LAST ~30 DAYS (from daily map) ---');
    recentByGroup.forEach((g, i) => {
      console.log(`${(i + 1).toString().padStart(2)}. ${g.name}  —  ${ (g.recentClicks || 0).toLocaleString() } recent clicks  (lifetime: ${(g.clickCount || 0).toLocaleString()})`);
    });

    const sumRecent = recentByGroup.reduce((s, g) => s + (g.recentClicks || 0), 0);
    console.log(`\nSum of recent clicks among these top 20 (last~30d): ${sumRecent.toLocaleString()}`);
  } else {
    console.log('\n(No per-day history found in clickCountByDay for last 30d. The map may be pruned or not populated for many groups.)');
  }

  // 4) Grand total of clicks recorded in clickCountByDay across all (for sanity)
  const dailyTotalAgg = await Group.aggregate([
    { $match: { status: 'approved', isAdvertisement: { $ne: true } } },
    { $project: { arr: { $objectToArray: '$clickCountByDay' } } },
    { $unwind: { path: '$arr', preserveNullAndEmptyArrays: true } },
    { $group: { _id: null, totalDailyClicks: { $sum: '$arr.v' } } },
  ]);
  const totalDailyClicksRecorded = dailyTotalAgg[0]?.totalDailyClicks || 0;
  console.log(`\n(Info) Sum of all clickCountByDay values ever recorded: ${totalDailyClicksRecorded.toLocaleString()}`);
  console.log('(Note: clickCountByDay keys may have been cleaned in the past; lifetime clickCount is the reliable total.)');

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
