import { buildR2AvatarMatch, whaleBrowseLikesFilter } from '@/lib/tags/creatorMatch';
import { getTagDefinition } from '@/lib/tags/registry';

export const SEARCH_KNOWN_TERMS = new Set([
  'asian', 'blonde', 'teen', 'milf', 'amateur', 'redhead', 'goth',
  'petite', 'big ass', 'big-ass', 'big boobs', 'big-boobs',
  'brunette', 'latina', 'ahegao', 'alt',
  'cosplay', 'fitness', 'tattoo', 'curvy', 'ebony',
  'feet', 'lingerie', 'thick', 'twerk', 'squirt',
  'streamer', 'piercing',
  'mature', 'housewife', 'taiwanese', 'filipina', 'chinese', 'south-korean',
  'france', 'germany', 'spain', 'italy', 'uk', 'usa', 'brazil',
  'colombia', 'mexico', 'argentina', 'japan', 'philippines', 'australia',
  'canada', 'russia', 'ukraine', 'poland', 'romania', 'czech', 'netherlands',
  'asia', 'latin', 'hispanic', 'japanese', 'korean', 'thailand', 'thai',
  'vietnam', 'vietnamese', 'malaysia', 'malaysian', 'china', 'chinese',
  'colombian', 'brazilian', 'brasil', 'mexican', 'ecuador', 'ecuadorian',
  'bubble butt', 'bubble-butt', 'phat ass',
  'big booty', 'big-booty', 'booty', 'ass', 'butt',
  'big tits', 'big-tits', 'busty', 'boobs', 'tits',
  'thicc', 'pawg', 'babe', 'hot', 'sexy',
  'inked', 'tattooed', 'tattoos',
  'fit', 'gym', 'athletic',
  'gamer', 'gaming', 'e-girl', 'egirl',
  'emo', 'punk', 'grunge', 'alternative',
  'red hair', 'ginger',
  'small', 'tiny', 'skinny', 'slim',
  'chubby', 'bbw', 'plus size', 'plus-size', 'blowjob', 'joi',
]);

const ASIAN_TERMS = [
  'asian', 'asia', 'japanese', 'japan', 'korean', 'korea', 'south-korean', 'thai', 'thailand',
  'vietnamese', 'vietnam', 'malaysian', 'malaysia', 'chinese', 'china',
  'taiwan', 'taiwanese', 'filipina', 'filipino', 'philippines', 'pinay',
  'indonesian', 'indonesia', 'singapore', 'singaporean', 'hong kong',
];

const LATINA_TERMS = [
  'latina', 'latin', 'hispanic', 'colombian', 'colombia', 'brazilian', 'brazil',
  'brasil', 'mexican', 'mexico', 'argentinian', 'argentina', 'venezuelan',
  'venezuela', 'peruvian', 'peru', 'chilean', 'chile', 'ecuadorian', 'ecuador',
  'dominican', 'puerto rican', 'puerto rico', 'cuban', 'cuba',
];

const BIG_ASS_TERMS = [
  'big ass', 'big-ass', 'big booty', 'big-booty', 'booty', 'bubble butt',
  'bubble-butt', 'ass', 'butt', 'pawg', 'phat ass', 'thick ass',
];

