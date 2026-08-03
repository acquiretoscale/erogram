import { OF_CATEGORY_MAP, OF_CATEGORY_SLUGS } from '@/app/onlyfanssearch/constants';
import { extractVisibleBioHashtagSlugs } from '@/lib/tags/bioHashtags';
import { getMatchingKeywordOfCategories, type RankingMatchFields } from '@/lib/tags/creatorMatch';
import { getTagDefinition } from '@/lib/tags/registry';

/** Creator category slug → tag page slug when they differ. */
const CATEGORY_TO_TAG_SLUG: Record<string, string> = {
  colombian: 'colombia',
  brazilian: 'brazil',
  mexican: 'mexico',
  british: 'uk',
  american: 'usa',
  booty: 'big-booty',
  boobs: 'big-boobs',
  busty: 'big-boobs',
  tits: 'big-boobs',
  'big-tits': 'big-boobs',
  ass: 'big-ass',
  butt: 'big-ass',
  bigass: 'big-ass',
  bigboobs: 'big-boobs',
  bigtits: 'big-boobs',
  bittits: 'big-boobs',
  titties: 'titties',
  footfetish: 'foot-fetish',
  gothgirl: 'goth',
  cosplaygirl: 'cosplay',
  colombiana: 'colombian',
  gamergirl: 'gamer-girl',
  camgirl: 'cam-girl',
  gym: 'gym',
};

/** Tag-page slug → OnlyFans browse slug (only when OF category exists). */
const TAG_SLUG_TO_OF_CATEGORY: Record<string, string> = {};
for (const [ofSlug, tagSlug] of Object.entries(CATEGORY_TO_TAG_SLUG)) {
  if (OF_CATEGORY_SLUGS.has(ofSlug)) {
    TAG_SLUG_TO_OF_CATEGORY[tagSlug] = ofSlug;
  }
}

/** Profile pill dedupe — same niche, one pill (e.g. morocco + moroccan → moroccan). */
const PROFILE_CATEGORY_CANON: Record<string, string> = {
  morocco: 'moroccan',
  colombia: 'colombian',
  brazil: 'brazilian',
  japan: 'japanese',
  argentina: 'argentinian',
  canada: 'canadian',
  usa: 'american',
  uk: 'british',
  mexico: 'mexican',
  italy: 'italian',
  spain: 'spanish',
  france: 'french',
  thailand: 'thai',
  turkey: 'turkish',
  ukraine: 'ukrainian',
  'puerto-rico': 'puerto-rican',
  germany: 'german',
  greece: 'greek',
  australia: 'australian',
  taiwan: 'taiwanese',
};

/** Prefer real OF category slug; otherwise keep tag / ranking slug for /onlyfanssearch/{slug}. */
function toBrowseSlug(raw: string): string {
  const norm = normalizeSlug(raw);
  if (OF_CATEGORY_SLUGS.has(norm)) return norm;
  const mapped = TAG_SLUG_TO_OF_CATEGORY[norm];
  if (mapped && OF_CATEGORY_SLUGS.has(mapped)) return mapped;
  return norm;
}

const LOCATION_TO_TAG: [RegExp, string][] = [
  [/colombia|colombian/i, 'colombia'],
  [/brazil|brazilian|brasil/i, 'brazil'],
  [/mexico|mexican/i, 'mexico'],
  [/argentina|argentinian/i, 'argentina'],
  [/uk\b|british|united kingdom/i, 'uk'],
  [/usa\b|american|united states/i, 'usa'],
  [/germany|german/i, 'germany'],
  [/france|french/i, 'france'],
  [/spain|spanish/i, 'spain'],
  [/italy|italian/i, 'italy'],
  [/japan|japanese/i, 'japan'],
  [/india|indian/i, 'india'],
  [/ukraine|ukrainian/i, 'ukraine'],
];

function normalizeSlug(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, '-');
}

function humanizeSlug(slug: string): string {
  return slug.replace(/-/g, ' ');
}

export function getCreatorProfileTags(
  categories: string[],
  location = '',
  bio = '',
): { slug: string; label: string }[] {
  const seen = new Set<string>();
  const out: { slug: string; label: string }[] = [];

  const push = (raw: string) => {
    const norm = normalizeSlug(raw);
    const slug = CATEGORY_TO_TAG_SLUG[norm] || norm;
    if (seen.has(slug)) return;
    seen.add(slug);
    const def = getTagDefinition(slug);
    out.push({ slug, label: def?.label ?? humanizeSlug(slug) });
  };

  for (const cat of categories) {
    if (cat) push(cat);
  }

  for (const tag of extractVisibleBioHashtagSlugs(bio)) {
    push(tag);
  }

  const loc = location.trim();
  if (loc) {
    for (const [re, slug] of LOCATION_TO_TAG) {
      if (re.test(loc)) push(slug);
    }
  }

  return out;
}

/** Profile + browse categories: DB tags, bio hashtags, ranking matches, bio keyword scan. */
export function getCreatorProfileCategories(
  categories: string[],
  location = '',
  bio = '',
  rankingEntries: { slug: string; label: string }[] = [],
  creatorFields?: RankingMatchFields,
): { slug: string; label: string }[] {
  const seen = new Set<string>();
  const out: { slug: string; label: string }[] = [];

  const push = (raw: string, labelHint?: string) => {
    let browseSlug = toBrowseSlug(raw);
    browseSlug = PROFILE_CATEGORY_CANON[browseSlug] || browseSlug;
    if (seen.has(browseSlug)) return;
    seen.add(browseSlug);
    const meta = OF_CATEGORY_MAP.get(browseSlug);
    const def = getTagDefinition(browseSlug) || getTagDefinition(normalizeSlug(raw));
    out.push({
      slug: browseSlug,
      label: labelHint || meta?.name || def?.label || humanizeSlug(browseSlug),
    });
  };

  for (const tag of getCreatorProfileTags(categories, location, bio)) {
    push(tag.slug, tag.label);
  }

  for (const rp of rankingEntries) {
    push(rp.slug, rp.label);
  }

  if (creatorFields) {
    for (const km of getMatchingKeywordOfCategories(creatorFields)) {
      push(km.slug, km.label);
    }
  }

  return out;
}

/** Same category pills as creator profile (DB tags + bio hashtags + location + keyword scan). */
export function getCreatorFeedCategories(creator: RankingMatchFields): { slug: string; label: string }[] {
  return getCreatorProfileCategories(
    creator.categories || [],
    creator.location || '',
    creator.bio || '',
    [],
    creator,
  );
}
