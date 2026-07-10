/* eslint-disable */
// READ-ONLY: US creators by state — strict matching (word boundaries, cities, full state names).
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const R2 = process.env.R2_PUBLIC_URL || '';
let avatarMatch = { $ne: '' };
try { if (R2) { const host = new URL(R2).host; avatarMatch = { $regex: host, $options: 'i' }; } } catch {}

// [name, abbr, patterns] — patterns use \b word boundaries where needed
const US_STATES = [
  ['Alabama', 'AL', ['\\balabama\\b', '\\bbirmingham\\b', '\\bmontgomery\\b', '\\bhuntsville\\b']],
  ['Alaska', 'AK', ['\\balaska\\b', '\\banchorage\\b', '\\bfairbanks\\b', ', ak\\b', '\\bak,']],
  ['Arizona', 'AZ', ['\\barizona\\b', '\\bphoenix\\b', '\\btucson\\b', '\\bscottsdale\\b', ', az\\b', '\\baz,']],
  ['Arkansas', 'AR', ['\\barkansas\\b', '\\blittle rock\\b']],
  ['California', 'CA', ['\\bcalifornia\\b', '\\blos angeles\\b', '\\bsan francisco\\b', '\\bsan diego\\b', '\\bsacramento\\b', '\\bhollywood\\b', '\\bsocal\\b', '\\bnorcal\\b', '\\bbay area\\b', '\\borange county\\b', ', ca\\b', '\\bca,', '\\bcali girl\\b', '\\bbeverly hills\\b', '\\bsanta monica\\b']],
  ['Colorado', 'CO', ['\\bcolorado\\b', '\\bdenver\\b', '\\bboulder\\b', ', co\\b', '\\bco,']],
  ['Connecticut', 'CT', ['\\bconnecticut\\b', '\\bhartford\\b', ', ct\\b']],
  ['Delaware', 'DE', ['\\bdelaware\\b', ', de\\b']],
  ['Florida', 'FL', ['\\bflorida\\b', '\\bmiami\\b', '\\borlando\\b', '\\btampa\\b', '\\bjacksonville\\b', '\\bsouth beach\\b', '\\bsouth florida\\b', ', fl\\b', '\\bfl,', '\\bpalm beach\\b']],
  ['Georgia', 'GA', ['\\bgeorgia,\\b', '\\bgeorgia usa\\b', '\\bfrom georgia\\b', '\\bbased in georgia\\b', '\\batlanta\\b', '\\bsavannah\\b', ', ga\\b', '\\bga,']],
  ['Hawaii', 'HI', ['\\bhawaii\\b', '\\bhonolulu\\b', '\\bmaui\\b', ', hi\\b']],
  ['Idaho', 'ID', ['\\bidaho\\b', '\\bboise\\b', ', id\\b']],
  ['Illinois', 'IL', ['\\billinois\\b', '\\bchicago\\b', ', il\\b', '\\bil,']],
  ['Indiana', 'IN', ['\\bindiana\\b', '\\bindianapolis\\b', ', in\\b', '\\bin,']],
  ['Iowa', 'IA', ['\\biowa\\b', '\\bdes moines\\b', ', ia\\b']],
  ['Kansas', 'KS', ['\\bkansas\\b', '\\bwichita\\b', ', ks\\b']],
  ['Kentucky', 'KY', ['\\bkentucky\\b', '\\blouisville\\b', ', ky\\b']],
  ['Louisiana', 'LA', ['\\blouisiana\\b', '\\bnew orleans\\b', '\\bbaton rouge\\b']],
  ['Maine', 'ME', ['\\bmaine\\b', ', me\\b', '\\bportland maine\\b']],
  ['Maryland', 'MD', ['\\bmaryland\\b', '\\bbaltimore\\b', ', md\\b']],
  ['Massachusetts', 'MA', ['\\bmassachusetts\\b', '\\bboston\\b', ', ma\\b', '\\bma,']],
  ['Michigan', 'MI', ['\\bmichigan\\b', '\\bdetroit\\b', '\\bgrand rapids\\b', ', mi\\b']],
  ['Minnesota', 'MN', ['\\bminnesota\\b', '\\bminneapolis\\b', '\\bst paul\\b', ', mn\\b']],
  ['Mississippi', 'MS', ['\\bmississippi\\b', ', ms\\b']],
  ['Missouri', 'MO', ['\\bmissouri\\b', '\\bst louis\\b', '\\bsaint louis\\b', ', mo\\b']],
  ['Montana', 'MT', ['\\bmontana\\b', ', mt\\b']],
  ['Nebraska', 'NE', ['\\bnebraska\\b', '\\bomaha\\b', ', ne\\b']],
  ['Nevada', 'NV', ['\\bnevada\\b', '\\blas vegas\\b', '\\bvegas\\b', '\\breno\\b', ', nv\\b', '\\bnv,']],
  ['New Hampshire', 'NH', ['\\bnew hampshire\\b', ', nh\\b']],
  ['New Jersey', 'NJ', ['\\bnew jersey\\b', '\\bjersey shore\\b', ', nj\\b', '\\bnj,']],
  ['New Mexico', 'NM', ['\\bnew mexico\\b', '\\balbuquerque\\b', ', nm\\b']],
  ['New York', 'NY', ['\\bnew york\\b', '\\bnyc\\b', '\\bmanhattan\\b', '\\bbrooklyn\\b', '\\bqueens\\b', '\\blong island\\b', ', ny\\b', '\\bny,', '\\bupstate ny\\b']],
  ['North Carolina', 'NC', ['\\bnorth carolina\\b', '\\bcharlotte\\b', '\\braleigh\\b', ', nc\\b']],
  ['North Dakota', 'ND', ['\\bnorth dakota\\b', ', nd\\b']],
  ['Ohio', 'OH', ['\\bohio\\b', '\\bcleveland\\b', '\\bcincinnati\\b', '\\bcolumbus, oh\\b', ', oh\\b']],
  ['Oklahoma', 'OK', ['\\boklahoma\\b', '\\btulsa\\b', ', ok\\b']],
  ['Oregon', 'OR', ['\\boregon\\b', '\\bportland, or\\b', '\\bportland oregon\\b', ', or\\b']],
  ['Pennsylvania', 'PA', ['\\bpennsylvania\\b', '\\bphiladelphia\\b', '\\bpittsburgh\\b', ', pa\\b']],
  ['Rhode Island', 'RI', ['\\brhode island\\b', ', ri\\b']],
  ['South Carolina', 'SC', ['\\bsouth carolina\\b', ', sc\\b', '\\bcharleston, sc\\b']],
  ['South Dakota', 'SD', ['\\bsouth dakota\\b', ', sd\\b']],
  ['Tennessee', 'TN', ['\\btennessee\\b', '\\bnashville\\b', '\\bmemphis\\b', ', tn\\b']],
  ['Texas', 'TX', ['\\btexas\\b', '\\bhouston\\b', '\\bdallas\\b', '\\baustin\\b', '\\bsan antonio\\b', ', tx\\b', '\\btx,']],
  ['Utah', 'UT', ['\\butah\\b', '\\bsalt lake\\b', ', ut\\b']],
  ['Vermont', 'VT', ['\\bvermont\\b', ', vt\\b']],
  ['Virginia', 'VA', ['\\bvirginia\\b', '\\bvirginia beach\\b', ', va\\b']],
  ['Washington', 'WA', ['\\bwashington state\\b', '\\bseattle\\b', '\\bspokane\\b', ', wa\\b', '\\bwa,']],
  ['West Virginia', 'WV', ['\\bwest virginia\\b', ', wv\\b']],
  ['Wisconsin', 'WI', ['\\bwisconsin\\b', '\\bmilwaukee\\b', ', wi\\b']],
  ['Wyoming', 'WY', ['\\bwyoming\\b', ', wy\\b']],
  ['District of Columbia', 'DC', ['\\bwashington dc\\b', '\\bwashington d\\.c\\b', ', dc\\b', '\\bdmv area\\b']],
];