const SYNONYMS: Record<string, string[]> = {
  asian: ASIAN_TERMS,
  asia: ASIAN_TERMS,
  latina: LATINA_TERMS,
  latin: LATINA_TERMS,
  hispanic: LATINA_TERMS,
  colombia: ['colombian', 'colombia', 'latina', 'latin'],
  colombian: ['colombian', 'colombia', 'latina', 'latin'],
  brazil: ['brazilian', 'brazil', 'brasil', 'latina', 'latin'],
  brazilian: ['brazilian', 'brazil', 'brasil', 'latina', 'latin'],
  brasil: ['brazilian', 'brazil', 'brasil', 'latina', 'latin'],
  mexico: ['mexican', 'mexico', 'latina', 'latin'],
  mexican: ['mexican', 'mexico', 'latina', 'latin'],
  japan: ['japanese', 'japan', 'asian', 'asia'],
  japanese: ['japanese', 'japan', 'asian', 'asia'],
  korea: ['korean', 'korea', 'asian', 'asia'],
  korean: ['korean', 'korea', 'asian', 'asia'],
  thailand: ['thai', 'thailand', 'asian', 'asia'],
  thai: ['thai', 'thailand', 'asian', 'asia'],
  vietnam: ['vietnamese', 'vietnam', 'asian', 'asia'],
  vietnamese: ['vietnamese', 'vietnam', 'asian', 'asia'],
  malaysia: ['malaysian', 'malaysia', 'asian', 'asia'],
  malaysian: ['malaysian', 'malaysia', 'asian', 'asia'],
  'big ass': BIG_ASS_TERMS,
  'big-ass': BIG_ASS_TERMS,
  'big booty': BIG_ASS_TERMS,
  'big-booty': BIG_ASS_TERMS,
  booty: BIG_ASS_TERMS,
  ass: BIG_ASS_TERMS,
  butt: BIG_ASS_TERMS,
  pawg: BIG_ASS_TERMS,
  'big tits': ['big boobs', 'big-boobs', 'busty', 'big tits', 'big-tits', 'tits', 'boobs'],
  'big-tits': ['big boobs', 'big-boobs', 'busty', 'big tits', 'big-tits', 'tits', 'boobs'],
  busty: ['big boobs', 'big-boobs', 'busty', 'big tits', 'big-tits'],
  boobs: ['big boobs', 'big-boobs', 'busty', 'boobs', 'tits'],
  tits: ['big boobs', 'big-boobs', 'busty', 'boobs', 'tits'],
  thicc: ['thick', 'curvy', 'chubby', 'thicc'],
  thick: ['thick', 'curvy', 'chubby'],
  curvy: ['thick', 'curvy', 'chubby'],
  inked: ['tattoo', 'inked', 'tattooed', 'tattoos'],
  tattooed: ['tattoo', 'inked', 'tattooed', 'tattoos'],
  tattoos: ['tattoo', 'inked', 'tattooed', 'tattoos'],
  fit: ['fitness', 'fit', 'gym', 'athletic'],
  gym: ['fitness', 'fit', 'gym', 'athletic'],
  athletic: ['fitness', 'fit', 'gym', 'athletic'],
  gamer: ['streamer', 'gamer', 'gaming', 'e-girl', 'egirl'],
  gaming: ['streamer', 'gamer', 'gaming'],
  'e-girl': ['streamer', 'gamer', 'e-girl', 'egirl', 'alt'],
  egirl: ['streamer', 'gamer', 'e-girl', 'egirl', 'alt'],
  emo: ['goth', 'emo', 'alt', 'punk', 'grunge', 'alternative'],
  punk: ['goth', 'emo', 'alt', 'punk', 'alternative'],
  grunge: ['goth', 'emo', 'alt', 'grunge', 'alternative'],
  alternative: ['goth', 'emo', 'alt', 'alternative'],
  'red hair': ['redhead', 'red hair', 'ginger'],
  ginger: ['redhead', 'red hair', 'ginger'],
  small: ['petite', 'small', 'tiny', 'skinny', 'slim'],
  tiny: ['petite', 'small', 'tiny'],
  skinny: ['petite', 'skinny', 'slim', 'small'],
  slim: ['petite', 'skinny', 'slim', 'small'],
  chubby: ['thick', 'curvy', 'chubby', 'bbw', 'plus size', 'plus-size'],
  bbw: ['thick', 'curvy', 'chubby', 'bbw', 'plus size', 'plus-size'],
  'plus size': ['thick', 'curvy', 'chubby', 'plus size', 'plus-size'],
  'plus-size': ['thick', 'curvy', 'chubby', 'plus size', 'plus-size'],
  babe: ['amateur', 'babe', 'hot', 'sexy'],
  hot: ['amateur', 'babe', 'hot', 'sexy'],
  sexy: ['amateur', 'babe', 'hot', 'sexy'],
  milf: ['milf', 'mature', 'housewife', 'mommy', 'cougar'],
  mature: ['milf', 'mature', 'housewife', 'mommy', 'cougar'],
  housewife: ['milf', 'mature', 'housewife'],
  twerk: ['twerk', 'latina', 'curvy'],
  goth: ['goth', 'alt', 'tattoo'],
  alt: ['goth', 'alt', 'tattoo'],
  tattoo: ['goth', 'alt', 'tattoo'],
  ahegao: ['ahegao', 'blowjob', 'joi'],
  blowjob: ['ahegao', 'blowjob', 'joi'],
  joi: ['ahegao', 'blowjob', 'joi'],
};

