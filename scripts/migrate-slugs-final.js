const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const groupsCol = db.collection('groups');
  const creatorsCol = db.collection('onlyfanscreators');

  // 1. Rename telegram groups: {name}-onlyfans → {name}-telegram
  console.log('=== STEP 1: Rename telegram group slugs ===\n');
  const tgGroups = await groupsCol.find({
    linkedCreatorSlug: { $exists: true, $ne: '' },
  }).toArray();

  let tgRenamed = 0;
  for (const g of tgGroups) {
    const oldSlug = g.slug;
    const newSlug = oldSlug.replace(/-onlyfans-telegram$/, '-telegram').replace(/-onlyfans$/, '-telegram');
    if (oldSlug === newSlug) {
      console.log(`SKIP  ${oldSlug} (already correct)`);
      continue;
    }
    const conflict = await groupsCol.findOne({ slug: newSlug });
    if (conflict) {
      console.log(`SKIP  ${oldSlug} → ${newSlug} (conflict)`);
      continue;
    }
    await groupsCol.updateOne({ _id: g._id }, { $set: { slug: newSlug } });
    console.log(`OK    ${oldSlug} → ${newSlug}`);
    tgRenamed++;
  }
  console.log(`\nTelegram groups renamed: ${tgRenamed}\n`);

  // 2. Rename creator slugs: {username} → {username}-onlyfans
  console.log('=== STEP 2: Rename creator profile slugs ===\n');
  const creators = await creatorsCol.find({
    adminImported: true,
    deleted: { $ne: true },
    slug: { $not: /-onlyfans$/ },
  }).toArray();

  let crRenamed = 0;
  for (const c of creators) {
    const oldSlug = c.slug;
    const newSlug = `${oldSlug}-onlyfans`;
    const conflict = await creatorsCol.findOne({ slug: newSlug });
    if (conflict) {
      console.log(`SKIP  ${oldSlug} → ${newSlug} (conflict)`);
      continue;
    }
    await creatorsCol.updateOne({ _id: c._id }, { $set: { slug: newSlug } });
    console.log(`OK    ${oldSlug} → ${newSlug}`);
    crRenamed++;
  }
  console.log(`\nCreator profiles renamed: ${crRenamed}\n`);

  // 3. Update linkedCreatorSlug on telegram groups to match new creator slugs
  console.log('=== STEP 3: Update linkedCreatorSlug on telegram groups ===\n');
  const updatedGroups = await groupsCol.find({
    linkedCreatorSlug: { $exists: true, $ne: '' },
  }).toArray();

  let linkedUpdated = 0;
  for (const g of updatedGroups) {
    const oldLinked = g.linkedCreatorSlug;
    const newLinked = oldLinked.endsWith('-onlyfans') ? oldLinked : `${oldLinked}-onlyfans`;
    if (oldLinked === newLinked) continue;
    // Verify the creator exists with the new slug
    const exists = await creatorsCol.findOne({ slug: newLinked });
    if (!exists) {
      console.log(`SKIP  linked ${oldLinked} → ${newLinked} (creator not found)`);
      continue;
    }
    await groupsCol.updateOne({ _id: g._id }, { $set: { linkedCreatorSlug: newLinked } });
    console.log(`OK    linked ${oldLinked} → ${newLinked}`);
    linkedUpdated++;
  }
  console.log(`\nLinked slugs updated: ${linkedUpdated}\n`);

  console.log('=== DONE ===');
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
