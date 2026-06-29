/* eslint-disable */
// ONE-TIME BACKFILL — move historical OnlyFans click history into the ONE unified store
// (CampaignClick + Campaign.clicks), so cutting over to unified tracking loses NOTHING.
//
// Sources of old OF clicks (now frozen):
//   - TrendingClickDaily { creatorId, date, clicks }   (per-day, keyed by TrendingOFCreator._id)
//   - TrendingOFCreator.clicks                          (lifetime counter; may exceed the daily rows)
//
// For each TrendingOFCreator that has a linkedCampaignId:
//   1. Insert one CampaignClick row per old click, dated to its TrendingClickDaily.date
//      (noon UTC), placement 'of-cat:backfill'. Period stats (24h/7d/30d) stay correct.
//   2. Any lifetime remainder (cr.clicks - sum(daily)) → dated to the slot's oldest known day
//      (or createdAt), so the lifetime total matches.
//   3. Bump Campaign.clicks by the inserted count.
//
// Idempotent guard: skips any campaign that already has 'of-cat:backfill' rows.
//
// DEFAULT = DRY RUN (writes nothing, prints the plan). Pass --commit to write.
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const COMMIT = process.argv.includes('--commit');
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

function dayToDate(ymd) {
  // "YYYY-MM-DD" -> Date at 12:00:00 UTC (stable mid-day so it lands in the right day bucket).
  return new Date(`${ymd}T12:00:00.000Z`);
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const trending = db.collection('trendingofcreators');
  const campaigns = db.collection('campaigns');
  const clicks = db.collection('campaignclicks');
  const daily = db.collection('trendingclickdailies');

  const slots = await trending.find({ linkedCampaignId: { $ne: null } }).toArray();
  console.log(`\n=== BACKFILL ${COMMIT ? '(COMMIT)' : '(DRY RUN — no writes)'} ===`);
  console.log(`${slots.length} promoted creators with a linked campaign\n`);

  let totalRows = 0;
  let skipped = 0;
  let creatorsWithHistory = 0;

  for (const s of slots) {
    const campId = s.linkedCampaignId;

    // Idempotency: already backfilled?
    const already = await clicks.findOne({ campaignId: campId, placement: 'of-cat:backfill' });
    if (already) {
      skipped++;
      console.log(`  @${s.username}: SKIP (already backfilled)`);
      continue;
    }

    const dailyRows = await daily.find({ creatorId: s._id }).toArray();
    const dailySum = dailyRows.reduce((n, r) => n + (r.clicks || 0), 0);
    const lifetime = s.clicks || 0;
    const remainder = Math.max(lifetime - dailySum, 0);

    const planned = dailySum + remainder;
    if (planned === 0) {
      console.log(`  @${s.username}: 0 historical clicks → nothing to backfill`);
      continue;
    }
    creatorsWithHistory++;

    // Oldest known day for the remainder bucket.
    let oldestDay = null;
    for (const r of dailyRows) if (!oldestDay || r.date < oldestDay) oldestDay = r.date;
    const remainderDate = oldestDay
      ? dayToDate(oldestDay)
      : (s.createdAt ? new Date(s.createdAt) : new Date('2025-01-01T12:00:00.000Z'));

    console.log(`  @${s.username}: daily=${dailySum} + remainder=${remainder} = ${planned} rows → campaign ${campId}`);
    totalRows += planned;

    if (COMMIT) {
      const docs = [];
      for (const r of dailyRows) {
        const n = r.clicks || 0;
        const when = dayToDate(r.date);
        for (let i = 0; i < n; i++) docs.push({ campaignId: campId, clickedAt: when, placement: 'of-cat:backfill' });
      }
      for (let i = 0; i < remainder; i++) docs.push({ campaignId: campId, clickedAt: remainderDate, placement: 'of-cat:backfill' });

      // Insert in chunks to stay well under request limits.
      for (let i = 0; i < docs.length; i += 5000) {
        await clicks.insertMany(docs.slice(i, i + 5000), { ordered: false });
      }
      await campaigns.updateOne({ _id: campId }, { $inc: { clicks: planned } });
    }
  }

  console.log(`\n--- SUMMARY ---`);
  console.log(`creators with history: ${creatorsWithHistory}`);
  console.log(`skipped (already done): ${skipped}`);
  console.log(`CampaignClick rows ${COMMIT ? 'INSERTED' : 'WOULD insert'}: ${totalRows}`);
  if (!COMMIT) console.log(`\nDRY RUN only. Re-run with --commit to write.`);

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
