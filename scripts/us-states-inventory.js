/* eslint-disable */
// READ-ONLY: find US-based OnlyFans creators and count by state for state-page planning.
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const R2 = process.env.R2_PUBLIC_URL || '';
let avatarMatch = { $ne: '' };
try { if (R2) { const host = new URL(R2).host; avatarMatch = { $regex: host, $options: 'i' }; } } catch {}

const US_STATES = [
  ['Alabama', 'AL', ['alabama', ' al ', 'birmingham', 'montgomery', 'mobile alabama', 'huntsville']],
  ['Alaska', 'AK', ['alaska', ' ak ', 'anchorage', 'fairbanks']],
  ['Arizona', 'AZ', ['arizona', ' az ', 'phoenix', 'tucson', 'scottsdale', 'tempe', 'mesa arizona']],
  ['Arkansas', 'AR', ['arkansas', ' ar ', 'little rock']],
  ['California', 'CA', ['california', ' ca ', 'cali girl', 'cali ', 'los angeles', 'san francisco', 'san diego', 'sacramento', 'oakland', 'fresno', 'long beach', 'hollywood', 'silicon valley', 'bay area', 'socal', 'norcal', 'orange county', 'irvine', 'beverly hills', 'santa monica', 'san jose']],
  ['Colorado', 'CO', ['colorado', ' co ', 'denver', 'boulder', 'colorado springs', 'aurora colorado']],
  ['Connecticut', 'CT', ['connecticut', ' ct ', 'hartford', 'new haven', 'stamford']],
  ['Delaware', 'DE', ['delaware', ' de ', 'wilmington delaware']],
  ['Florida', 'FL', ['florida', ' fl ', 'miami', 'orlando', 'tampa', 'jacksonville', 'fort lauderdale', 'south beach', 'south florida', 'palm beach', 'tallahassee', 'st petersburg florida', 'naples florida']],
  ['Georgia', 'GA', ['georgia usa', ' atlanta', 'atlanta', ' savannah', 'savannah georgia', ' augusta georgia', ' georgia,', 'from georgia', 'based in georgia']],
  ['Hawaii', 'HI', ['hawaii', ' hi ', 'honolulu', 'maui', 'oahu', 'aloha state']],
  ['Idaho', 'ID', ['idaho', ' id ', 'boise']],
  ['Illinois', 'IL', ['illinois', ' il ', 'chicago', 'springfield illinois', 'naperville']],
  ['Indiana', 'IN', ['indiana', ' in ', 'indianapolis', 'fort wayne']],
  ['Iowa', 'IA', ['iowa', ' ia ', 'des moines', 'cedar rapids']],
  ['Kansas', 'KS', ['kansas', ' ks ', 'wichita', 'kansas city kansas', 'topeka']],
  ['Kentucky', 'KY', ['kentucky', ' ky ', 'louisville', 'lexington kentucky']],
  ['Louisiana', 'LA', ['louisiana', ' la state', 'new orleans', 'baton rouge', 'louisiana girl']],
  ['Maine', 'ME', ['maine', ' me ', 'portland maine', 'bangor maine']],
  ['Maryland', 'MD', ['maryland', ' md ', 'baltimore', 'annapolis', 'silver spring']],
  ['Massachusetts', 'MA', ['massachusetts', ' ma ', 'boston', 'cambridge massachusetts', 'worcester', 'springfield massachusetts']],
  ['Michigan', 'MI', ['michigan', ' mi ', 'detroit', 'grand rapids', 'ann arbor', 'lansing']],
  ['Minnesota', 'MN', ['minnesota', ' mn ', 'minneapolis', 'st paul', 'saint paul']],
  ['Mississippi', 'MS', ['mississippi', ' ms ', 'jackson mississippi']],
  ['Missouri', 'MO', ['missouri', ' mo ', 'st louis', 'saint louis', 'kansas city missouri', 'springfield missouri']],
  ['Montana', 'MT', ['montana', ' mt ', 'billings', 'missoula']],
  ['Nebraska', 'NE', ['nebraska', ' ne ', 'omaha', 'lincoln nebraska']],
  ['Nevada', 'NV', ['nevada', ' nv ', 'las vegas', 'vegas girl', 'reno', 'henderson nevada']],
  ['New Hampshire', 'NH', ['new hampshire', ' nh ', 'manchester new hampshire']],
  ['New Jersey', 'NJ', ['new jersey', ' nj ', 'jersey girl', 'newark', 'jersey shore']],
  ['New Mexico', 'NM', ['new mexico', ' nm ', 'albuquerque', 'santa fe']],
  ['New York', 'NY', ['new york', ' nyc', 'manhattan', 'brooklyn', 'queens', 'bronx', 'staten island', 'long island', 'buffalo new york', 'rochester new york', 'albany new york', 'upstate new york']],
  ['North Carolina', 'NC', ['north carolina', ' nc ', 'charlotte', 'raleigh', 'durham nc', 'asheville']],
  ['North Dakota', 'ND', ['north dakota', ' nd ', 'fargo']],
  ['Ohio', 'OH', ['ohio', ' oh ', 'columbus ohio', 'cleveland', 'cincinnati', 'toledo ohio', 'dayton ohio']],
  ['Oklahoma', 'OK', ['oklahoma', ' ok ', 'oklahoma city', 'tulsa']],
  ['Oregon', 'OR', ['oregon', ' or ', 'portland oregon', 'eugene oregon', 'salem oregon']],
  ['Pennsylvania', 'PA', ['pennsylvania', ' pa ', 'philadelphia', 'pittsburgh', 'allentown']],
  ['Rhode Island', 'RI', ['rhode island', ' ri ', 'providence']],
  ['South Carolina', 'SC', ['south carolina', ' sc ', 'charleston sc', 'columbia sc', 'greenville sc']],
  ['South Dakota', 'SD', ['south dakota', ' sd ', 'sioux falls']],
  ['Tennessee', 'TN', ['tennessee', ' tn ', 'nashville', 'memphis', 'knoxville', 'chattanooga']],
  ['Texas', 'TX', ['texas', ' tx ', 'houston', 'dallas', 'austin', 'san antonio', 'fort worth', 'el paso', 'plano texas', 'arlington texas']],
  ['Utah', 'UT', ['utah', ' ut ', 'salt lake', 'provo', 'slc ']],
  ['Vermont', 'VT', ['vermont', ' vt ', 'burlington vermont']],
  ['Virginia', 'VA', ['virginia', ' va ', 'richmond virginia', 'virginia beach', 'norfolk virginia', 'arlington virginia', 'alexandria virginia']],
  ['Washington', 'WA', ['washington state', ' wa ', 'seattle', 'spokane', 'tacoma', 'bellevue washington']],
  ['West Virginia', 'WV', ['west virginia', ' wv ', 'charleston wv']],
  ['Wisconsin', 'WI', ['wisconsin', ' wi ', 'milwaukee', 'madison wisconsin', 'green bay']],
  ['Wyoming', 'WY', ['wyoming', ' wy ', 'cheyenne', 'casper wyoming']],
  ['District of Columbia', 'DC', ['washington dc', 'washington d.c', 'district of columbia', ' dc ', 'dmv area']],
];

