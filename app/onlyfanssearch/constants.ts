import { OF_KEYWORD_CATEGORIES } from '@/lib/onlyfanssearch/keywordCategories';
import { buildBioHashtagCategoryRows } from '@/lib/tags/bioHashtagCategories';

// OnlyFans Search — categories and URL helpers
// URL pattern: /{cat}onlyfans → /blondeonlyfans
//
// COUNTRIES DO NOT EXIST on Erogram. When a "country" is added (e.g. France),
// it must be added as a CATEGORY — same as Brunette, Asian, etc.
// The owner will add them later as categories. Do NOT re-introduce OF_COUNTRIES.

const OF_CORE_CATEGORIES = [
  { name: 'Asian', emoji: '🌸', slug: 'asian' },
  { name: 'Blonde', emoji: '👱‍♀️', slug: 'blonde' },
  { name: 'Teen', emoji: '🔥', slug: 'teen' },
  { name: 'MILF', emoji: '💋', slug: 'milf' },
  { name: 'Amateur', emoji: '📸', slug: 'amateur' },
  { name: 'Redhead', emoji: '🧡', slug: 'redhead' },
  { name: 'Goth', emoji: '🖤', slug: 'goth' },
  { name: 'Petite', emoji: '✨', slug: 'petite' },
  { name: 'Big Ass', emoji: '🍑', slug: 'big-ass' },
  { name: 'Big Boobs', emoji: '💋', slug: 'big-boobs' },
  { name: 'Brunette', emoji: '💇‍♀️', slug: 'brunette' },
  { name: 'Latina', emoji: '🌶️', slug: 'latina' },
  { name: 'Ahegao', emoji: '😜', slug: 'ahegao' },
  { name: 'Alt', emoji: '🦇', slug: 'alt' },
  { name: 'Cosplay', emoji: '🎭', slug: 'cosplay' },
  { name: 'Streamer', emoji: '🎮', slug: 'streamer' },
  { name: 'Fitness', emoji: '💪', slug: 'fitness' },
  { name: 'JOI', emoji: '🔊', slug: 'joi' },
  { name: 'Lesbian', emoji: '🌈', slug: 'lesbian' },
  { name: 'Tattoo', emoji: '🖊️', slug: 'tattoo' },
  { name: 'Curvy', emoji: '⌛', slug: 'curvy' },
  { name: 'Ebony', emoji: '👑', slug: 'ebony' },
  { name: 'Feet', emoji: '🦶', slug: 'feet' },
  { name: 'Lingerie', emoji: '👙', slug: 'lingerie' },
  { name: 'Thick', emoji: '🍑', slug: 'thick' },
  { name: 'Twerk', emoji: '💃', slug: 'twerk' },
  { name: 'Squirt', emoji: '💦', slug: 'squirt' },
  { name: 'Piercing', emoji: '💎', slug: 'piercing' },
  { name: 'BBW', emoji: '💗', slug: 'bbw' },
  { name: 'BDSM', emoji: '⛓️', slug: 'bdsm' },
  { name: 'Pornstar', emoji: '⭐', slug: 'pornstar' },
  { name: 'Couple', emoji: '👫', slug: 'couple' },
  { name: 'Nurse', emoji: '🏥', slug: 'nurse' },
  { name: 'Arab', emoji: '🌙', slug: 'arab' },
  { name: 'Anal', emoji: '🔥', slug: 'anal' },
  { name: 'ASMR', emoji: '🎧', slug: 'asmr' },
  { name: 'Influencer', emoji: '📱', slug: 'influencer' },
  { name: 'Celebrity', emoji: '🌟', slug: 'celebrity' },
  { name: 'No PPV', emoji: '🆓', slug: 'no-ppv' },
  { name: 'Colombian', emoji: '🇨🇴', slug: 'colombian' },
  { name: 'Findom', emoji: '💸', slug: 'findom' },
  { name: 'British', emoji: '🇬🇧', slug: 'british' },
  { name: 'Blowjob', emoji: '💋', slug: 'blowjob' },
  { name: 'Student', emoji: '📚', slug: 'student' },
  { name: 'Roleplay', emoji: '🎭', slug: 'roleplay' },
  { name: 'Submissive', emoji: '🙇', slug: 'submissive' },
  { name: 'Brazilian', emoji: '🇧🇷', slug: 'brazilian' },
  { name: 'Chubby', emoji: '💕', slug: 'chubby' },
  { name: 'Pregnant', emoji: '🤰', slug: 'pregnant' },
  { name: 'Mature', emoji: '🌹', slug: 'mature' },
  { name: 'Muscle', emoji: '💪', slug: 'muscle' },
  { name: 'Teacher', emoji: '📖', slug: 'teacher' },
  { name: 'Housewife', emoji: '🏠', slug: 'housewife' },
] as const;

/** Live /onlyfanssearch hub BOA rows — prod order (28 slugs, 26 with BOA pages). */
export const OF_SEARCH_HUB_CATEGORY_SLUGS = [
  'asian',
  'blonde',
  'teen',
  'milf',
  'amateur',
  'redhead',
  'goth',
  'petite',
  'big-ass',
  'big-boobs',
  'brunette',
  'latina',
  'ahegao',
  'alt',
  'cosplay',
  'streamer',
  'fitness',
  'joi',
  'lesbian',
  'tattoo',
  'curvy',
  'ebony',
  'feet',
  'lingerie',
  'thick',
  'twerk',
  'squirt',
  'piercing',
] as const;

function buildOfCategories(): { name: string; emoji: string; slug: string }[] {
  const seen = new Set<string>();
  const out: { name: string; emoji: string; slug: string }[] = [];
  for (const c of [...OF_CORE_CATEGORIES, ...OF_KEYWORD_CATEGORIES]) {
    if (seen.has(c.slug)) continue;
    seen.add(c.slug);
    out.push({ name: c.name, emoji: c.emoji, slug: c.slug });
  }
  for (const c of buildBioHashtagCategoryRows(seen)) {
    out.push(c);
  }
  return out;
}

export const OF_CATEGORIES = buildOfCategories();

export const OF_CATEGORY_SLUGS: Set<string> = new Set(OF_CATEGORIES.map((c) => c.slug));

export const OF_CATEGORY_MAP: Map<string, (typeof OF_CATEGORIES)[number]> = new Map(OF_CATEGORIES.map((c) => [c.slug, c]));

/** Build the public SEO URL for a category page: /blondeonlyfans */
export function ofCategoryUrl(catSlug: string) {
  return `/${catSlug}onlyfans`;
}
