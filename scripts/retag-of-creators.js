/* eslint-disable */
/**
 * retag-of-creators.js
 * Cleans junk category tags and re-tags creators from bio/name/username/location signals.
 * Only uses valid OF category slugs. Caps at 4 tags (best-of spam guard).
 *
 * Run:  node scripts/retag-of-creators.js --dry-run
 * Apply: node scripts/retag-of-creators.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const DRY_RUN = process.argv.includes('--dry-run');
const MAX_CATEGORIES = 4;

const VALID_SLUGS = new Set([
  'asian', 'blonde', 'teen', 'milf', 'amateur', 'redhead', 'goth', 'petite', 'big-ass', 'big-boobs',
  'brunette', 'latina', 'ahegao', 'alt', 'cosplay', 'streamer', 'fitness', 'joi', 'lesbian', 'tattoo',
  'curvy', 'ebony', 'feet', 'lingerie', 'thick', 'twerk', 'squirt', 'piercing', 'bbw', 'bdsm', 'pornstar',
  'couple', 'nurse', 'arab', 'anal', 'asmr', 'influencer', 'celebrity', 'no-ppv', 'colombian', 'findom',
  'british', 'blowjob', 'student', 'roleplay', 'submissive', 'brazilian', 'chubby', 'pregnant', 'mature',
  'muscle', 'teacher', 'housewife',
]);

const RULES = [
  { slug: 'pornstar', re: /\bporn\s?star\b|adult film/i, neg: /not a porn|i am not a porn|i'm not a porn|never been a porn|not pornstar/i },
  { slug: 'celebrity', re: /\bcelebrity\b|\bceleb\b|famous/i },
  { slug: 'cosplay', re: /\bcosplay\b|cosplayer/i },
  { slug: 'streamer', re: /\bstreamer\b|\btwitch\b|\bgamer girl\b/i },
  { slug: 'asmr', re: /\basmr\b/i },
  { slug: 'blowjob', re: /\bblowjob\b|\bdeepthroat\b|\boral\b/i },
  { slug: 'bdsm', re: /\bbdsm\b|\bbondage\b|shibari|kinbaku/i },
  { slug: 'findom', re: /\bfindom\b|\bfemdom\b|dominatrix/i },
  { slug: 'couple', re: /\bcouple\b|boy girl|with my boyfriend|\bhotwife\b|\bcuckold\b/i },
  { slug: 'housewife', re: /\bhousewife\b|homemaker|hot mumma|hot mom\b/i },
  { slug: 'milf', re: /\bmilf\b|\bmommy\b|\bcougar\b/i },
  { slug: 'teen', re: /\bteen\b|18 ?yo\b|19 ?yo\b|just turned 18|college girl/i },
  { slug: 'lesbian', re: /\blesbian\b|girl on girl|lesbica/i },
  { slug: 'bbw', re: /\bbbw\b|\bchubby\b|plus size|plus-size/i },
  { slug: 'thick', re: /\bthick\b|\bthicc\b|\bcurvy\b/i },
  { slug: 'big-ass', re: /\bbig ass\b|\bbig booty\b|\bpawg\b|phat ass/i },
  { slug: 'big-boobs', re: /\bbig boobs\b|\bbig tits\b|\bbusty\b|\bhuge tits\b/i },
  { slug: 'petite', re: /\bpetite\b|\btiny\b|\bskinny\b|\bslim\b/i },
  { slug: 'ebony', re: /\bebony\b|black girl/i },
  { slug: 'latina', re: /\blatina\b|\blatin\b|colombian|mexican|hispanic/i },
  { slug: 'brazilian', re: /\bbrazilian\b|\bbrasil\b/i },
  { slug: 'colombian', re: /\bcolombian\b|colombiana/i },
  { slug: 'asian', re: /\basian\b|japanese|japan\b|korean|korea\b|chinese|china\b|thai\b|thailand|filipina|vietnamese|taiwan/i, neg: /\bindian\b|\bdesi\b|\bindia\b/i },
  { slug: 'blonde', re: /\bblonde\b|\bblond\b/i },
  { slug: 'brunette', re: /\bbrunette\b/i },
  { slug: 'redhead', re: /\bredhead\b|\bginger\b/i },
  { slug: 'goth', re: /\bgoth\b|gothic|\bemo\b/i },
  { slug: 'alt', re: /\balt girl\b|\balternative\b/i },
  { slug: 'ahegao', re: /\bahegao\b/i },
  { slug: 'fitness', re: /\bfitness\b|\bgym\b|athletic|\bfitc\b/i },
  { slug: 'lingerie', re: /\blingerie\b/i },
  { slug: 'feet', re: /\bfeet\b|\bfoot fetish\b|\bfootjob\b|\bsoles\b/i },
  { slug: 'squirt', re: /\bsquirt/i },
  { slug: 'anal', re: /\banal\b/i },
  { slug: 'joi', re: /\bjoi\b|jerk off instruct/i },
  { slug: 'tattoo', re: /\btattoo\b|inked|tatted/i },
  { slug: 'piercing', re: /\bpiercing\b|\bnipple ring/i },
  { slug: 'roleplay', re: /\broleplay\b|role play/i },
  { slug: 'teacher', re: /\bteacher\b|professor/i },
  { slug: 'student', re: /\bstudent\b|\bcollege\b/i },
  { slug: 'nurse', re: /\bnurse\b/i },
  { slug: 'amateur', re: /\bamateur\b/i },
  { slug: 'influencer', re: /\binfluencer\b|instagram model|\binsta model\b/i },
  { slug: 'arab', re: /\barab\b|\bhijab\b|\bmuslim\b/i },
  { slug: 'no-ppv', re: /\bno ppv\b|no paywall|free page/i },
  { slug: 'pregnant', re: /\bpregnant\b/i },
  { slug: 'mature', re: /\bmature\b/i },
  { slug: 'muscle', re: /\bmuscle\b|bodybuilder/i },
  { slug: 'british', re: /\bbritish\b|\buk girl\b|england/i },
  { slug: 'submissive', re: /\bsubmissive\b|\bsub\b/i },
  { slug: 'twerk', re: /\btwerk/i },
];

const PRIORITY = new Map(RULES.map((r, i) => [r.slug, i]));

function combinedText(doc) {
  return [doc.name, doc.username, doc.bio, doc.location].filter(Boolean).join(' ');
}

function detectSlugs(doc) {
  const text = combinedText(doc);
  const hits = new Set();
  for (const { slug, re, neg } of RULES) {
    if (!re.test(text)) continue;
    if (neg && neg.test(text)) continue;
    hits.add(slug);
  }
  if (doc.isFree) hits.add('no-ppv');
  return hits;
}

function buildCategories(doc) {
  const detected = detectSlugs(doc);
  const existingValid = (doc.categories || []).filter((c) => VALID_SLUGS.has(String(c).toLowerCase()));
  const merged = new Set([...existingValid, ...detected]);
  const sorted = [...merged].sort((a, b) => (PRIORITY.get(a) ?? 999) - (PRIORITY.get(b) ?? 999));
  return sorted.slice(0, MAX_CATEGORIES);
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  const col = mongoose.connection.db.collection('onlyfanscreators');

  const cursor = col.find(
    { deleted: { $ne: true }, gender: 'female' },
    { projection: { categories: 1, bio: 1, name: 1, username: 1, location: 1, isFree: 1 } },
  );

  const ops = [];
  const stats = {
    scanned: 0,
    changed: 0,
    junkRemoved: 0,
    added: { pornstar: 0, blowjob: 0, couple: 0, bdsm: 0, asmr: 0, housewife: 0, bbw: 0 },
    trimmedOver4: 0,
  };

  for await (const doc of cursor) {
    stats.scanned++;
    const old = [...(doc.categories || [])];
    const next = buildCategories(doc);
    const oldValid = old.filter((c) => VALID_SLUGS.has(String(c).toLowerCase()));
    const oldJunk = old.length - oldValid.length;
    if (oldJunk > 0) stats.junkRemoved++;

    if (old.length > MAX_CATEGORIES) stats.trimmedOver4++;

    if (arraysEqual(old, next)) continue;

    stats.changed++;
    for (const slug of ['pornstar', 'blowjob', 'couple', 'bdsm', 'asmr', 'housewife', 'bbw']) {
      if (next.includes(slug) && !oldValid.includes(slug)) stats.added[slug]++;
    }

    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { categories: next } },
      },
    });
  }

  console.log(`Scanned: ${stats.scanned}`);
  console.log(`Will update: ${stats.changed} (dry=${DRY_RUN})`);
  console.log(`Creators with junk tags cleaned: ${stats.junkRemoved}`);
  console.log(`Creators trimmed from >4 tags: ${stats.trimmedOver4}`);
  console.log('\nNew tags added:');
  for (const [k, v] of Object.entries(stats.added)) console.log(`  ${k}: +${v}`);

  if (!DRY_RUN && ops.length > 0) {
    console.log(`\nWriting ${ops.length} updates...`);
    for (let i = 0; i < ops.length; i += 500) {
      await col.bulkWrite(ops.slice(i, i + 500), { ordered: false });
      process.stdout.write(`  ${Math.min(i + 500, ops.length)}/${ops.length}\r`);
    }
    console.log('\nDone.');
  } else if (DRY_RUN) {
    console.log('\n[DRY RUN — no writes]');
  }

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
