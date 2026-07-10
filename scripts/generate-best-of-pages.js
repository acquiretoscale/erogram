/* eslint-disable */
// Generate best-of page config from DB (>=10 creators). Output JSON for bestOfPages.ts
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const R2 = process.env.R2_PUBLIC_URL || '';
let avatarMatch = { $ne: '' };
try { if (R2) { const h = new URL(R2).host; avatarMatch = { $regex: h, $options: 'i' }; } } catch {}

const OF_SLUGS = new Set([
  'asian','blonde','teen','milf','amateur','redhead','goth','petite','big-ass','big-boobs',
  'brunette','latina','ahegao','alt','cosplay','streamer','fitness','joi','lesbian','tattoo',
  'curvy','ebony','feet','lingerie','thick','twerk','squirt','piercing',
]);

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function rx(terms) {
  const esc = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(${esc.join('|')})`, 'i');
}

const COUNTRIES = [
  ['Turkish', ['turkish', 'turkey', 'türk', 'tür']],
  ['Colombian', ['colombian', 'colombia', 'colombiana']],
  ['Brazilian', ['brazilian', 'brazil', 'brasil', 'brasilian']],
  ['Indian', ['indian', 'desi', 'india girl']],
  ['Moroccan', ['moroccan', 'morocco', 'maroc']],
  ['German', ['german', 'germany', 'deutsch']],
  ['Greek', ['greek', 'greece', 'athens greece']],
  ['Australian', ['australian', 'australia', 'aussie']],
  ['French', ['french', 'france', 'française']],
  ['Canadian', ['canadian', 'canada']],
  ['Japanese', ['japanese', 'japan', 'tokyo girl']],
  ['Italian', ['italian', 'italy', 'italiana']],
  ['Argentinian', ['argentinian', 'argentina']],
  ['Spanish', ['spanish', 'spain', 'español']],
  ['Mexican', ['mexican', 'mexico', 'mexicana']],
  ['Thai', ['thai', 'thailand', 'bangkok']],
  ['Taiwanese', ['taiwan', 'taiwanese']],
  ['American', ['american', 'usa girl', 'united states']],
  ['Arab', ['arab', 'arabic', 'arabian', 'middle eastern']],
  ['Chinese', ['chinese', 'china', 'mandarin']],
  ['Scottish', ['scottish', 'scotland', 'scots']],
  ['Ukrainian', ['ukrainian', 'ukraine']],
  ['Persian', ['persian', 'iranian', 'iran']],
  ['New Zealand', ['new zealand', 'kiwi', 'nz girl']],
  ['South Korean', ['korean', 'korea', 'seoul korea']],
  ['Russian', ['russian', 'russia']],
  ['Romanian', ['romanian', 'romania']],
  ['Polish', ['polish', 'poland', 'polska']],
  ['Filipina', ['filipina', 'filipino', 'philippines', 'pinay']],
  ['Irish', ['irish', 'ireland', 'dublin']],
  ['Peruvian', ['peruvian', 'peru']],
  ['British', ['british', 'english girl', 'england', 'uk girl', 'brit']],
  ['Venezuelan', ['venezuelan', 'venezuela']],
  ['Indonesian', ['indonesian', 'indonesia']],
  ['Egyptian', ['egyptian', 'egypt']],
  ['Dutch', ['dutch', 'netherlands', 'holland']],
  ['Swedish', ['swedish', 'sweden']],
  ['Norwegian', ['norwegian', 'norway']],
  ['Hungarian', ['hungarian', 'hungary']],
  ['Czech', ['czech', 'czechia']],
  ['Portuguese', ['portuguese', 'portugal']],
  ['Belgian', ['belgian', 'belgium']],
  ['Finnish', ['finnish', 'finland']],
  ['Danish', ['danish', 'denmark']],
  ['Chilean', ['chilean', 'chile']],
  ['Dominican', ['dominican', 'dominican republic']],
  ['Puerto Rican', ['puerto rican', 'puerto rico']],
  ['Cuban', ['cuban', 'cuba']],
  ['Jamaican', ['jamaican', 'jamaica']],
  ['Nigerian', ['nigerian', 'nigeria']],
  ['Kenyan', ['kenyan', 'kenya']],
  ['Israeli', ['israeli', 'israel']],
  ['Lebanese', ['lebanese', 'lebanon']],
  ['Pakistani', ['pakistan', 'pakistani']],
  ['Vietnamese', ['vietnamese', 'vietnam']],
];

const US_STATES = [
  ['California', ['\\bcalifornia\\b', '\\blos angeles\\b', '\\bsan francisco\\b', '\\bsan diego\\b', ', ca\\b', '\\bhollywood\\b', '\\bsocal\\b']],
  ['Florida', ['\\bflorida\\b', '\\bmiami\\b', '\\borlando\\b', '\\btampa\\b', ', fl\\b', '\\bsouth beach\\b']],
  ['Texas', ['\\btexas\\b', '\\bhouston\\b', '\\bdallas\\b', '\\baustin\\b', ', tx\\b']],
  ['Nevada', ['\\bnevada\\b', '\\blas vegas\\b', '\\bvegas\\b', ', nv\\b']],
  ['Indiana', ['\\bindiana\\b', '\\bindianapolis\\b']],
  ['Georgia', ['\\bgeorgia,\\b', '\\bgeorgia usa\\b', '\\batlanta\\b', ', ga\\b']],
  ['New York', ['\\bnew york\\b', '\\bnyc\\b', '\\bmanhattan\\b', '\\bbrooklyn\\b', ', ny\\b']],
  ['Maine', ['\\bmaine\\b', '\\bportland maine\\b']],
  ['Massachusetts', ['\\bmassachusetts\\b', '\\bboston\\b', ', ma\\b']],
  ['Michigan', ['\\bmichigan\\b', '\\bdetroit\\b', ', mi\\b']],
  ['Colorado', ['\\bcolorado\\b', '\\bdenver\\b', ', co\\b']],
  ['North Carolina', ['\\bnorth carolina\\b', '\\bcharlotte\\b', '\\braleigh\\b', ', nc\\b']],
  ['Illinois', ['\\billinois\\b', '\\bchicago\\b', ', il\\b']],
  ['Arizona', ['\\barizona\\b', '\\bphoenix\\b', ', az\\b']],
  ['Ohio', ['\\bohio\\b', '\\bcleveland\\b', '\\bcincinnati\\b', ', oh\\b']],
  ['Oklahoma', ['\\boklahoma\\b', '\\btulsa\\b', ', ok\\b']],
  ['Pennsylvania', ['\\bpennsylvania\\b', '\\bphiladelphia\\b', '\\bpittsburgh\\b', ', pa\\b']],
  ['New Jersey', ['\\bnew jersey\\b', ', nj\\b']],
  ['Washington', ['\\bwashington state\\b', '\\bseattle\\b', ', wa\\b']],
  ['Virginia', ['\\bvirginia\\b', ', va\\b']],
  ['Tennessee', ['\\btennessee\\b', '\\bnashville\\b', '\\bmemphis\\b', ', tn\\b']],
  ['Louisiana', ['\\blouisiana\\b', '\\bnew orleans\\b']],
  ['Maryland', ['\\bmaryland\\b', '\\bbaltimore\\b', ', md\\b']],
  ['Minnesota', ['\\bminnesota\\b', '\\bminneapolis\\b', ', mn\\b']],
  ['Connecticut', ['\\bconnecticut\\b', ', ct\\b']],
  ['Hawaii', ['\\bhawaii\\b', '\\bhonolulu\\b', ', hi\\b']],
  ['Oregon', ['\\boregon\\b', '\\bportland oregon\\b']],
  ['Alabama', ['\\balabama\\b', '\\bbirmingham\\b']],
  ['Missouri', ['\\bmissouri\\b', '\\bst louis\\b', ', mo\\b']],
  ['Wisconsin', ['\\bwisconsin\\b', '\\bmilwaukee\\b', ', wi\\b']],
];

const NICHES = [
  ['Busty', ['busty', 'big boobs', 'big tits', 'huge tits', 'big naturals']],
  ['Big Ass', ['big ass', 'big-ass', 'big booty', 'big butt', 'booty', 'phat ass']],
  ['Big Boobs', ['big boobs', 'big-boobs', 'big tits', 'big-tits']],
  ['Nude', ['nude', 'naked', 'full nude']],
  ['Fetish', ['fetish', 'kinky']],
  ['Model', ['model', 'modelling', 'modeling']],
  ['E-girl', ['e-girl', 'egirl', 'e girl', 'gamer girl']],
  ['Solo', ['solo content', ' solo ', 'solo play']],
  ['Sexting', ['sexting', 'sex chat', 'dirty talk']],
  ['BDSM', ['bdsm', 'bondage']],
  ['Custom', ['custom content', 'custom video', 'custom request']],
  ['Anime', ['anime', 'waifu', 'hentai']],
  ['Dominatrix', ['dominatrix', 'femdom', 'mistress', 'domme']],
  ['PAWG', ['pawg', 'phat ass white']],
  ['Celebrity', ['celebrity', 'celeb', 'famous']],
  ['Mommy', ['mommy', 'mummy', ' stepmom ', 'step mom']],
  ['Oral', ['blowjob', 'deepthroat', ' oral ']],
  ['Gamer', ['gamer', 'gaming', 'playstation', 'xbox']],
  ['Anal', [' anal ', 'anal play', 'anal content']],
  ['Chubby', ['chubby', 'plus size', 'plus-size', 'bbw']],
  ['Pornstar', ['pornstar', 'porn star', 'adult film']],
  ['Roleplay', ['roleplay', 'role play']],
  ['College', ['college', 'university', 'campus', 'student']],
  ['Natural', ['natural boobs', 'natural tits', 'all natural']],
  ['Neighbor', ['neighbor', 'neighbour', 'girl next door']],
  ['Couple', ['couple', 'boy girl', 'with my boyfriend']],
  ['Dancer', ['dancer', 'dancing', 'ballet', 'pole dance', 'stripper']],
  ['Bikini', ['bikini', 'swimsuit', 'beach body']],
  ['Influencer', ['influencer', 'instagram model', 'tiktok']],
  ['Hotwife', ['hotwife', 'cuckold', 'cuck']],
  ['Yoga', ['yoga', 'flexible', 'stretch']],
  ['POV', ['pov ', 'point of view']],
  ['Threesome', ['threesome', '3some', 'three way']],
  ['Bisexual', ['bisexual', ' bi ', 'bi curious']],
  ['Submissive', ['submissive', 'sub girl', 'obedient']],
  ['Topless', ['topless', 'tits out']],
  ['Shaved', ['shaved', 'smooth', 'bare']],
  ['BBW', ['bbw', 'big beautiful']],
  ['Catgirl', ['catgirl', 'cat girl', 'neko']],
  ['Nurse', ['nurse', 'medical', 'sexy nurse']],
  ['Pregnant', ['pregnant', 'pregnancy', 'expecting']],
  ['Bunny Girl', ['bunny girl', 'playboy bunny', ' bunny ']],
  ['ASMR', ['asmr']],
  ['Exotic', ['exotic', 'exotic dancer']],
  ['Maid', ['maid', 'french maid']],
  ['Small Tits', ['small tits', 'small boobs', 'tiny tits']],
  ['Teacher', ['teacher', 'professor', 'school teacher']],
  ['Schoolgirl', ['schoolgirl', 'school girl', 'uniform']],
  ['Punk', ['punk', 'punk rock']],
  ['Emo', [' emo ', 'emo girl']],
  ['Pale', ['pale skin', 'fair skin', 'porcelain']],
  ['Hairy', ['hairy', 'bush', 'natural hair']],
  ['Tanned', ['tanned', 'tan lines', 'sun kissed']],
  ['Mixed Race', ['mixed race', 'biracial', 'multiracial']],
  ['Slavic', ['slavic', 'eastern european']],
  ['Muscular', ['muscular girl', 'muscle mommy', 'musclemommy']],
  ['Housewife', ['housewife', 'stay at home']],
  ['Cheerleader', ['cheerleader']],
  ['Secretary', ['secretary', 'office girl']],
  ['Farm Girl', ['farm girl', 'country girl']],
  ['Snow Bunny', ['snow bunny', 'snowbunny']],
  ['Nerd', ['nerd girl', 'nerdy girl']],
  ['Femdom', ['femdom', 'female dom']],
  ['Findom', ['findom', 'financial dom']],
  ['GFE', ['gfe', 'girlfriend experience']],
  ['Bondage', ['bondage', 'tied up', 'rope']],
  ['Girl Next Door', ['girl next door']],
  ['Big Booty', ['big booty', 'phat booty']],
  ['Goth Girl', ['goth girl']],
  ['Cosplay Girl', ['cosplay girl']],
  ['Fitness Model', ['fitness model', 'fit model']],
  ['College Girl', ['college girl']],
  ['Petite Asian', ['petite asian', 'tiny asian']],
  ['Thick Latina', ['thick latina', 'curvy latina']],
  ['Blonde MILF', ['blonde milf', 'blond milf']],
  ['Busty MILF', ['busty milf', 'big tit milf']],
  ['Asian Teen', ['asian teen', 'asian 18']],
  ['Latina MILF', ['latina milf']],
  ['Blonde PAWG', ['blonde pawg', 'blond pawg']],
  ['Redhead PAWG', ['redhead pawg', 'ginger pawg']],
  ['Ebony MILF', ['ebony milf', 'black milf']],
  ['Blonde Teen', ['blonde teen', 'blond teen']],
  ['Redhead Teen', ['redhead teen', 'ginger teen']],
  ['Latina Teen', ['latina teen']],
  ['Asian MILF', ['asian milf']],
  ['British MILF', ['british milf', 'uk milf']],
  ['OnlyFans Free', ['free onlyfans', 'free page', 'free subscription']],
  ['No PPV', ['no ppv', 'no paywall']],
  ['Video Call', ['video call', 'facetime', 'cam call']],
  ['Dick Rating', ['dick rating', 'cock rating']],
  ['Live Show', ['live show', 'live stream show']],
  ['Stockings', ['stockings', 'nylon', 'pantyhose']],
  ['Latex', ['latex', 'rubber fetish']],
  ['Heels', ['high heels', 'heels']],
  ['Trans', ['transgender', 'trans woman', 'transgirl', 'shemale', 'ladyboy']],
];

async function countMatch(ofc, baseMatch, patterns, isRegex = false) {
  const regex = isRegex
    ? new RegExp(`(${patterns.join('|')})`, 'i')
    : rx(patterns);
  return ofc.countDocuments({
    ...baseMatch,
    $or: [{ bio: regex }, { categories: regex }, { name: regex }, { username: regex }, { location: regex }],
  });
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ofc = mongoose.connection.db.collection('onlyfanscreators');
  const baseMatch = { avatar: avatarMatch, gender: 'female', deleted: { $ne: true } };

  const pages = [];
  const usedSlugs = new Set();

  // Existing OF categories (category field match)
  const OF_NAMES = {
    'asian':'Asian','blonde':'Blonde','teen':'Teen','milf':'MILF','amateur':'Amateur',
    'redhead':'Redhead','goth':'Goth','petite':'Petite','big-ass':'Big Ass','big-boobs':'Big Boobs',
    'brunette':'Brunette','latina':'Latina','ahegao':'Ahegao','alt':'Alt','cosplay':'Cosplay',
    'streamer':'Streamer','fitness':'Fitness','joi':'JOI','lesbian':'Lesbian','tattoo':'Tattoo',
    'curvy':'Curvy','ebony':'Ebony','feet':'Feet','lingerie':'Lingerie','thick':'Thick',
    'twerk':'Twerk','squirt':'Squirt','piercing':'Piercing',
  };
  for (const slug of OF_SLUGS) {
    const c = await ofc.countDocuments({ ...baseMatch, categories: slug });
    if (c >= 10) {
      pages.push({ slug, label: OF_NAMES[slug], type: 'niche', match: 'category', categorySlug: slug, count: c });
      usedSlugs.add(slug);
    }
  }

  for (const [label, patterns] of COUNTRIES) {
    const slug = slugify(label);
    if (usedSlugs.has(slug)) continue;
    const c = await countMatch(ofc, baseMatch, patterns);
    if (c >= 10) {
      pages.push({ slug, label, type: 'country', match: 'keyword', patterns, count: c });
      usedSlugs.add(slug);
    }
  }

  for (const [label, patterns] of US_STATES) {
    const slug = 'us-' + slugify(label);
    if (usedSlugs.has(slug)) continue;
    const c = await countMatch(ofc, baseMatch, patterns, true);
    if (c >= 10) {
      pages.push({ slug, label, type: 'state', match: 'keyword', patterns, count: c });
      usedSlugs.add(slug);
    }
  }

  const nicheCandidates = [];
  for (const [label, patterns] of NICHES) {
    const slug = slugify(label);
    if (usedSlugs.has(slug) || OF_SLUGS.has(slug)) continue;
    const c = await countMatch(ofc, baseMatch, patterns);
    if (c >= 10) nicheCandidates.push({ slug, label, type: 'niche', match: 'keyword', patterns, count: c });
  }
  nicheCandidates.sort((a, b) => b.count - a.count);
  const nicheLimit = Math.min(60, nicheCandidates.length);
  for (let i = 0; i < nicheLimit; i++) {
    const p = nicheCandidates[i];
    if (usedSlugs.has(p.slug)) continue;
    pages.push(p);
    usedSlugs.add(p.slug);
  }

  pages.sort((a, b) => b.count - a.count);
  const final = pages.slice(0, 200);

  console.log(JSON.stringify({ total: final.length, pages: final }, null, 2));
  fs.writeFileSync('/tmp/best-of-pages.json', JSON.stringify(final, null, 2));
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
