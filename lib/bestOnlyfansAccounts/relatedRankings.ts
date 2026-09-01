/**
 * Related ranking / browse niches for internal links + cluster fill.
 * Each slug belongs to at most one group.
 */

import { BEST_OF_PAGE_MAP } from '@/app/best-onlyfans-accounts/bestOfPages';
import { rankingEnglishPublicPath } from '@/lib/bestOfPageContent/hottestUrls';

export const RELATED_RANKING_GROUPS: readonly (readonly string[])[] = [
  // MENA / Muslim / Arab
  ['arab', 'moroccan', 'muslim', 'hijabi', 'turkish', 'persian'],

  // Latina / LatAm
  ['latina', 'colombian', 'brazilian', 'mexican', 'argentinian', 'chilean', 'puerto-rican'],

  // Asian
  ['asian', 'japanese', 'chinese', 'thai', 'taiwanese', 'filipina', 'singaporean'],

  // Body / figure
  ['big-ass', 'big-booty', 'pawg', 'thick', 'chubby', 'bbw', 'busty', 'big-boobs'],

  // Young / petite / anime-adjacent (not MILF)
  ['teen', 'petite', 'ahegao', 'streamer'],

  // MILF / mature vibe (not teen)
  ['milf', 'mommy', 'college', 'college-girl', 'girl-next-door', 'amateur'],

  // Alt / aesthetic
  ['goth', 'goth-girl', 'alt', 'e-girl', 'tattoo', 'piercing', 'redhead', 'blonde', 'brunette'],

  // Cosplay / anime
  ['cosplay', 'anime', 'catgirl', 'bunny-girl', 'maid'],

  // Domme / kink
  ['femdom', 'dominatrix', 'findom', 'bdsm', 'bondage', 'latex', 'submissive', 'fetish'],

  // Couple / lifestyle
  ['couple', 'couple-lesbian', 'couple-straight', 'hotwife', 'threesome'],

  // North America (US + Canada + states)
  [
    'american',
    'canadian',
    'california',
    'florida',
    'texas',
    'nevada',
    'new-york',
    'georgia',
    'michigan',
    'colorado',
    'illinois',
    'north-carolina',
    'arizona',
  ],

  // Europe (incl. Eastern Europe / caucasian)
  [
    'caucasian',
    'ukrainian',
    'russian',
    'polish',
    'romanian',
    'czech',
    'british',
    'german',
    'french',
    'italian',
    'spanish',
    'dutch',
    'swedish',
    'norwegian',
    'finnish',
    'greek',
    'irish',
    'scottish',
  ],

  // Oceania
  ['australian', 'new-zealand'],
];

/**
 * Extra fully-linked clusters that cross primary groups (e.g. US states × body hubs).
 * Bidirectional. Does not move a slug out of its primary RELATED_RANKING_GROUPS cluster.
 */
const RELATED_CROSS_GROUPS: readonly (readonly string[])[] = [
  // US states / American × big ass / big boobs / pornstar
  [
    'american',
    'california',
    'florida',
    'texas',
    'nevada',
    'new-york',
    'georgia',
    'michigan',
    'colorado',
    'illinois',
    'north-carolina',
    'arizona',
    'big-ass',
    'big-boobs',
    'pornstar',
  ],
  // US states / American × Australia / UK (Canada already in North America primary)
  [
    'american',
    'california',
    'florida',
    'texas',
    'nevada',
    'new-york',
    'georgia',
    'michigan',
    'colorado',
    'illinois',
    'north-carolina',
    'arizona',
    'australian',
    'british',
  ],
  // MENA × curvy / booty / ass / pawg / boobs / pornstar
  [
    'arab',
    'moroccan',
    'muslim',
    'hijabi',
    'turkish',
    'persian',
    'curvy',
    'big-ass',
    'big-booty',
    'pawg',
    'big-boobs',
    'pornstar',
  ],
];

