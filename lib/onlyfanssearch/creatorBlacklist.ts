/**
 * FOREVER blacklist — DMCA / copyright-claim creators.
 * Never scrape, import, upsert, or re-add these usernames/slugs to Erogram.
 * Owner order 2026-08-08.
 */

const RAW = [
  // Existing purged (reoptimize script) + full DMCA claim aliases
  'francety',
  'ashleyyyreyyy',
  'gem101',
  'stellabrooks',
  'babydollll',
  'amibuefree',
  'amibuexo',
  'amibue',
  'amibuexx',
  'pennylondon',
  'pennylondon_x',
  'pennylondonvip',
  'penny london',
  'melthewhale',
  'melthewhalefree',
  'whaleymel',
  'thevivonline',
  'helloviv',
  'vivianwest',
  'luciddreamexe',
  'dzesi_ikita',
  'ericadream',
  'lu2hot',
  'thelu2hot',
  'emmaswrld',
  'your_fatale',
  'yeah_bamby',
  'bambi_baby',
  'bellajynx.free',
  'bellajynxxx',
  'bella.jynx',
  'bella_jynx',
  'bellajynx',
  'bellajynxx',
  'itsbellajynx',
  'pixiecat',
  'pixiecatofficial',
  'thebellajynx',
  'bellajynxofficial',
  'hotbellapov',
  'bellajynx_cos',
  'weirdfroggirl',
  'kassqueen98',
  'kassqueen98_free',
  'pussiesncream_',
  'ddd_queen',
  'charlotte_rachel',
  'charlotterachel',
  'charlotte_rachelx',
  'charlotte rachel',
  'bellebrooksxo',
  'lioqueen',
  'lioqueenn',
  'nataliasalasvv',
  'nataliasalasv',
  'natashatosini',
  'jocy_cosplay',
  'jocycosplay.vip',
  'jocycosplay',
  'jocy-cosplay',
  'jocycosplay_oficial',
  'jocycosplayvip',
  'jocyfansly',
  'waifualien',
  'waifualien_',
  'jocycosplayoficial',
  'jocycosplay_',
  'jocycosplay2',
  'jocy_cosplay__',
  'jocycosas',
  'jocycostume',
  'rendirsenunca_',
  'adamlunes',
  'otravezlunesshow',
  'jocygameplay',
  'jocywaifu',
  'murkyteam62',
  'justgemma',
  'gemma mccourt',
  'gemmamccourt',
  'honeyrashell',
  'honey rashell',
  'elizabethbluee',
  'blahgigi',
  'blahgigi_too',
  'officiallyblahgigi',
  'justblahgigi',
  'everythingblahgigi',
  'myofisblahgigi',
  'backshotschamp',
  'blahgigi_',
  'summerstarz',
  'summerstarzfree',
  'summer starz',
  // Still-present eradicated 2026-08-08
  'beckydaisy',
  'becksdaisy',
  'becksdaisy1',
  'becksdaisy__',
  'sofieesoles',
  'sofieebabyy',
  'sofiee',
  'dianakills',
  'dianakillingsworth',
  'shibahuskymom',
  'diana killingsworth',
  'lazylittleleaf',
  'lazyleaff',
  'lazypurpleleaf',
  'luraymama',
  'onaartist',
  'daisymaymommy',
  'thepregnantbabe',
  'jamieispregnant',
  'jamiejerksme',
  'freeeroticneko',
  'eroticneko',
  'siashicat',
  'urthickpersiangf',
  'urthickpersiangfnoppv',
  'meliaclaps',
  'angelflairee',
  'roomorgue',
  'raphaelite suicide',
  'roo morgue',
  'tymwitsfree',
  'tymwits',
  'nikkirita',
  'nikkiritaa',
  'nikkiritaaa',
  'nikkiritapriv',
  'marichka18',
  'marichkacute',
  'interestingclara',
  'marichka_keye',
  'mirenbloom',
  'marichka_vibe',
  'lil_marichka',
  'marichka_honeyy',
  'mariichkama',
  'cherry_flick',
  'nillaglow',
  'mialushhh',
  'mialushhhvip',
  'sagittariusgrl',
  'anibae',
  'anibae.vip',
  'anibae.free',
  'anibae_cos',
  'amandastunning',
  'skyrhi',
  'skyrhi_',
  'skyyrhi',
  'htownliv',
  'olivia bethel',
  'jaydenee',
  'jaydene whelehan',
  'ts0f1m',
  'ts0f1m.free',
  // Aug 9 2026 Google notices — forever ban
  'pasteljelliesvip',
  'pasteljelliesc',
  'pasteljellies',
  'dangerousdilemma',
  'baritoneilemma',
  'deliciousdilemma',
  'viktoriapeach',
  'viktoria69peach',
  'viktoriapeach69',
  'marsha may',
  'marshaxxxmay',
  'marshamay',
  'glitterandfangs',
  'softcorecosplay',
  'bobacorecos',
  'executionergf',
  'executionergfvip',
  'bom trady',
  'bomtrady',
  'shamelessx',
  'shameless-sg',
  'shamelessxx',
  'bluebeari3',
  'bluebeari',
  'yourbluebeari',
  'bluebeari3vip',
  'bluebeari3exclusive',
  'nali marie',
  'nali-marie',
  'nalimarie',
  'nalimarieofficial',
  'nalimariefree',
  'paleseafoam',
  'paleseafoa',
  'palseafoam',
  'arabic princess',
  'arabicprincess',
  'milakream',
  'jamilakream',
  'slavebc',
  'blonde_bc',
  'blondebc',
  'alessa',
  'bellegothddess',
  'belledarkgod',
  'belledarkgoddess',
  'belledarkmistress',
  // Aug 9–10 2026 Google DMCA notices (DMCA Piracy Prevention Inc)
  'finesse_ahhxxx',
  'finesse ahhxxx',
  'finesseahhxxx',
  'vanessahh',
  'bbgumbitchh',
  'bbgumbitch',
  'feya quinn',
  'feyaquinn',
  'feyaquinnvip',
  'rosierendallx',
  'rosierendallxo',
  'itsrosierendallfree',
  'itsrosierendall',
  'rosierendall',
] as const;

