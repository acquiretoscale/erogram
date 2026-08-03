/**
 * Add country category from bio flag emoji — add-only ($addToSet).
 * Only creators missing that country category get the tag.
 *
 * Dry-run: node scripts/add-flag-country-categories.mjs --dry-run
 * Apply:    node scripts/add-flag-country-categories.mjs
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const DRY_RUN = process.argv.includes('--dry-run');

const FLAG_RE = /[\u{1F1E6}-\u{1F1FF}]{2}/gu;

function flagToIso(flag) {
  const A = 0x1f1e6;
  const c1 = flag.codePointAt(0);
  const c2 = flag.codePointAt(2);
  if (c1 < A || c1 > 0x1f1ff || c2 < A || c2 > 0x1f1ff) return null;
  return String.fromCharCode(c1 - A + 65) + String.fromCharCode(c2 - A + 65);
}

function extractIsos(bio) {
  if (!bio) return [];
  return [...new Set([...bio.matchAll(FLAG_RE)].map((m) => flagToIso(m[0])).filter(Boolean))];
}

/** ISO 3166-1 alpha-2 → DB category slug */
const ISO_TO_SLUG = {
  US: 'american', GB: 'british', CA: 'canadian', AU: 'australian', DE: 'german', FR: 'french',
  ES: 'spanish', IT: 'italian', BR: 'brazilian', MX: 'mexican', CO: 'colombian', AR: 'argentinian',
  JP: 'japanese', KR: 'korean', CN: 'chinese', TW: 'taiwanese', TH: 'thai', PH: 'filipina',
  MY: 'malaysian', SG: 'singaporean', MA: 'moroccan', TR: 'turkish', UA: 'ukrainian', PL: 'polish',
  NL: 'dutch', RO: 'romanian', RU: 'russian', GR: 'greek', CZ: 'czech', SK: 'slovak', SE: 'swedish',
  IE: 'irish', NO: 'norwegian', FI: 'finnish', HR: 'croatian', BG: 'bulgarian', CL: 'chilean',
  PE: 'peruvian', EC: 'ecuadorian', PR: 'puerto-rican', NZ: 'new-zealand', IR: 'persian',
  GE: 'georgian', CU: 'cuban', AT: 'austrian', CH: 'swiss', PT: 'portuguese', ZA: 'south-african',
  VE: 'venezuelan', HU: 'hungarian', DO: 'dominican', IN: 'indian', HN: 'honduran', PK: 'pakistani',
  UY: 'uruguayan', IL: 'israeli', BE: 'belgian', HK: 'hong-kong', BO: 'bolivian', PA: 'panamanian',
  NG: 'nigerian', KZ: 'kazakh', VN: 'vietnamese', JM: 'jamaican', AE: 'emirati', MD: 'moldovan',
  MT: 'maltese', LV: 'latvian', EG: 'egyptian', UZ: 'uzbek', CY: 'cypriot', TT: 'trinidadian',
  RS: 'serbian', AL: 'albanian', ME: 'montenegrin', AM: 'armenian', SV: 'salvadoran', BS: 'bahamian',
  ID: 'indonesian', EE: 'estonian', DK: 'danish', HT: 'haitian', PS: 'palestinian', GT: 'guatemalan',
  CR: 'costa-rican', MO: 'macanese', LU: 'luxembourgish', BA: 'bosnian', TM: 'turkmen', KG: 'kyrgyz',
  AZ: 'azerbaijani', LB: 'lebanese', GH: 'ghanaian', LR: 'liberian', SC: 'seychellois', DZ: 'algerian',
  KH: 'cambodian', NP: 'nepalese', MC: 'monacan', LT: 'lithuanian', MK: 'macedonian', ET: 'ethiopian',
  KY: 'caymanian', SA: 'saudi', NI: 'nicaraguan', VG: 'virgin-islander', TN: 'tunisian', FJ: 'fijian',
  BB: 'barbadian', MG: 'malagasy', UM: 'um', EA: 'ea', EU: 'eu', VA: 'vatican', RA: 'ra', EM: 'em',
  UR: 'ur', SU: 'su', CP: 'cp',
};