const _slugToGroup = new Map<string, readonly string[]>();
for (const group of RELATED_RANKING_GROUPS) {
  for (const s of group) {
    if (!_slugToGroup.has(s)) _slugToGroup.set(s, group);
  }
}

const _slugToExtras = new Map<string, Set<string>>();
function linkCrossExtra(a: string, b: string) {
  if (a === b) return;
  if (!_slugToExtras.has(a)) _slugToExtras.set(a, new Set());
  if (!_slugToExtras.has(b)) _slugToExtras.set(b, new Set());
  _slugToExtras.get(a)!.add(b);
  _slugToExtras.get(b)!.add(a);
}
for (const group of RELATED_CROSS_GROUPS) {
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      linkCrossExtra(group[i], group[j]);
    }
  }
}

const LABEL_FALLBACK: Record<string, string> = {
  arab: 'Arab',
  moroccan: 'Moroccan',
  muslim: 'Muslim',
  hijabi: 'Hijabi',
  turkish: 'Turkish',
  persian: 'Persian',
  latina: 'Latina',
  colombian: 'Colombian',
  brazilian: 'Brazilian',
  mexican: 'Mexican',
  argentinian: 'Argentinian',
  chilean: 'Chilean',
  'puerto-rican': 'Puerto Rican',
  asian: 'Asian',
  japanese: 'Japanese',
  chinese: 'Chinese',
  thai: 'Thai',
  taiwanese: 'Taiwanese',
  filipina: 'Filipina',
  singaporean: 'Singaporean',
  'big-ass': 'Big Ass',
  'big-booty': 'Big Booty',
  pawg: 'PAWG',
  thick: 'Thick',
  chubby: 'Chubby',
  bbw: 'BBW',
  petite: 'Petite',
  busty: 'Busty',
  'big-boobs': 'Big Boobs',
  curvy: 'Curvy',
  pornstar: 'Pornstar',
  teen: 'Teen',
  milf: 'MILF',
  mommy: 'Mommy',
  college: 'College',
  'college-girl': 'College Girl',
  'girl-next-door': 'Girl Next Door',
  amateur: 'Amateur',
  goth: 'Goth',
  'goth-girl': 'Goth Girl',
  alt: 'Alt',
  'e-girl': 'E-Girl',
  tattoo: 'Tattoo',
  piercing: 'Piercing',
  redhead: 'Redhead',
  blonde: 'Blonde',
  brunette: 'Brunette',
  cosplay: 'Cosplay',
  anime: 'Anime',
  ahegao: 'Ahegao',
  streamer: 'Streamer',
  catgirl: 'Catgirl',
  'bunny-girl': 'Bunny Girl',
  maid: 'Maid',
  femdom: 'Femdom',
  dominatrix: 'Dominatrix',
  findom: 'Findom',
  bdsm: 'BDSM',
  bondage: 'Bondage',
  latex: 'Latex',
  submissive: 'Submissive',
  fetish: 'Fetish',
  couple: 'Couple',
  'couple-lesbian': 'Couple Lesbian',
  'couple-straight': 'Couple Straight',
  hotwife: 'Hotwife',
  threesome: 'Threesome',
  american: 'American',
  canadian: 'Canadian',
  california: 'California',
  florida: 'Florida',
  texas: 'Texas',
  nevada: 'Nevada',
  'new-york': 'New York',
  georgia: 'Georgia',
  michigan: 'Michigan',
  colorado: 'Colorado',
  illinois: 'Illinois',
  'north-carolina': 'North Carolina',
  arizona: 'Arizona',
  caucasian: 'Caucasian',
  ukrainian: 'Ukrainian',
  russian: 'Russian',
  polish: 'Polish',
  romanian: 'Romanian',
  czech: 'Czech',
  british: 'British',
  german: 'German',
  french: 'French',
  italian: 'Italian',
  spanish: 'Spanish',
  dutch: 'Dutch',
  swedish: 'Swedish',
  norwegian: 'Norwegian',
  finnish: 'Finnish',
  greek: 'Greek',
  irish: 'Irish',
  scottish: 'Scottish',
  australian: 'Australian',
  'new-zealand': 'New Zealand',
};