const MAX_CATEGORIES = 4;
const NOT_SPAM_TAGGED = {
  $expr: { $lte: [{ $size: { $ifNull: ['$categories', []] } }, MAX_CATEGORIES] },
};

export interface SearchPlan {
  normalized: string;
  words: string[];
  escaped: string;
  slugTerms: string[];
  categoryRegexes: RegExp[];
}

function slugifyTerm(term: string): string {
  return term.toLowerCase().replace(/\s+/g, '-').replace(/(^-|-$)/g, '');
}

export function expandSearchQuery(raw: string): SearchPlan | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const categoryTerms = new Set<string>([normalized]);
  if (normalized.includes(' ')) categoryTerms.add(normalized.replace(/\s+/g, '-'));
  if (normalized.includes('-')) categoryTerms.add(normalized.replace(/-/g, ' '));
  if (SYNONYMS[normalized]) {
    for (const s of SYNONYMS[normalized]) categoryTerms.add(s);
  }
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    for (const word of words) {
      categoryTerms.add(word);
      if (SYNONYMS[word]) {
        for (const s of SYNONYMS[word]) categoryTerms.add(s);
      }
    }
  }

  const categoryRegexes = [...categoryTerms].map((term) => {
    const termEscaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(termEscaped, 'i');
  });
  const slugTerms = [...new Set([...categoryTerms].map(slugifyTerm).filter(Boolean))];

  return { normalized, words, escaped, slugTerms, categoryRegexes };
}

export function buildSearchOrClauses(plan: SearchPlan): Record<string, unknown>[] {
  const regex = new RegExp(plan.escaped, 'i');
  const noSpaces = plan.normalized.replace(/\s+/g, '');
  const bioOr = plan.categoryRegexes.map((r) => ({ bio: r }));
  const locationOr = plan.categoryRegexes.map((r) => ({ location: r }));
  const wordRegexes = plan.words.length > 1
    ? plan.words.map((w) => new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
    : [];
  const noSpacesRegex = plan.words.length > 1 ? new RegExp(noSpaces, 'i') : null;

  const nameOr: Record<string, unknown>[] = [
    { name: regex },
    { username: regex },
    ...bioOr,
    ...locationOr,
    { bio: regex },
    { location: regex },
    { $and: [{ categories: { $in: plan.categoryRegexes } }, NOT_SPAM_TAGGED] },
  ];
  if (noSpacesRegex) {
    nameOr.push({ username: noSpacesRegex });
    nameOr.push({ name: noSpacesRegex });
  }
  if (wordRegexes.length > 0) {
    nameOr.push({ $and: wordRegexes.map((r) => ({ name: r })) });
    nameOr.push(...wordRegexes.map((r) => ({ name: r })));
    nameOr.push(...wordRegexes.map((r) => ({ username: r })));
    nameOr.push({ $and: wordRegexes.map((r) => ({ bio: r })) });
    nameOr.push({ $and: wordRegexes.map((r) => ({ location: r })) });
    for (const r of wordRegexes) {
      nameOr.push({ bio: r });
      nameOr.push({ location: r });
    }
  }
  for (const word of plan.words) {
    const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    nameOr.push({ bio: new RegExp(`#${esc}\\b`, 'i') });
  }
  return nameOr;
}

export function buildBrowseQualityMatch(orClauses: Record<string, unknown>[]) {
  return {
    avatar: buildR2AvatarMatch(),
    gender: 'female',
    categories: { $exists: true, $ne: [] },
    deleted: { $ne: true },
    ...whaleBrowseLikesFilter,
    $or: orClauses,
  };
}

export function buildInterestsCreatorMatch(slugs: string[]) {
  const clauses: Record<string, unknown>[] = [];
  for (const slug of slugs) {
    const plan = expandSearchQuery(slug.replace(/-/g, ' '));
    if (!plan) continue;
    clauses.push(...buildSearchOrClauses(plan));
  }
  if (!clauses.length) return null;
  return buildBrowseQualityMatch(clauses);
}

export function buildSearchTierStage(plan: SearchPlan) {
  return {
    $addFields: {
      _searchTier: {
        $let: {
          vars: {
            cats: { $ifNull: ['$categories', []] },
            nameHit: {
              $or: [
                { $regexMatch: { input: { $ifNull: ['$name', ''] }, regex: plan.escaped, options: 'i' } },
                { $regexMatch: { input: { $ifNull: ['$username', ''] }, regex: plan.escaped, options: 'i' } },
              ],
            },
            bioHit: {
              $or: [
                { $regexMatch: { input: { $ifNull: ['$bio', ''] }, regex: plan.escaped, options: 'i' } },
                { $regexMatch: { input: { $ifNull: ['$location', ''] }, regex: plan.escaped, options: 'i' } },
              ],
            },
          },
          in: {
            $cond: [
              {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: '$$cats',
                        as: 'c',
                        cond: { $in: [{ $toLower: '$$c' }, plan.slugTerms] },
                      },
                    },
                  },
                  0,
                ],
              },
              3,
              { $cond: [{ $or: ['$$nameHit', '$$bioHit'] }, 2, 1] },
            ],
          },
        },
      },
    },
  };
}