function rx(terms) {
  const esc = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(${esc.join('|')})`, 'i');
}

const USA_RX = rx([
  'united states', 'usa', 'u.s.a', 'u.s.', 'american girl', 'american babe',
  'based in the us', 'from the us', 'from usa', 'born in usa', ' us only',
]);

async function main() {
  await mongoose.connect(MONGO_URI);
  const ofc = mongoose.connection.db.collection('onlyfanscreators');
  const baseMatch = { avatar: avatarMatch, gender: 'female', deleted: { $ne: true } };

  const total = await ofc.countDocuments(baseMatch);
  const withBio = await ofc.countDocuments({ ...baseMatch, bio: { $ne: '' } });
  const withLocation = await ofc.countDocuments({ ...baseMatch, location: { $nin: [null, '', 'null'] } });

  // Broad USA pool
  const usaBroad = await ofc.countDocuments({
    ...baseMatch,
    $or: [
      { location: USA_RX },
      { bio: USA_RX },
      { categories: USA_RX },
      { name: USA_RX },
      { username: USA_RX },
      { location: rx(['usa', 'united states']) },
    ],
  });

  console.log('=== US CREATOR DISCOVERY ===');
  console.log(`Servable pool: ${total}`);
  console.log(`With bio: ${withBio} | With location field: ${withLocation}`);
  console.log(`Broad USA signal (any field): ${usaBroad}\n`);

  // Per-state counts (can overlap — creator in CA + NY keywords)
  const stateRows = [];
  for (const [name, abbr, terms] of US_STATES) {
    const regex = rx(terms);
    const count = await ofc.countDocuments({
      ...baseMatch,
      $or: [{ bio: regex }, { categories: regex }, { name: regex }, { username: regex }, { location: regex }],
    });
    stateRows.push({ name, abbr, count });
  }
  stateRows.sort((a, b) => b.count - a.count);

  const withAny = stateRows.filter((r) => r.count > 0);
  const gte50 = stateRows.filter((r) => r.count >= 50);
  const gte20 = stateRows.filter((r) => r.count >= 20);
  const gte10 = stateRows.filter((r) => r.count >= 10);

  console.log(`States with ANY match: ${withAny.length}/51`);
  console.log(`States with >=50: ${gte50.length}`);
  console.log(`States with >=20: ${gte20.length}`);
  console.log(`States with >=10: ${gte10.length}\n`);

  console.log('=== ALL 51 US STATES + DC (ranked by creator count) ===');
  console.log('| Rank | State | Abbr | Creators | Page? |');
  console.log('|------|-------|------|----------|-------|');
  stateRows.forEach((r, i) => {
    const page = r.count >= 50 ? 'YES' : r.count >= 20 ? 'MAYBE' : r.count >= 10 ? 'THIN' : 'NO';
    console.log(`| ${i + 1} | ${r.name} | ${r.abbr} | ${r.count} | ${page} |`);
  });

  // Unique US creators: assign best state match per creator (highest-priority state by count order for tie-break)
  console.log('\n=== UNIQUE US CREATOR ASSIGNMENT (one state per creator, first match wins by state rank) ===');
  const creators = await ofc.find(baseMatch, { projection: { bio: 1, categories: 1, name: 1, username: 1, location: 1 } }).toArray();
  const assigned = new Map(); // state -> count
  const usCreators = new Set();
  US_STATES.forEach(([name]) => assigned.set(name, 0));

  for (const c of creators) {
    const hay = [
      c.bio || '',
      ...(c.categories || []),
      c.name || '',
      c.username || '',
      c.location || '',
    ].join(' ').toLowerCase();

    const isUSA = /united states|usa|u\.s\.|american\b/.test(hay) ||
      stateRows.some((s) => {
        const idx = US_STATES.findIndex(([n]) => n === s.name);
        const terms = US_STATES[idx][2];
        return terms.some((t) => hay.includes(t.trim().toLowerCase()));
      });

    if (!isUSA) continue;
    usCreators.add(String(c._id));

    for (const [name, , terms] of US_STATES) {
      if (terms.some((t) => hay.includes(t.trim().toLowerCase()) || new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(hay))) {
        assigned.set(name, assigned.get(name) + 1);
        break;
      }
    }
  }

  console.log(`Unique US-tagged creators (deduped): ${usCreators.size}`);
  const uniqueRows = [...assigned.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  console.log('\n| State | Unique assigned |');
  console.log('|-------|-----------------|');
  uniqueRows.filter((r) => r.count > 0).forEach((r) => console.log(`| ${r.name} | ${r.count} |`));
  console.log(`\nStates with unique assigned >0: ${uniqueRows.filter((r) => r.count > 0).length}`);

  // Sample location field values mentioning US
  console.log('\n=== SAMPLE location FIELD VALUES (US-related) ===');
  const locSamples = await ofc.find(
    { ...baseMatch, location: { $regex: /usa|united states|california|texas|florida|new york|miami|los angeles|chicago|vegas|atlanta/i } },
    { projection: { location: 1, username: 1 } }
  ).limit(30).toArray();
  locSamples.forEach((d) => console.log(`  @${d.username}: "${d.location}"`));

  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