const USA_PATTERNS = [
  '\\bunited states\\b', '\\bunited states of america\\b', '\\busa\\b', '\\bu\\.s\\.a\\b',
  '\\bu\\.s\\.\\b', '\\bamerican girl\\b', '\\bfrom the us\\b', '\\bbased in the us\\b',
  '🇺🇸',
];

function buildStateRegex(patterns) {
  return new RegExp(`(${patterns.join('|')})`, 'i');
}

function haystack(doc) {
  return [
    doc.bio || '',
    ...(doc.categories || []),
    doc.name || '',
    doc.username || '',
    doc.location || '',
  ].join(' ');
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const ofc = mongoose.connection.db.collection('onlyfanscreators');
  const baseMatch = { avatar: avatarMatch, gender: 'female', deleted: { $ne: true } };

  const total = await ofc.countDocuments(baseMatch);
  const withLocation = await ofc.countDocuments({ ...baseMatch, location: { $nin: [null, '', 'null'] } });

  const usaRx = buildStateRegex(USA_PATTERNS);
  const usaBroad = await ofc.countDocuments({
    ...baseMatch,
    $or: [{ bio: usaRx }, { categories: usaRx }, { name: usaRx }, { username: usaRx }, { location: usaRx }],
  });

  console.log('=== US CREATOR DISCOVERY (STRICT) ===');
  console.log(`Servable pool: ${total}`);
  console.log(`With location field filled: ${withLocation}`);
  console.log(`Explicit USA signal (United States/USA/🇺🇸): ${usaBroad}\n`);

  const stateRows = [];
  for (const [name, abbr, patterns] of US_STATES) {
    const regex = buildStateRegex(patterns);
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
  console.log(`States >=50 (build page now): ${gte50.length}`);
  console.log(`States >=20: ${gte20.length}`);
  console.log(`States >=10: ${gte10.length}\n`);

  console.log('| Rank | State | Abbr | Creators | Build page? |');
  console.log('|------|-------|------|----------|-------------|');
  stateRows.forEach((r, i) => {
    const page = r.count >= 50 ? 'YES' : r.count >= 20 ? 'MAYBE' : r.count >= 10 ? 'THIN' : r.count > 0 ? 'NO' : 'EMPTY';
    console.log(`| ${i + 1} | ${r.name} | ${r.abbr} | ${r.count} | ${page} |`);
  });

  // Dedupe: assign each creator to ONE state (most specific match = longest pattern hit)
  console.log('\n=== DEDUPED: one state per creator ===');
  const creators = await ofc.find(baseMatch, { projection: { bio: 1, categories: 1, name: 1, username: 1, location: 1 } }).toArray();
  const assigned = new Map(US_STATES.map(([n]) => [n, 0]));
  const usPool = new Set();
  const unassignedUS = [];

  for (const c of creators) {
    const text = haystack(c);
    const isUSA = USA_PATTERNS.some((p) => new RegExp(p, 'i').test(text));
    let bestState = null;
    let bestLen = 0;

    for (const [name, , patterns] of US_STATES) {
      for (const p of patterns) {
        const re = new RegExp(p, 'i');
        if (re.test(text)) {
          const m = text.match(re);
          const len = m ? m[0].length : p.length;
          if (len > bestLen) { bestLen = len; bestState = name; }
        }
      }
    }

    if (isUSA || bestState) {
      usPool.add(String(c._id));
      if (bestState) assigned.set(bestState, assigned.get(bestState) + 1);
      else unassignedUS.push(c.username);
    }
  }

  console.log(`Total US-related creators (deduped pool): ${usPool.size}`);
  console.log(`Assigned to a specific state: ${[...assigned.values()].reduce((a, b) => a + b, 0)}`);
  console.log(`USA signal but NO state match: ${unassignedUS.length}`);
  if (unassignedUS.length <= 20) console.log(`  Examples: ${unassignedUS.slice(0, 15).join(', ')}`);

  const deduped = [...assigned.entries()].map(([name, count]) => ({ name, count })).filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
  console.log('\n| State | Deduped creators |');
  console.log('|-------|------------------|');
  deduped.forEach((r) => console.log(`| ${r.name} | ${r.count} |`));

  // Location field breakdown
  console.log('\n=== location FIELD — all unique US-related values ===');
  const locAgg = await ofc.aggregate([
    { $match: { ...baseMatch, location: { $regex: /usa|united states|california|texas|florida|new york|miami|los angeles|chicago|vegas|atlanta|nevada|georgia|arizona|colorado|ohio|pennsylvania|oregon|washington|carolina|jersey|michigan|tennessee|virginia|maryland|massachusetts|connecticut|minnesota|wisconsin|missouri|alabama|louisiana|kentucky|indiana|iowa|kansas|oklahoma|utah|new mexico|hawaii|alaska|delaware|rhode|vermont|maine|montana|wyoming|dakota|scotland/i } } },
    { $group: { _id: '$location', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 60 },
  ]).toArray();
  locAgg.forEach((l) => console.log(`  ${String(l.count).padStart(4)}  "${l._id}"`));

  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
