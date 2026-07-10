/* eslint-disable */
// READ-ONLY: mine BIO + categories of servable creators to find buildable categories.
// Two outputs:
//   (A) Candidate categories (competitor-inspired) -> how many of OUR creators match (bio OR category).
//   (B) Raw most-frequent words across all bios (discovery: what keywords are actually rich in our data).
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const R2 = process.env.R2_PUBLIC_URL || '';
let avatarMatch = { $ne: '' };
try { if (R2) { const host = new URL(R2).host; avatarMatch = { $regex: host, $options: 'i' }; } } catch {}

// Candidate categories -> regex terms to look for in bio/categories (word-boundary, case-insensitive).
const CANDIDATES = {
  'Blonde': ['blonde', 'blond'],
  'Brunette': ['brunette'],
  'Redhead': ['redhead', 'ginger', 'red head'],
  'Busty': ['busty', 'big boobs', 'big tits', 'big-boobs', 'huge tits', 'big naturals', 'titty', 'titties'],
  'Teen': ['teen', '18 ?yo', '19 ?yo', 'just turned 18', 'college girl'],
  'Asian': ['asian'],
  'Latina': ['latina', 'latin'],
  'American': ['american', 'usa', 'united states'],
  'Australian': ['australian', 'aussie', 'australia'],
  'Hispanic': ['hispanic'],
  'MILF': ['milf', 'mommy', 'mom of', 'cougar'],
  'Colombian': ['colombian', 'colombiana', 'colombia'],
  'PAWG': ['pawg'],
  'Curvy': ['curvy', 'curves', 'thick', 'thicc', 'bbw', 'chubby'],
  'Canadian': ['canadian', 'canada'],
  'British': ['british', 'uk girl', 'england', 'english rose'],
  'Spanish': ['spanish', 'spain', 'espa'],
  'Russian': ['russian', 'russia'],
  'Schoolgirl': ['schoolgirl', 'school girl'],
  'Stepsister': ['stepsister', 'step sister', 'step-sister'],
  'German': ['german', 'germany', 'deutsch'],
  'Fit': ['fit ', 'fitness', 'gym', 'athletic', 'fitgirl'],
  'Dancer': ['dancer', 'dance', 'ballet', 'pole'],
  'French': ['french', 'france', 'fran'],
  'Japanese': ['japanese', 'japan', 'tokyo'],
  'E-girl': ['e-girl', 'egirl', 'e girl', 'gamer girl', 'gamergirl'],
  'Ebony': ['ebony', 'black girl', 'chocolate'],
  'Polish': ['polish', 'poland', 'polska'],
  'Venezuelan': ['venezuelan', 'venezuela'],
  'Goth': ['goth', 'gothic', 'emo', 'alt girl'],
  'Anal': ['anal'],
  'Hungarian': ['hungarian', 'hungary'],
  'Arabic': ['arab', 'arabic', 'arabian'],
  'Chubby': ['chubby', 'plus size', 'plus-size', 'bbw'],
  'Filipina': ['filipina', 'filipino', 'philippines', 'pinay'],
  'Bunny Girl': ['bunny'],
  'Argentinian': ['argentin'],
  'Stepmom': ['stepmom', 'step mom', 'step-mom'],
  'Neighbor': ['neighbor', 'neighbour'],
  'Petite': ['petite', 'tiny', 'small', 'skinny', 'slim'],
  'Cosplay': ['cosplay', 'cosplayer'],
  'Feet': ['feet', 'foot', 'soles', 'toes'],
  'Squirt': ['squirt'],
  'Tattoo': ['tattoo', 'inked', 'tatted'],
  'Brazilian': ['brazil', 'brasil', 'brazilian'],
  'Indian': ['indian', 'india', 'desi'],
  'Mexican': ['mexican', 'mexicana', 'mexico'],
  'Italian': ['italian', 'italy', 'italiana'],
  'Lingerie': ['lingerie'],
  'Lesbian': ['lesbian', 'lesbica', 'girl on girl'],
};

function buildRegex(terms) {
  const esc = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(${esc.join('|')})`, 'i');
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const ofc = mongoose.connection.db.collection('onlyfanscreators');
  const baseMatch = { avatar: avatarMatch, gender: 'female', deleted: { $ne: true } };

  const withBio = await ofc.countDocuments({ ...baseMatch, bio: { $ne: '' } });
  const total = await ofc.countDocuments(baseMatch);
  console.log(`Servable (female + R2 avatar + not deleted): ${total}`);
  console.log(`  of which have a non-empty bio: ${withBio}\n`);

  console.log('=== (A) CANDIDATE CATEGORIES — matches in OUR data (bio OR categories) ===');
  const rows = [];
  for (const [label, terms] of Object.entries(CANDIDATES)) {
    const rx = buildRegex(terms);
    const count = await ofc.countDocuments({
      ...baseMatch,
      $or: [{ bio: rx }, { categories: rx }, { name: rx }, { username: rx }],
    });
    rows.push({ label, count });
  }
  rows.sort((a, b) => b.count - a.count);
  rows.forEach((r, i) => console.log(`  ${String(i + 1).padStart(2)}. ${r.label.padEnd(14)} ${String(r.count).padStart(6)}`));

  console.log('\n=== (B) RAW BIO WORD FREQUENCY (discovery, top 120 meaningful words) ===');
  const sample = await ofc.find({ ...baseMatch, bio: { $ne: '' } }, { projection: { bio: 1 } }).toArray();
  const STOP = new Set(('the a an and or of to in on for my me you your i im is are it with at all new get see come here this that be have just do my our we us they no not so if all your you youll ill can will any one two get got want love best top day days time link bio dm message free now all more most also from out about into over only just like want here there what when who how').split(/\s+/));
  const freq = new Map();
  for (const d of sample) {
    const words = String(d.bio || '').toLowerCase().match(/[a-z][a-z'-]{2,}/g) || [];
    const seen = new Set();
    for (const w of words) {
      if (STOP.has(w) || w.length < 3 || seen.has(w)) continue;
      seen.add(w);
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 120);
  top.forEach(([w, c], i) => process.stdout.write(`${String(c).padStart(5)} ${w.padEnd(16)}${(i + 1) % 4 === 0 ? '\n' : ''}`));
  console.log('');

  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
