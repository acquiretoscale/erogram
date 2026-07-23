/* eslint-disable */
/**
 * Fix starred premium vault group categories for Top-10 niche matching.
 *
 *   node scripts/fix-vault-categories.js --dry-run
 *   node scripts/fix-vault-categories.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const DRY = process.argv.includes('--dry-run');
const MONGO = process.env.MONGODB_URI;
if (!MONGO) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

/** slug → { category, categories, country? } — primary = Top-10 niche slot */
const SLUG_FIXES = {
  'femaleblowjob-18-deepthroat-cumshot-oralsex-blowjob-bukkake': {
    category: 'Blowjob',
    categories: ['Blowjob', 'Deepthroat', 'Bukkake', 'Russian'],
  },
  'onlyfans-free-1': { category: 'Onlyfans', categories: ['Onlyfans', 'Russian'] },
  'onlyfans-gratuitos': { category: 'Onlyfans', categories: ['Onlyfans', 'Cosplay', 'Anime', 'Russian'] },
  'milf-production': { category: 'MILF', categories: ['MILF', '3D Hentai', 'Doujin & Manga', 'Live Cam'] },
  '-38': { category: 'Feet', categories: ['Feet', 'Russian', 'Ukraine'] },
  '-36': { category: 'Feet', categories: ['Feet', 'Russian'] },
  '-64': { category: 'BDSM', categories: ['BDSM', 'Fetish', 'Russian'] },
  'barbie-of': { category: 'Onlyfans', categories: ['Onlyfans', 'MILF', 'Latina'] },
  'saraofficial-of': { category: 'Onlyfans', categories: ['Onlyfans', 'Cosplay'] },
  'brendi-sg-oficial': { category: 'Onlyfans', categories: ['Onlyfans', 'Blonde'] },
  'anastaisime': { category: 'Onlyfans', categories: ['Onlyfans', 'Instagram Models', 'Russian'] },
  '-12': { category: 'Feet', categories: ['Feet', 'Russian', 'Asian'] },
  'adriana-olivarez': { category: 'Onlyfans', categories: ['Onlyfans', 'Amateur', 'Latina'] },
  'robertita-franco-roberta-franco': { category: 'Latina', categories: ['Latina', 'Onlyfans'] },
  'sabrina-andreina': { category: 'Latina', categories: ['Latina', 'Onlyfans', 'Colombia'], country: 'Colombia' },
  'jessica-sodi': { category: 'Latina', categories: ['Latina', 'Onlyfans', 'Colombia'], country: 'Colombia' },
  'brenda-aguiar': { category: 'Latina', categories: ['Latina', 'Onlyfans', 'Colombia'], country: 'Colombia' },
  'isabela-ramirez': { category: 'Latina', categories: ['Latina', 'Onlyfans', 'Colombia'], country: 'Colombia' },
  'kimberly-delgado': { category: 'Latina', categories: ['Latina', 'Onlyfans', 'Colombia'], country: 'Colombia' },
  'asianparadiseee-official': { category: 'Asian', categories: ['Asian', 'Onlyfans', 'Brazil'], country: 'Brazil' },
  'yosoykami-official': { category: 'Latina', categories: ['Latina', 'Onlyfans', 'Spain'] },
  'hot-asian': { category: 'Asian', categories: ['Asian', 'Russian'] },
  'lacarboni': { category: 'Latina', categories: ['Latina', 'Onlyfans', 'Russian'] },
  'only-spain': { category: 'Spain', categories: ['Spain', 'Onlyfans', 'Italy'] },
  'giulia-vaneri-channel': { category: 'Latina', categories: ['Latina', 'Onlyfans', 'Instagram Models', 'Italy'] },
  'the-real-diabla': { category: 'Latina', categories: ['Latina', 'Onlyfans', 'Pornhub'] },
  'patricia-castillo': { category: 'Latina', categories: ['Latina', 'Onlyfans', 'Instagram Models'] },
  'natalee007': { category: 'Latina', categories: ['Latina', 'Onlyfans', 'Instagram Models', 'TikTok'] },
  'elenamars': { category: 'Latina', categories: ['Latina', 'Onlyfans', 'Instagram Models', 'Italy'] },
  'peralta-laura': { category: 'Onlyfans', categories: ['Onlyfans', 'Amateur', 'Latina'] },
  'jenny-bm': { category: 'Onlyfans', categories: ['Onlyfans', 'Amateur', 'Latina'] },
  '-5': { category: 'Cosplay', categories: ['Cosplay', 'China', 'Asian'] },
  'itatijoss-onlyfans': { category: 'Onlyfans', categories: ['Onlyfans', 'Asian', 'Colombia'], country: 'Colombia' },
  'laalemonz-official-tg': { category: 'Onlyfans', categories: ['Onlyfans', 'Big Tits', 'Blonde'] },
  'rossita-vip': { category: 'Onlyfans', categories: ['Onlyfans', 'Latina'] },
  'laura-cookie': { category: 'Onlyfans', categories: ['Onlyfans', 'Latina'] },
  'marel-onlyfans': { category: 'Onlyfans', categories: ['Onlyfans', 'Latina'] },
  'staisyyfox': { category: 'Onlyfans', categories: ['Onlyfans', 'Latina'] },
  'pika-chew': { category: 'Onlyfans', categories: ['Onlyfans', 'Latina'] },
  'missmiafit': { category: 'Onlyfans', categories: ['Onlyfans', 'Latina'] },
  'greta-de-santi-official-onlyfans': { category: 'Onlyfans', categories: ['Onlyfans', 'Latina'] },
  'best-onlyfans-1': { category: 'Onlyfans', categories: ['Onlyfans', 'Latina'] },
};

