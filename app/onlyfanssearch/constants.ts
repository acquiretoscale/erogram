// OnlyFans Search — categories and URL helpers
// URL pattern: /{cat}onlyfans → /blondeonlyfans
//
// COUNTRIES DO NOT EXIST on Erogram. When a "country" is added (e.g. France),
// it must be added as a CATEGORY — same as Brunette, Asian, etc.
// The owner will add them later as categories. Do NOT re-introduce OF_COUNTRIES.

export const OF_CATEGORIES = [
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
] as const;

export const OF_CATEGORY_SLUGS: Set<string> = new Set(OF_CATEGORIES.map((c) => c.slug));

export const OF_CATEGORY_MAP: Map<string, (typeof OF_CATEGORIES)[number]> = new Map(OF_CATEGORIES.map((c) => [c.slug, c]));

/** Build the public SEO URL for a category page: /blondeonlyfans */
export function ofCategoryUrl(catSlug: string) {
  return `/${catSlug}onlyfans`;
}
