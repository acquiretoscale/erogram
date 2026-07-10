/* eslint-disable */
// READ-ONLY: build inventory of up to 200 buildable categories (niche + country + city/region).
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const R2 = process.env.R2_PUBLIC_URL || '';
let avatarMatch = { $ne: '' };
try { if (R2) { const host = new URL(R2).host; avatarMatch = { $regex: host, $options: 'i' }; } } catch {}

function rx(terms) {
  const esc = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(${esc.join('|')})`, 'i');
}

// type: niche | country | region
const CANDIDATES = [
  // --- NICHE / LOOK / BODY ---
  ['Blonde', 'niche', ['blonde', 'blond hair', 'blondie']],
  ['Brunette', 'niche', ['brunette', 'brown hair']],
  ['Redhead', 'niche', ['redhead', 'ginger', 'red hair']],
  ['Busty', 'niche', ['busty', 'big boobs', 'big tits', 'big-boobs', 'big-boobs', 'huge tits', 'big naturals', 'titties', 'big titty']],
  ['Petite', 'niche', ['petite', 'tiny girl', 'small girl', 'skinny girl', 'slim girl']],
  ['Curvy', 'niche', ['curvy', 'curves', 'thick girl', 'thicc', 'hourglass']],
  ['Chubby', 'niche', ['chubby', 'plus size', 'plus-size', 'bbw', 'big girl']],
  ['PAWG', 'niche', ['pawg', 'phat ass', 'white girl with']],
  ['Big Ass', 'niche', ['big ass', 'big-ass', 'big booty', 'big butt', 'booty', 'fat ass']],
  ['Big Boobs', 'niche', ['big boobs', 'big-boobs', 'big tits', 'big-tits', 'huge boobs']],
  ['Natural', 'niche', ['natural boobs', 'natural tits', 'all natural', 'natural body']],
  ['Tattoo', 'niche', ['tattoo', 'inked', 'tatted', 'tattooed']],
  ['Piercing', 'niche', ['piercing', 'pierced', 'septum']],
  ['Alt', 'niche', ['alt girl', 'alternative girl', ' alt ']],
  ['Goth', 'niche', ['goth', 'gothic', 'dark aesthetic']],
  ['Emo', 'niche', [' emo ', 'emo girl']],
  ['Punk', 'niche', ['punk', 'punk rock']],
  ['E-girl', 'niche', ['e-girl', 'egirl', 'e girl', 'gamer girl', 'gamergirl']],
  ['Cosplay', 'niche', ['cosplay', 'cosplayer', 'costume']],
  ['Ahegao', 'niche', ['ahegao']],
  ['Anime', 'niche', ['anime', 'waifu', 'hentai']],
  ['Streamer', 'niche', ['streamer', 'twitch', 'live stream']],
  ['Gamer', 'niche', ['gamer', 'gaming', 'playstation', 'xbox']],
  ['Fitness', 'niche', ['fitness', 'gym girl', 'fit girl', 'workout', 'athletic']],
  ['Yoga', 'niche', ['yoga', 'flexible', 'stretch']],
  ['Dancer', 'niche', ['dancer', 'dancing', 'ballet', 'pole dance', 'stripper']],
  ['Model', 'niche', ['model', 'modelling', 'modeling']],
  ['Influencer', 'niche', ['influencer', 'instagram model', 'tiktok']],
  ['MILF', 'niche', ['milf', 'mommy', 'cougar', 'hot mom', 'mom of']],
  ['Teen', 'niche', [' teen ', '18 year', '19 year', 'just turned 18', 'college girl', 'university girl']],
  ['College', 'niche', ['college', 'university', 'campus', 'student']],
  ['Amateur', 'niche', ['amateur', 'real girl', 'girl next door']],
  ['Solo', 'niche', ['solo content', ' solo ', 'solo play']],
  ['Couple', 'niche', ['couple', 'boy girl', 'with my boyfriend', 'with my husband']],
  ['Lesbian', 'niche', ['lesbian', 'girl on girl', 'girlfriend experience', 'sapphic']],
  ['Bisexual', 'niche', ['bisexual', ' bi ', 'bi curious']],
  ['Trans', 'niche', ['trans', 'transgender', 'ts ', 'shemale', 'ladyboy']],
  ['Feet', 'niche', ['feet', ' foot ', 'soles', 'toes', 'footjob', 'foot fetish']],
  ['Lingerie', 'niche', ['lingerie', 'lace', 'underwear model']],
  ['Bikini', 'niche', ['bikini', 'swimsuit', 'beach body']],
  ['Nurse', 'niche', ['nurse', 'medical', 'doctor']],
  ['Teacher', 'niche', ['teacher', 'professor', 'school teacher']],
  ['Schoolgirl', 'niche', ['schoolgirl', 'school girl', 'uniform']],
  ['Secretary', 'niche', ['secretary', 'office girl']],
  ['Maid', 'niche', ['maid', 'french maid']],
  ['Bunny Girl', 'niche', ['bunny girl', 'playboy bunny', ' bunny ']],
  ['Catgirl', 'niche', ['catgirl', 'cat girl', 'neko']],
  ['Dominatrix', 'niche', ['dominatrix', 'femdom', 'mistress', 'domme']],
  ['Submissive', 'niche', ['submissive', 'sub girl', 'obedient']],
  ['BDSM', 'niche', ['bdsm', 'bondage', 'kink', 'fetish']],
  ['JOI', 'niche', ['joi', 'jerk off']],
  ['Sexting', 'niche', ['sexting', 'sex chat', 'dirty talk']],
  ['Custom', 'niche', ['custom content', 'custom video', 'custom request']],
  ['Squirt', 'niche', ['squirt', 'squirting']],
  ['Anal', 'niche', [' anal ', 'anal play', 'anal content']],
  ['Oral', 'niche', ['blowjob', 'bj ', 'deepthroat', 'oral']],
  ['Threesome', 'niche', ['threesome', '3some', 'three way']],
  ['Hotwife', 'niche', ['hotwife', 'cuckold', 'cuck']],
  ['Pregnant', 'niche', ['pregnant', 'pregnancy', 'expecting']],
  ['Mommy', 'niche', ['mommy', 'mummy', ' stepmom ', 'step mom', 'step-mom']],
  ['Stepsister', 'niche', ['stepsister', 'step sister', 'step-sister']],
  ['Neighbor', 'niche', ['neighbor', 'neighbour', 'girl next door']],
  ['Celebrity', 'niche', ['celebrity', 'celeb', 'famous']],
  ['Pornstar', 'niche', ['pornstar', 'porn star', 'adult film']],
  ['Exotic', 'niche', ['exotic', 'exotic dancer']],
  ['Ebony', 'niche', ['ebony', 'black girl', 'chocolate skin', 'melanin']],
  ['Mixed', 'niche', ['mixed race', 'biracial', 'multiracial']],
  ['Pale', 'niche', ['pale skin', 'fair skin', 'porcelain']],
  ['Tanned', 'niche', ['tanned', 'tan lines', 'sun kissed']],
  ['Hairy', 'niche', ['hairy', 'bush', 'natural hair']],
  ['Shaved', 'niche', ['shaved', 'smooth', 'bare']],
  ['Pierced Nipples', 'niche', ['pierced nipple', 'nipple piercing']],
  ['Big Nipples', 'niche', ['big nipple', 'puffy nipple']],
  ['Small Tits', 'niche', ['small tits', 'small boobs', 'tiny tits', 'a cup']],
  ['Flat Chest', 'niche', ['flat chest', 'itty bitty']],
  ['Twerk', 'niche', ['twerk', 'twerking']],
  ['ASMR', 'niche', ['asmr']],
  ['POV', 'niche', ['pov ', 'point of view']],
  ['Roleplay', 'niche', ['roleplay', 'role play', 'rp ']],
  ['Fetish', 'niche', ['fetish', 'kinky', 'kink']],
  ['Nude', 'niche', ['nude', 'naked', 'full nude']],
  ['Topless', 'niche', ['topless', 'tits out']],
  ['Free', 'niche', ['free onlyfans', 'free page', 'free subscription', 'free account']],
  ['VIP', 'niche', ['vip page', ' vip ', 'premium page']],
  ['Verified', 'niche', ['verified', 'blue check']],
  ['Latina', 'niche', ['latina', 'latin girl', 'latinx']],
  ['Asian', 'niche', ['asian', 'oriental']],
  ['Indian', 'niche', ['indian', 'desi', 'india girl']],
  ['Arab', 'niche', ['arab', 'arabic', 'arabian', 'middle eastern']],
  ['Turkish', 'niche', ['turkish', 'turkey', 'türk', 'tür']],
  ['Moroccan', 'niche', ['moroccan', 'morocco', 'maroc']],
  ['Persian', 'niche', ['persian', 'iranian', 'iran']],
  ['Korean', 'niche', ['korean', 'korea', 'k-pop']],
  ['Chinese', 'niche', ['chinese', 'china', 'mandarin']],
  ['Japanese', 'niche', ['japanese', 'japan', 'tokyo girl', 'japanese girl']],
  ['Thai', 'niche', ['thai', 'thailand', 'bangkok']],
  ['Vietnamese', 'niche', ['vietnamese', 'vietnam']],
  ['Filipina', 'niche', ['filipina', 'filipino', 'philippines', 'pinay']],
  ['Indonesian', 'niche', ['indonesian', 'indonesia', 'bali']],
  ['Taiwanese', 'niche', ['taiwan', 'taiwanese']],
  ['Pacific Islander', 'niche', ['pacific islander', 'polynesian', 'hawaiian', 'samoa']],
  ['Hawaiian', 'niche', ['hawaii', 'hawaiian', 'aloha']],
  ['Slavic', 'niche', ['slavic', 'eastern european']],
  ['Ukrainian', 'niche', ['ukrainian', 'ukraine', 'ukraina']],
  ['Russian', 'niche', ['russian', 'russia', 'moscow girl']],
  ['Polish', 'niche', ['polish', 'poland', 'polska']],
  ['Romanian', 'niche', ['romanian', 'romania']],
  ['Czech', 'niche', ['czech', 'czechia', 'prague girl']],
  ['Hungarian', 'niche', ['hungarian', 'hungary', 'budapest']],
  ['Bulgarian', 'niche', ['bulgarian', 'bulgaria']],
  ['Serbian', 'niche', ['serbian', 'serbia']],
  ['Greek', 'niche', ['greek', 'greece', 'athens']],
  ['Italian', 'niche', ['italian', 'italy', 'italiana', 'roma']],
  ['Spanish', 'niche', ['spanish', 'spain', 'español', 'espana']],
  ['Portuguese', 'niche', ['portuguese', 'portugal']],
  ['French', 'niche', ['french', 'france', 'française', 'parisienne']],
  ['German', 'niche', ['german', 'germany', 'deutsch']],
  ['Dutch', 'niche', ['dutch', 'netherlands', 'holland']],
  ['Belgian', 'niche', ['belgian', 'belgium']],
  ['Swedish', 'niche', ['swedish', 'sweden', 'scandinavian']],
  ['Norwegian', 'niche', ['norwegian', 'norway']],
  ['Danish', 'niche', ['danish', 'denmark']],
  ['Finnish', 'niche', ['finnish', 'finland']],
  ['British', 'niche', ['british', 'english girl', 'england', 'uk girl', 'brit']],
  ['Irish', 'niche', ['irish', 'ireland', 'dublin']],
  ['Scottish', 'niche', ['scottish', 'scotland', 'scots']],
  ['Welsh', 'niche', ['welsh', 'wales']],
  ['American', 'niche', ['american', 'usa girl', 'united states']],
  ['Canadian', 'niche', ['canadian', 'canada']],
  ['Mexican', 'niche', ['mexican', 'mexico', 'mexicana']],
  ['Colombian', 'niche', ['colombian', 'colombia', 'colombiana']],
  ['Brazilian', 'niche', ['brazilian', 'brazil', 'brasil', 'brasilian']],
  ['Argentinian', 'niche', ['argentinian', 'argentina', 'argentina girl']],
  ['Chilean', 'niche', ['chilean', 'chile']],
  ['Peruvian', 'niche', ['peruvian', 'peru']],
  ['Venezuelan', 'niche', ['venezuelan', 'venezuela']],
  ['Ecuadorian', 'niche', ['ecuadorian', 'ecuador']],
  ['Dominican', 'niche', ['dominican', 'dominican republic']],
  ['Puerto Rican', 'niche', ['puerto rican', 'puerto rico']],
  ['Cuban', 'niche', ['cuban', 'cuba']],
  ['Jamaican', 'niche', ['jamaican', 'jamaica']],
  ['Trinidadian', 'niche', ['trinidad', 'trini']],
  ['South African', 'niche', ['south african', 'south africa']],
  ['Nigerian', 'niche', ['nigerian', 'nigeria']],
  ['Kenyan', 'niche', ['kenyan', 'kenya']],
  ['Egyptian', 'niche', ['egyptian', 'egypt', 'cairo']],
  ['Israeli', 'niche', ['israeli', 'israel', 'tel aviv']],
  ['Lebanese', 'niche', ['lebanese', 'lebanon']],
  ['Australian', 'niche', ['australian', 'australia', 'aussie']],
  ['New Zealander', 'niche', ['new zealand', 'kiwi', 'nz girl']],

  // --- COUNTRIES (explicit) ---
  ['USA', 'country', ['usa', 'united states', ' u.s.', 'american']],
  ['United Kingdom', 'country', ['united kingdom', ' uk ', 'england', 'britain', 'great britain']],
  ['Canada', 'country', ['canada', 'canadian', 'toronto', 'vancouver', 'montreal']],
  ['Australia', 'country', ['australia', 'australian', 'aussie', 'sydney', 'melbourne']],
  ['France', 'country', ['france', 'french', 'français', 'française']],
  ['Germany', 'country', ['germany', 'german', 'deutschland']],
  ['Spain', 'country', ['spain', 'spanish', 'españa', 'español']],
  ['Italy', 'country', ['italy', 'italian', 'italia']],
  ['Brazil', 'country', ['brazil', 'brasil', 'brazilian']],
  ['Mexico', 'country', ['mexico', 'mexican', 'méxico']],
  ['Colombia', 'country', ['colombia', 'colombian', 'colombiana']],
  ['Argentina', 'country', ['argentina', 'argentinian']],
  ['Chile', 'country', ['chile', 'chilean']],
  ['Peru', 'country', ['peru', 'peruvian']],
  ['Venezuela', 'country', ['venezuela', 'venezuelan']],
  ['Ecuador', 'country', ['ecuador', 'ecuadorian']],
  ['Portugal', 'country', ['portugal', 'portuguese']],
  ['Netherlands', 'country', ['netherlands', 'dutch', 'holland']],
  ['Belgium', 'country', ['belgium', 'belgian']],
  ['Poland', 'country', ['poland', 'polish', 'polska']],
  ['Ukraine', 'country', ['ukraine', 'ukrainian']],
  ['Russia', 'country', ['russia', 'russian']],
  ['Romania', 'country', ['romania', 'romanian']],
  ['Czech Republic', 'country', ['czech', 'czechia', 'czech republic']],
  ['Hungary', 'country', ['hungary', 'hungarian']],
  ['Greece', 'country', ['greece', 'greek']],
  ['Turkey', 'country', ['turkey', 'turkish', 'türkiye']],
  ['Morocco', 'country', ['morocco', 'moroccan', 'maroc']],
  ['Egypt', 'country', ['egypt', 'egyptian']],
  ['Israel', 'country', ['israel', 'israeli']],
  ['Lebanon', 'country', ['lebanon', 'lebanese']],
  ['India', 'country', ['india', 'indian', 'desi']],
  ['Pakistan', 'country', ['pakistan', 'pakistani']],
  ['Philippines', 'country', ['philippines', 'filipina', 'filipino', 'pinay']],
  ['Thailand', 'country', ['thailand', 'thai']],
  ['Vietnam', 'country', ['vietnam', 'vietnamese']],
  ['Indonesia', 'country', ['indonesia', 'indonesian']],
  ['Japan', 'country', ['japan', 'japanese']],
  ['South Korea', 'country', ['korea', 'korean', 'seoul']],
  ['China', 'country', ['china', 'chinese']],
  ['Taiwan', 'country', ['taiwan', 'taiwanese']],
  ['South Africa', 'country', ['south africa', 'south african']],
  ['Nigeria', 'country', ['nigeria', 'nigerian']],
  ['Kenya', 'country', ['kenya', 'kenyan']],
  ['Jamaica', 'country', ['jamaica', 'jamaican']],
  ['Puerto Rico', 'country', ['puerto rico', 'puerto rican']],
  ['Dominican Republic', 'country', ['dominican republic', 'dominican']],
  ['Cuba', 'country', ['cuba', 'cuban']],
  ['Ireland', 'country', ['ireland', 'irish']],
  ['Scotland', 'country', ['scotland', 'scottish']],
  ['Sweden', 'country', ['sweden', 'swedish']],
  ['Norway', 'country', ['norway', 'norwegian']],
  ['Denmark', 'country', ['denmark', 'danish']],
  ['Finland', 'country', ['finland', 'finnish']],
  ['Switzerland', 'country', ['switzerland', 'swiss']],
  ['Austria', 'country', ['austria', 'austrian']],
  ['New Zealand', 'country', ['new zealand', 'kiwi']],

  // --- CITIES / REGIONS ---
  ['Los Angeles', 'region', ['los angeles', 'la girl', 'hollywood', 'california girl']],
  ['New York', 'region', ['new york', 'nyc', 'manhattan', 'brooklyn', 'queens']],
  ['Miami', 'region', ['miami', 'south beach', 'south florida']],
  ['Florida', 'region', ['florida', 'orlando', 'tampa']],
  ['Texas', 'region', ['texas', 'houston', 'dallas', 'austin', 'san antonio']],
  ['California', 'region', ['california', 'cali', 'san diego', 'san francisco', 'sf ']],
  ['Las Vegas', 'region', ['las vegas', 'vegas']],
  ['Chicago', 'region', ['chicago', 'illinois']],
  ['Atlanta', 'region', ['atlanta', 'georgia usa']],
  ['Seattle', 'region', ['seattle', 'washington state']],
  ['Boston', 'region', ['boston', 'massachusetts']],
  ['Denver', 'region', ['denver', 'colorado']],
  ['Phoenix', 'region', ['phoenix', 'arizona']],
  ['London', 'region', ['london', 'london uk', 'london england']],
  ['Paris', 'region', ['paris', 'parisienne', 'paris france']],
  ['Berlin', 'region', ['berlin', 'berlin germany']],
  ['Madrid', 'region', ['madrid', 'madrid spain']],
  ['Barcelona', 'region', ['barcelona', 'catalonia']],
  ['Rome', 'region', ['rome', 'roma', 'rome italy']],
  ['Milan', 'region', ['milan', 'milano']],
  ['Amsterdam', 'region', ['amsterdam', 'amsterdam netherlands']],
  ['Brussels', 'region', ['brussels', 'bruxelles']],
  ['Vienna', 'region', ['vienna', 'wien']],
  ['Prague', 'region', ['prague', 'praha']],
  ['Warsaw', 'region', ['warsaw', 'warszawa']],
  ['Bucharest', 'region', ['bucharest', 'bucuresti']],
  ['Budapest', 'region', ['budapest']],
  ['Athens', 'region', ['athens', 'athens greece']],
  ['Istanbul', 'region', ['istanbul', 'istanbul turkey']],
  ['Dubai', 'region', ['dubai', 'uae', 'emirates']],
  ['Tel Aviv', 'region', ['tel aviv', 'tel-aviv']],
  ['Cairo', 'region', ['cairo', 'cairo egypt']],
  ['Casablanca', 'region', ['casablanca', 'casablanca morocco']],
  ['Mumbai', 'region', ['mumbai', 'bombay']],
  ['Delhi', 'region', ['delhi', 'new delhi']],
  ['Bangkok', 'region', ['bangkok', 'bangkok thailand']],
  ['Manila', 'region', ['manila', 'manila philippines']],
  ['Tokyo', 'region', ['tokyo', 'tokyo japan']],
  ['Seoul', 'region', ['seoul', 'seoul korea']],
  ['Shanghai', 'region', ['shanghai', 'shanghai china']],
  ['Hong Kong', 'region', ['hong kong', 'hongkong']],
  ['Singapore', 'region', ['singapore']],
  ['Sydney', 'region', ['sydney', 'sydney australia']],
  ['Melbourne', 'region', ['melbourne', 'melbourne australia']],
  ['Toronto', 'region', ['toronto', 'toronto canada']],
  ['Vancouver', 'region', ['vancouver', 'vancouver canada']],
  ['Montreal', 'region', ['montreal', 'montréal']],
  ['Mexico City', 'region', ['mexico city', 'cdmx', 'ciudad de mexico']],
  ['Bogota', 'region', ['bogota', 'bogotá', 'bogota colombia']],
  ['Medellin', 'region', ['medellin', 'medellín']],
  ['Buenos Aires', 'region', ['buenos aires']],
  ['Sao Paulo', 'region', ['sao paulo', 'são paulo']],
  ['Rio de Janeiro', 'region', ['rio de janeiro', 'rio brazil']],
  ['Lima', 'region', ['lima', 'lima peru']],
  ['Santiago', 'region', ['santiago', 'santiago chile']],
  ['Caracas', 'region', ['caracas', 'caracas venezuela']],
  ['Lisbon', 'region', ['lisbon', 'lisboa']],
  ['Dublin', 'region', ['dublin', 'dublin ireland']],
  ['Edinburgh', 'region', ['edinburgh', 'scotland edinburgh']],
  ['Stockholm', 'region', ['stockholm', 'stockholm sweden']],
  ['Oslo', 'region', ['oslo', 'oslo norway']],
  ['Copenhagen', 'region', ['copenhagen', 'copenhagen denmark']],
  ['Helsinki', 'region', ['helsinki', 'helsinki finland']],
  ['Zurich', 'region', ['zurich', 'zürich']],
  ['Moscow', 'region', ['moscow', 'moskva']],
  ['Kyiv', 'region', ['kyiv', 'kiev', 'kyiv ukraine']],
  ['Johannesburg', 'region', ['johannesburg', 'joburg']],
  ['Cape Town', 'region', ['cape town']],
  ['Lagos', 'region', ['lagos', 'lagos nigeria']],
  ['Nairobi', 'region', ['nairobi', 'nairobi kenya']],
];

async function main() {
  await mongoose.connect(MONGO_URI);
  const ofc = mongoose.connection.db.collection('onlyfanscreators');
  const baseMatch = { avatar: avatarMatch, gender: 'female', deleted: { $ne: true } };
  const total = await ofc.countDocuments(baseMatch);
  console.log(`Base pool: ${total} servable creators\n`);

  const rows = [];
  for (const [label, type, terms] of CANDIDATES) {
    const regex = rx(terms);
    const count = await ofc.countDocuments({
      ...baseMatch,
      $or: [
        { bio: regex },
        { categories: regex },
        { name: regex },
        { username: regex },
        { location: regex },
      ],
    });
    rows.push({ label, type, count });
  }

  rows.sort((a, b) => b.count - a.count);

  const with50 = rows.filter((r) => r.count >= 50);
  const with20 = rows.filter((r) => r.count >= 20 && r.count < 50);
  const with1 = rows.filter((r) => r.count >= 1 && r.count < 20);

  console.log(`Candidates tested: ${rows.length}`);
  console.log(`>=50 creators: ${with50.length}`);
  console.log(`20-49 creators: ${with20.length}`);
  console.log(`1-19 creators: ${with1.length}\n`);

  // Pick top 200 unique by count (dedupe same label if any)
  const seen = new Set();
  const top200 = [];
  for (const r of rows) {
    if (seen.has(r.label)) continue;
    seen.add(r.label);
    top200.push(r);
    if (top200.length >= 200) break;
  }

  console.log('=== TOP 200 BUILDABLE CATEGORIES (ranked by creator count) ===');
  console.log('Rank | Type    | Category                    | Creators');
  console.log('-----|---------|-----------------------------|----------');
  top200.forEach((r, i) => {
    const rank = String(i + 1).padStart(3);
    const type = r.type.padEnd(7);
    const label = r.label.padEnd(27);
    const count = String(r.count).padStart(6);
    console.log(`${rank} | ${type} | ${label} | ${count}`);
  });

  const under50in200 = top200.filter((r) => r.count < 50).length;
  console.log(`\nOf top 200: ${200 - under50in200} have >=50 creators, ${under50in200} have <50`);

  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