const INVALID_CATS = new Set(['Facial', 'Fitness']);

function uniq(arr) {
  const out = [];
  for (const x of arr || []) {
    const v = String(x || '').trim();
    if (!v || INVALID_CATS.has(v) || out.includes(v)) continue;
    out.push(v);
  }
  return out;
}

function normalizeCategories(primary, categories) {
  const cats = uniq(categories);
  if (primary && !cats.includes(primary)) cats.unshift(primary);
  return cats.slice(0, 5);
}

(async () => {
  await mongoose.connect(MONGO);
  const col = mongoose.connection.db.collection('groups');
  const starred = await col.find({
    premiumOnly: true,
    status: 'approved',
    showOnVaultTeaser: true,
  }).toArray();

  let updated = 0;
  for (const g of starred) {
    const fix = SLUG_FIXES[g.slug];
    const next = {
      category: fix?.category || g.category,
      categories: normalizeCategories(
        fix?.category || g.category,
        fix?.categories || (g.categories?.length ? g.categories : [g.category]),
      ),
      vaultCategories: [],
    };
    if (fix?.country) next.country = fix.country;

    // Ensure primary is first tag in categories
    if (next.category && next.categories[0] !== next.category) {
      next.categories = normalizeCategories(next.category, next.categories);
    }

    const changed =
      g.category !== next.category ||
      JSON.stringify(g.categories || []) !== JSON.stringify(next.categories) ||
      (g.vaultCategories || []).length > 0 ||
      (fix?.country && g.country !== fix.country);

    if (!changed) continue;

    console.log(`${DRY ? '[dry-run] ' : ''}${g.slug}`);
    console.log(`  ${g.category} → ${next.category}`);
    console.log(`  categories: ${JSON.stringify(g.categories || [])} → ${JSON.stringify(next.categories)}`);
    if ((g.vaultCategories || []).length) console.log(`  vaultCategories cleared: ${JSON.stringify(g.vaultCategories)}`);
    if (fix?.country && g.country !== fix.country) console.log(`  country: ${g.country} → ${fix.country}`);

    if (!DRY) {
      const $set = {
        category: next.category,
        categories: next.categories,
        vaultCategories: [],
      };
      if (fix?.country) $set.country = fix.country;
      await col.updateOne({ _id: g._id }, { $set });
    }
    updated++;
  }

  console.log(`\n${DRY ? 'Would update' : 'Updated'} ${updated} starred vault groups.`);

  // Coverage report for active Top-10 category pages
  const counts = await col.aggregate([
    { $match: { premiumOnly: true, status: 'approved', showOnVaultTeaser: true } },
    {
      $project: {
        tags: {
          $setUnion: [
            { $cond: [{ $ne: ['$category', ''] }, ['$category'], []] },
            { $ifNull: ['$categories', []] },
          ],
        },
      },
    },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ]).toArray();

  console.log('\nStarred groups per niche tag (category + categories):');
  counts.slice(0, 30).forEach((c) => console.log(`  ${String(c.n).padStart(3)}  ${c._id}`));

  await mongoose.disconnect();
})();