export function isKnownSearchQuery(plan: SearchPlan): boolean {
  return SEARCH_KNOWN_TERMS.has(plan.normalized) ||
    (plan.words.length > 1 && plan.words.every((w) => SEARCH_KNOWN_TERMS.has(w)));
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededShuffle<T>(arr: T[], seed: string): T[] {
  const out = [...arr];
  let state = hashSeed(seed);
  const rand = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function rotateSearchResults<T extends { _searchTier?: number }>(
  rows: T[],
  query: string,
  skip: number,
  limit: number,
  seedSuffix = '',
): T[] {
  const daySeed = new Date().toISOString().slice(0, 10);
  const byTier = new Map<number, T[]>();
  for (const row of rows) {
    const tier = row._searchTier || 1;
    const bucket = byTier.get(tier) || [];
    bucket.push(row);
    byTier.set(tier, bucket);
  }
  const rotated = [3, 2, 1].flatMap((tier) =>
    seededShuffle(byTier.get(tier) || [], `${query}:${daySeed}:${seedSuffix}:${tier}`),
  );
  return rotated.slice(skip, skip + limit);
}

export function rotateFeedResults<T>(rows: T[], seed: string, limit: number): T[] {
  return seededShuffle(rows, seed).slice(0, limit);
}

function normInterestToken(s: string) {
  return s.toLowerCase().trim();
}

/** True when a creator's category list matches a saved interest slug. */
export function creatorMatchesInterestSlug(categories: string[], slug: string): boolean {
  const cats = (categories || []).map(normInterestToken).filter(Boolean);
  if (!cats.length) return false;

  const slugNorm = normInterestToken(slug);
  if (cats.includes(slugNorm) || cats.includes(slugNorm.replace(/-/g, ' '))) return true;

  const def = getTagDefinition(slug);
  if (!def) return false;

  const labels = new Set(def.groupLabels.map(normInterestToken));
  return cats.some((c) => labels.has(c));
}

/** Pick which saved interest slug best labels this creator (not always the first saved). */
export function pickInterestSlugForCreator(categories: string[], userSlugs: string[]): string {
  for (const slug of userSlugs) {
    if (creatorMatchesInterestSlug(categories, slug)) return slug;
  }
  return userSlugs[0] || '';
}
