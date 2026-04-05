// MIGRATION: Rename creator Telegram group slugs to {username}-onlyfans-telegram
// NEVER change this pattern. Owner's explicit order.
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

async function main() {
  await mongoose.connect(MONGO_URI);
  const col = mongoose.connection.db.collection('groups');

  // Find groups with linkedCreatorSlug that have the WRONG slug pattern
  const groups = await col.find({
    linkedCreatorSlug: { $exists: true, $ne: '' },
    slug: { $not: { $regex: /-onlyfans-telegram$/ } },
  }).toArray();

  console.log(`Found ${groups.length} groups to rename to {username}-onlyfans-telegram\n`);

  let renamed = 0;
  let skipped = 0;

  for (const g of groups) {
    const oldSlug = g.slug;
    // Strip any existing suffixes and rebuild correctly
    const base = oldSlug.replace(/-telegram$/, '').replace(/-onlyfans$/, '');
    const newSlug = `${base}-onlyfans-telegram`;

    if (oldSlug === newSlug) {
      skipped++;
      continue;
    }

    const conflict = await col.findOne({ slug: newSlug });
    if (conflict) {
      console.log(`SKIP  ${oldSlug} → ${newSlug} (conflict exists)`);
      skipped++;
      continue;
    }

    await col.updateOne({ _id: g._id }, { $set: { slug: newSlug } });
    console.log(`OK    ${oldSlug} → ${newSlug}`);
    renamed++;
  }

  console.log(`\nDone. Renamed: ${renamed}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