/** Treat these existing tags as already having the country */
const SLUG_ALIASES = {
  american: ['american', 'usa'],
  british: ['british', 'uk'],
  colombian: ['colombian', 'colombia'],
  brazilian: ['brazilian', 'brazil'],
  mexican: ['mexican', 'mexico'],
  argentinian: ['argentinian', 'argentina'],
  german: ['german', 'germany'],
  french: ['french', 'france'],
  spanish: ['spanish', 'spain'],
  italian: ['italian', 'italy'],
  japanese: ['japanese', 'japan'],
  greek: ['greek', 'greece'],
  moroccan: ['moroccan', 'morocco'],
  ukrainian: ['ukrainian', 'ukraine'],
  polish: ['polish', 'poland'],
  dutch: ['dutch', 'netherlands'],
  romanian: ['romanian', 'romania'],
  russian: ['russian', 'russia'],
  peruvian: ['peruvian', 'peru'],
  chilean: ['chilean', 'chile'],
  ecuadorian: ['ecuadorian', 'ecuador'],
  taiwanese: ['taiwanese', 'taiwan'],
  thai: ['thai', 'thailand'],
  filipina: ['filipina', 'philippines', 'filipino'],
  malaysian: ['malaysian', 'malaysia'],
  singaporean: ['singaporean', 'singapore'],
  chinese: ['chinese', 'china'],
  korean: ['korean', 'south-korean', 'korea'],
  persian: ['persian', 'iranian', 'iran'],
  australian: ['australian', 'australia'],
  canadian: ['canadian', 'canada'],
  turkish: ['turkish', 'turkish'],
  indian: ['indian', 'india'],
  vietnamese: ['vietnamese', 'vietnam'],
  indonesian: ['indonesian', 'indonesia'],
  georgian: ['georgian'],
};

function norm(s) {
  return String(s || '').toLowerCase().trim();
}

function hasCountryCategory(categories, slug) {
  const set = new Set((categories || []).map(norm));
  const aliases = SLUG_ALIASES[slug] || [slug];
  return aliases.some((a) => set.has(a));
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const col = mongoose.connection.collection('onlyfanscreators');

  const docs = await col.find({ deleted: { $ne: true }, bio: { $exists: true, $nin: [null, ''] } })
    .project({ username: 1, bio: 1, categories: 1 })
    .toArray();

  const withFlags = docs.filter((d) => FLAG_RE.test(d.bio || ''));
  FLAG_RE.lastIndex = 0;

  let creatorsPatched = 0;
  let tagsAdded = 0;
  const bySlug = new Map();
  const samples = [];

  for (const doc of withFlags) {
    const isos = extractIsos(doc.bio);
    const toAdd = [];
    for (const iso of isos) {
      const slug = ISO_TO_SLUG[iso];
      if (!slug) continue;
      if (hasCountryCategory(doc.categories, slug)) continue;
      toAdd.push(slug);
      bySlug.set(slug, (bySlug.get(slug) || 0) + 1);
    }
    if (!toAdd.length) continue;

    creatorsPatched++;
    tagsAdded += toAdd.length;
    if (samples.length < 8) {
      samples.push({ username: doc.username, add: toAdd, had: doc.categories || [] });
    }

    if (!DRY_RUN) {
      await col.updateOne({ _id: doc._id }, { $addToSet: { categories: { $each: toAdd } } });
    }
  }

  const ranked = [...bySlug.entries()].sort((a, b) => b[1] - a[1]);
  console.log(DRY_RUN ? 'DRY RUN' : 'APPLIED');
  console.log('Creators with flag in bio:', withFlags.length);
  console.log('Creators patched:', creatorsPatched);
  console.log('Tags added:', tagsAdded);
  console.log('\nBy slug:');
  for (const [slug, n] of ranked) console.log(`${n}\t${slug}`);
  console.log('\nSamples:');
  for (const s of samples) console.log(JSON.stringify(s));

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
