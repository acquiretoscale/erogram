/**
 * Add-only category tags for arab / moroccan / hijabi / muslim signals.
 *
 * Dry-run: node --env-file=.env.local scripts/add-arab-moroccan-hijabi-tags.mjs --dry-run
 * Apply:   node --env-file=.env.local scripts/add-arab-moroccan-hijabi-tags.mjs
 */
import mongoose from 'mongoose';

const DRY_RUN = process.argv.includes('--dry-run');

const P = {
  moroccan: /\b(morocco|moroccan|maroc|casablanca)\b/i,
  hijabi: /\bhijab\b|hijabi|hijabis|#hijab\b|#hijabi\b/i,
  muslim: /\bmuslim\b|muslimah|#muslim\b|#muslimah\b|🧕|مسلم|الحجاب/i,
  arab_word: /\barab\b|\barabic\b|\barabian\b|\barabe\b|#arab\b|#arabic\b|middle eastern/i,
  arab_country: /\b(saudi|emirati|uae|dubai|qatar|kuwait|bahrain|oman|lebanon|lebanese|syria|syrian|palestine|palestinian|jordan|jordanian|iraq|iraqi|egypt|egyptian|yemen|yemeni|morocco|moroccan|algeria|algerian|tunisia|tunisian|libya|libyan|gulf|maroc|casablanca)\b/i,
  arabic_script: /[\u0600-\u06FF]/,
  arab_username: /arab|hijab|muslim|saudi|emirat|dubai|leban|iraq|egypt|morocc|turk|persian|halal|niqab/i,
};

function hasTag(cats = [], slug) {
  return cats.some((c) => String(c).toLowerCase() === slug);
}

function text(d) {
  return [d.name, d.username, d.bio, d.location].filter(Boolean).join(' ');
}

function matchesArab(d) {
  return (
    P.arab_word.test(text(d)) ||
    P.arab_country.test(text(d)) ||
    P.arabic_script.test(d.bio || '') ||
    P.arab_username.test(d.username || '') ||
    P.arab_username.test(d.name || '')
  );
}

function tagsForDoc(d) {
  const out = new Set();
  if (matchesArab(d)) out.add('arab');
  if (P.moroccan.test(text(d))) out.add('moroccan');
  if (P.hijabi.test(text(d))) out.add('hijabi');
  if (P.muslim.test(text(d))) out.add('muslim');
  return out;
}

function canAddTag(cats, slug) {
  return !hasTag(cats, slug);
}

await mongoose.connect(process.env.MONGODB_URI);
const col = mongoose.connection.collection('onlyfanscreators');
const docs = await col
  .find({ deleted: { $ne: true }, gender: 'female' })
  .project({ username: 1, categories: 1, name: 1, bio: 1, location: 1 })
  .toArray();

const stats = { arab: 0, moroccan: 0, hijabi: 0, muslim: 0 };
const bulk = [];

for (const d of docs) {
  const cats = (d.categories || []).map((c) => String(c).toLowerCase());
  const wanted = tagsForDoc(d);
  const toAdd = [];
  for (const slug of wanted) {
    if (canAddTag(cats, slug)) {
      toAdd.push(slug);
      stats[slug] += 1;
    }
  }
  if (toAdd.length) {
    bulk.push({
      updateOne: {
        filter: { _id: d._id },
        update: { $addToSet: { categories: { $each: toAdd } } },
      },
    });
  }
}

console.log(`Female creators scanned: ${docs.length}`);
console.log(`Would add — arab: ${stats.arab}, moroccan: ${stats.moroccan}, hijabi: ${stats.hijabi}, muslim: ${stats.muslim}`);
console.log(`Bulk ops: ${bulk.length}`);

if (!DRY_RUN && bulk.length) {
  const res = await col.bulkWrite(bulk, { ordered: false });
  console.log('Applied:', res.modifiedCount, 'docs modified');
} else if (DRY_RUN) {
  console.log('DRY RUN — no writes');
}

await mongoose.disconnect();
