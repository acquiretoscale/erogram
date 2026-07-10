/* eslint-disable */
// Validate suspicious counts + mine compound bio phrases for extra categories
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const R2 = process.env.R2_PUBLIC_URL || '';
let avatarMatch = { $ne: '' };
try { if (R2) { const host = new URL(R2).host; avatarMatch = { $regex: host, $options: 'i' }; } } catch {}

function wb(term) {
  const e = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${e}\\b`, 'i');
}
function rx(terms, wordBoundary = true) {
  if (wordBoundary) return new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'i');
  return new RegExp(`(${terms.join('|')})`, 'i');
}
async function count(ofc, baseMatch, terms, wbOnly = true) {
  const regex = rx(terms, wbOnly);
  return ofc.countDocuments({ ...baseMatch, $or: [{ bio: regex }, { categories: regex }, { name: regex }, { username: regex }, { location: regex }] });
}

const COMPOUNDS = [
  ['Blonde MILF', ['blonde milf', 'blond milf']],
  ['Brunette MILF', ['brunette milf']],
  ['Busty MILF', ['busty milf', 'big tit milf']],
  ['Asian Teen', ['asian teen', 'asian 18', 'asian 19']],
  ['Latina MILF', ['latina milf']],
  ['Blonde PAWG', ['blonde pawg', 'blond pawg']],
  ['Redhead PAWG', ['redhead pawg', 'ginger pawg']],
  ['Big Ass Latina', ['big ass latina', 'latina booty']],
  ['Ebony MILF', ['ebony milf', 'black milf']],
  ['Asian Cosplay', ['asian cosplay']],
  ['Goth Girl', ['goth girl']],
  ['Fitness Model', ['fitness model', 'fit model']],
  ['College Girl', ['college girl']],
  ['Girl Next Door', ['girl next door', 'gnd']],
  ['Big Tits Teen', ['big tits teen', 'busty teen']],
  ['Petite Asian', ['petite asian', 'tiny asian']],
  ['Thick Latina', ['thick latina', 'curvy latina']],
  ['Natural Tits', ['natural tits', 'natural boobs']],
  ['Big Booty', ['big booty', 'phat booty']],
  ['OnlyFans Free', ['free onlyfans', 'free page', 'free subscription']],
  ['Feet Fetish', ['feet fetish', 'foot fetish']],
  ['Anal Content', ['anal content', 'anal play', 'anal video']],
  ['Squirt Queen', ['squirt queen', 'squirting']],
  ['Cosplay Girl', ['cosplay girl', 'cosplayer']],
  ['Tattoo Girl', ['tattoo girl', 'tatted girl', 'inked girl']],
  ['Redhead Teen', ['redhead teen', 'ginger teen']],
  ['Blonde Teen', ['blonde teen', 'blond teen']],
  ['MILF Next Door', ['milf next door']],
  ['Latina Teen', ['latina teen']],
  ['Asian MILF', ['asian milf']],
  ['British MILF', ['british milf', 'uk milf']],
  ['German Girl', ['german girl']],
  ['French Girl', ['french girl']],
  ['Italian Girl', ['italian girl']],
  ['Spanish Girl', ['spanish girl']],
  ['Colombian Girl', ['colombian girl', 'colombiana']],
  ['Brazilian Girl', ['brazilian girl', 'brasil girl']],
  ['Russian Girl', ['russian girl']],
  ['Ukrainian Girl', ['ukrainian girl']],
  ['Polish Girl', ['polish girl']],
  ['Japanese Girl', ['japanese girl']],
  ['Korean Girl', ['korean girl']],
  ['Filipina Girl', ['filipina girl', 'pinay']],
  ['Indian Girl', ['indian girl', 'desi girl']],
  ['Arab Girl', ['arab girl']],
  ['Turkish Girl', ['turkish girl']],
  ['Moroccan Girl', ['moroccan girl']],
  ['Australian Girl', ['australian girl', 'aussie girl']],
  ['Canadian Girl', ['canadian girl']],
  ['American Girl', ['american girl', 'usa girl']],
  ['New York Girl', ['new york', 'nyc']],
  ['Miami Girl', ['miami girl', 'miami babe']],
  ['LA Girl', ['los angeles', 'la girl', 'hollywood']],
  ['London Girl', ['london girl', 'london uk']],
  ['Paris Girl', ['paris girl', 'paris france']],
  ['Texas Girl', ['texas girl', 'houston', 'dallas']],
  ['Florida Girl', ['florida girl']],
  ['California Girl', ['california girl', 'cali girl']],
  ['Vegas Girl', ['las vegas', 'vegas girl']],
  ['Chicago Girl', ['chicago girl']],
  ['Solo Girl', ['solo girl', 'solo content']],
  ['Couple Content', ['couple content', 'boy girl content']],
  ['Lesbian Content', ['lesbian content', 'girl on girl']],
  ['BDSM Content', ['bdsm content', 'bdsm']],
  ['Femdom', ['femdom', 'female dom']],
  ['Findom', ['findom', 'financial dom']],
  ['Pregnant MILF', ['pregnant milf', 'pregnant content']],
  ['Pierced', ['pierced nipple', 'pierced']],
  ['Hairy Pussy', ['hairy pussy', 'hairy bush']],
  ['Shaved Pussy', ['shaved pussy', 'smooth pussy']],
  ['Big Clit', ['big clit']],
  ['Tight Pussy', ['tight pussy']],
  ['Wet Pussy', ['wet pussy']],
  ['Dick Rating', ['dick rating', 'cock rating', 'rate your']],
  ['Custom Video', ['custom video', 'custom vid']],
  ['Video Call', ['video call', 'facetime', 'cam call']],
  ['Live Show', ['live show', 'live stream']],
  ['Daily Content', ['daily content', 'post daily']],
  ['No PPV', ['no ppv', 'no paywall']],
  ['Full Video', ['full video', 'full length']],
  ['Exhibitionist', ['exhibitionist', 'public play']],
  ['Voyeur', ['voyeur', 'voyeurism']],
  ['Cuckold', ['cuckold', 'cuck']],
  ['Hotwife', ['hotwife']],
  ['Swingers', ['swinger', 'swingers']],
  ['Threesome', ['threesome', '3some']],
  ['Orgy', ['orgy', 'group sex']],
  ['Gangbang', ['gangbang', 'gang bang']],
  ['Blowjob', ['blowjob', 'bj ', 'deepthroat']],
  ['Handjob', ['handjob']],
  ['Titjob', ['titjob', 'titty fuck', 'titfuck']],
  ['Ass Worship', ['ass worship', 'booty worship']],
  ['Facesitting', ['facesitting', 'face sitting']],
  ['Pegging', ['pegging']],
  ['Strap On', ['strap on', 'strapon']],
  ['Latex', ['latex', 'rubber fetish']],
  ['Leather', ['leather fetish', 'leather outfit']],
  ['Stockings', ['stockings', 'nylon', 'pantyhose']],
  ['Heels', ['high heels', 'heels']],
  ['Secretary', ['secretary roleplay', 'office secretary']],
  ['Nurse Roleplay', ['nurse roleplay', 'sexy nurse']],
  ['Teacher Roleplay', ['teacher roleplay', 'sexy teacher']],
  ['Cheerleader', ['cheerleader']],
  ['Flight Attendant', ['flight attendant', 'stewardess']],
  ['Police', ['police officer', 'cop roleplay']],
  ['Military', ['military girl', 'army girl']],
  ['Farm Girl', ['farm girl', 'country girl']],
  ['Surfer Girl', ['surfer girl', 'surf girl']],
  ['Snow Bunny', ['snow bunny', 'snowbunny']],
  ['Ice Queen', ['ice queen']],
  ['Dominant', ['dominant woman', 'dom woman']],
  ['Submissive Girl', ['submissive girl', 'sub girl']],
  ['Switch', ['switch ', 'dom and sub']],
  ['Brat', ['brat tamer', ' brat ']],
  ['Princess', ['princess ', 'spoiled princess']],
  ['Goddess', ['goddess ', 'findom goddess']],
  ['Queen', [' queen ', 'your queen']],
  ['Barbie', ['barbie ', 'barbie girl']],
  ['Bimbo', ['bimbo ', 'bimbofication']],
  ['Nerd', ['nerd girl', 'nerdy girl']],
  ['Librarian', ['librarian']],
  ['Housewife', ['housewife', 'stay at home']],
  ['Single Mom', ['single mom', 'single mother']],
  ['Twin', ['twin sister', 'twins']],
  ['BBW Latina', ['bbw latina', 'chubby latina']],
  ['BBW Ebony', ['bbw ebony', 'chubby ebony']],
  ['Skinny Girl', ['skinny girl', 'skinny babe']],
  ['Tall Girl', ['tall girl', 'long legs']],
  ['Short Girl', ['short girl', 'petite short']],
  ['Muscular', ['muscular girl', 'muscle mommy', 'musclemommy']],
  ['Crossfit', ['crossfit', 'cross fit']],
  ['Pilates', ['pilates']],
  ['Runner', ['runner girl', 'marathon']],
  ['Swimmer', ['swimmer girl']],
  ['Cheerleader Teen', ['cheerleader teen']],
  ['Emo Girl', ['emo girl']],
  ['Punk Girl', ['punk girl']],
  ['Scene Girl', ['scene girl']],
  ['Raver', ['raver girl', ' edm ']],
  ['DJ', [' dj ', 'female dj']],
  ['Musician', ['musician', 'singer', 'songwriter']],
  ['Artist', ['artist', 'painter']],
  ['Photographer', ['photographer model']],
  ['Travel', ['travel girl', 'wanderlust']],
  ['Beach', ['beach girl', 'beach babe']],
  ['Pool', ['pool party', 'poolside']],
  ['Shower', ['shower content', 'shower video']],
  ['Bath', ['bath content', 'bathtub']],
  ['Bedroom', ['bedroom content', 'bedroom eyes']],
  ['Kitchen', ['kitchen content']],
  ['Outdoor', ['outdoor content', 'outside']],
  ['Public', ['public content', 'in public']],
  ['Car', ['car content', 'backseat']],
  ['Hotel', ['hotel content', 'hotel room']],
  ['Vacation', ['vacation content', 'holiday']],
  ['Christmas', ['christmas content', 'xmas', 'holiday']],
  ['Halloween', ['halloween', 'spooky season']],
  ['Valentine', ['valentine', 'valentines']],
  ['Birthday', ['birthday content']],
  ['Wedding', ['bride', 'wedding dress']],
  ['Pregnant Belly', ['pregnant belly', 'baby bump']],
  ['Postpartum', ['postpartum', 'after birth']],
  ['Lactation', ['lactation', 'breast milk', 'milking']],
  ['Smoking', ['smoking fetish', ' cigarette ']],
  ['420', ['420', 'cannabis', 'weed']],
  ['Party Girl', ['party girl']],
  ['Club', ['club girl', 'nightclub']],
  ['Strip Club', ['strip club', 'stripper']],
  ['Escort', ['escort', 'companion']],
  ['Sugar Baby', ['sugar baby', 'sugar daddy']],
  ['GFE', ['gfe', 'girlfriend experience']],
  ['PSE', ['pse', 'pornstar experience']],
  ['Massage', ['massage', 'sensual massage']],
  ['Tantric', ['tantric', 'tantra']],
  ['Yoni', ['yoni', 'yoni massage']],
  ['Nuru', ['nuru massage', 'nuru']],
  ['Oil', ['oil massage', 'oiled up', 'oil play']],
  ['Wax', ['wax play', 'candle wax']],
  ['Spanking', ['spanking', 'spank']],
  ['Choking', ['choking', 'breath play']],
  ['Bondage', ['bondage', 'tied up', 'rope']],
  ['Shibari', ['shibari', 'kinbaku']],
  ['Collar', ['collar', 'leash', 'pet play']],
  ['Pet Play', ['pet play', 'puppy play', 'kitten play']],
  ['Age Play', ['age play', 'ddlg', 'little space']],
  ['DDLG', ['ddlg', 'daddy dom']],
  ['CNC', ['cnc', 'consensual non']],
  ['Humiliation', ['humiliation', 'degradation']],
  ['SPH', ['sph', 'small penis']],
  ['CEI', ['cei', 'cum eating']],
  ['Jerk Off', ['jerk off instruction', 'joi ']],
  ['Sissy', ['sissy', 'sissification']],
  ['Feminization', ['feminization', 'sissy training']],
  ['Chastity', ['chastity', 'cage']],
  ['Cuck', ['cuck', 'cuckold']],
  ['Bull', ['bull ', 'hotwife bull']],
  ['Glory Hole', ['glory hole', 'gloryhole']],
  ['Gloryhole', ['gloryhole']],
  ['Glory', ['glory hole']],
];

async function main() {
  await mongoose.connect(MONGO_URI);
  const ofc = mongoose.connection.db.collection('onlyfanscreators');
  const baseMatch = { avatar: avatarMatch, gender: 'female', deleted: { $ne: true } };

  console.log('=== SANITY: suspicious broad matches ===');
  const checks = [
    ['Trans (old broad)', ['trans', 'transgender', 'ts ', 'shemale', 'ladyboy'], false],
    ['Trans (word-boundary trans only)', ['transgender', 'trans woman', 'transgirl'], true],
    ['Trans (category tag only)', ['trans'], true],
    ['Alt ( alt )', [' alt '], true],
  ];
  for (const [label, terms, wb] of checks) {
    console.log(`  ${label}: ${await count(ofc, baseMatch, terms, wb)}`);
  }

  console.log('\n=== COMPOUND / PHRASE CATEGORIES (>=30 creators) ===');
  const rows = [];
  for (const [label, terms] of COMPOUNDS) {
    const c = await count(ofc, baseMatch, terms, false);
    if (c >= 30) rows.push({ label, count: c, type: label.includes('Girl') || label.includes('York') || label.includes('Miami') || label.includes('London') || label.includes('Paris') || label.includes('Vegas') || label.includes('Chicago') || label.includes('Texas') || label.includes('Florida') || label.includes('California') || label.includes('LA Girl') ? 'region' : 'compound' });
  }
  rows.sort((a, b) => b.count - a.count);
  rows.forEach((r, i) => console.log(`  ${String(i + 1).padStart(3)}. ${r.label.padEnd(22)} ${String(r.count).padStart(5)}`));
  console.log(`\nCompounds >=30: ${rows.length}`);

  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