export type RelatedRankingVariant = 'top10' | 'best';

export type RelatedRankingLink = {
  slug: string;
  variant: RelatedRankingVariant;
  /** Keyword-rich anchor text, e.g. "Best Arab Models" / "Top Turkish Models" */
  label: string;
  path: string;
};

export function getRelatedRankingSlugs(slug: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (s: string) => {
    if (!s || s === slug || seen.has(s)) return;
    seen.add(s);
    out.push(s);
  };
  const group = _slugToGroup.get(slug);
  if (group) {
    for (const s of group) push(s);
  }
  const extras = _slugToExtras.get(slug);
  if (extras) {
    for (const s of extras) push(s);
  }
  return out;
}

/** Full cluster including self — for fill pipelines (primary + cross links). */
export function getClusterSlugs(slug: string): string[] {
  return [slug, ...getRelatedRankingSlugs(slug)];
}

export function relatedRankingLabel(slug: string): string {
  return BEST_OF_PAGE_MAP.get(slug)?.label || LABEL_FALLBACK[slug] || slug;
}

/**
 * Map a free-text search query to a cluster slug when it matches a known label/slug.
 */
export function resolveClusterSlugFromQuery(query: string): string | null {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!q) return null;
  const known = new Set<string>([
    ..._slugToGroup.keys(),
    ..._slugToExtras.keys(),
    ...Object.keys(LABEL_FALLBACK),
  ]);
  for (const slug of known) {
    if (slug === q || slug.replace(/-/g, ' ') === q) return slug;
    const label = relatedRankingLabel(slug).toLowerCase();
    if (label === q) return slug;
  }
  // also try without trailing s (brazilians → brazilian)
  if (q.endsWith('s') && q.length > 3) {
    return resolveClusterSlugFromQuery(q.slice(0, -1));
  }
  return null;
}

function relatedPath(slug: string, variant: RelatedRankingVariant): string {
  return rankingEnglishPublicPath(slug, variant === 'best' ? 'best' : 'top');
}

function relatedAnchor(slug: string, variant: RelatedRankingVariant): string {
  const name = relatedRankingLabel(slug);
  return variant === 'best' ? `Best ${name} Models` : `Top ${name} Models`;
}

/**
 * Related ranking links with keyword-rich labels.
 * Alternates Top ↔ Best so backlinks are not all the same product.
 * If `preferStart` is set, the first link uses the opposite of that variant.
 *
 * placement:
 * - top → up to 5 from the primary same-cluster group
 * - bottom → everything else (remaining cluster + cross links), no overlap with top
 * - all → full list
 */
export const RELATED_TOP_CLUSTER_LIMIT = 5;

export function getPrimaryClusterRelatedSlugs(slug: string): string[] {
  const group = _slugToGroup.get(slug);
  if (!group) return [];
  return group.filter((s) => s !== slug);
}

export function getRelatedRankingLinks(
  slug: string,
  preferStart: RelatedRankingVariant = 'top10',
  placement: 'all' | 'top' | 'bottom' = 'all',
): RelatedRankingLink[] {
  const related = getRelatedRankingSlugs(slug);
  const start: RelatedRankingVariant = preferStart === 'top10' ? 'best' : 'top10';
  const all = related.map((s, i) => {
    const variant: RelatedRankingVariant = i % 2 === 0 ? start : start === 'best' ? 'top10' : 'best';
    return {
      slug: s,
      variant,
      label: relatedAnchor(s, variant),
      path: relatedPath(s, variant),
    };
  });

  if (placement === 'all') return all;

  const topSlugSet = new Set(
    getPrimaryClusterRelatedSlugs(slug).slice(0, RELATED_TOP_CLUSTER_LIMIT),
  );

  if (placement === 'top') {
    return all.filter((l) => topSlugSet.has(l.slug));
  }

  return all.filter((l) => !topSlugSet.has(l.slug));
}