function addKey(set: Set<string>, raw: string) {
  const n = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?onlyfans\.com\//i, '')
    .replace(/[/?#].*$/, '');
  if (!n) return;
  set.add(n);
  const slug = n.replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (slug) set.add(slug);
  const compact = n.replace(/[^a-z0-9]/g, '');
  if (compact) set.add(compact);
}

const BLACKLIST = new Set<string>();
for (const u of RAW) addKey(BLACKLIST, u);

export function isCreatorBlacklisted(usernameOrSlug: string): boolean {
  const n = String(usernameOrSlug || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?onlyfans\.com\//i, '')
    .replace(/[/?#].*$/, '');
  if (!n) return false;
  if (BLACKLIST.has(n)) return true;
  const slug = n.replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (slug && BLACKLIST.has(slug)) return true;
  const compact = n.replace(/[^a-z0-9]/g, '');
  if (compact && BLACKLIST.has(compact)) return true;
  return false;
}

/**
 * True when a public URL segment must hard-404 (DMCA forever ban).
 * Covers bare slugs, /onlyfanssearch/{user}, legacy /{user}-onlyfans,
 * and /{user}-onlyfans-telegram (any locale prefix stripped by caller).
 */
export function isBlacklistedPublicPathSegment(segment: string): boolean {
  const raw = String(segment || '')
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '');
  if (!raw) return false;
  if (isCreatorBlacklisted(raw)) return true;
  if (raw.endsWith('-onlyfans-telegram')) {
    return isCreatorBlacklisted(raw.slice(0, -'-onlyfans-telegram'.length));
  }
  if (raw.endsWith('-onlyfans')) {
    return isCreatorBlacklisted(raw.slice(0, -'-onlyfans'.length));
  }
  return false;
}

/** Flat list for scripts / audits (normalized lowercase identities only). */
export function getCreatorBlacklist(): string[] {
  return [...RAW].map((u) => u.toLowerCase().trim()).filter(Boolean);
}

/** Sorted display list (deduped, for admin Legal UI). */
export function getCreatorBlacklistForDisplay(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of RAW) {
    const key = u.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(u);
  }
  return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export const CREATOR_BLACKLIST_COUNT = RAW.length;
