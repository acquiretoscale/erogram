// OnlyFans Search — categories, countries, and URL helpers
// URL patterns:
//   Category:          /{cat}onlyfans          → /blondeonlyfans
//   Country:           /onlyfans{country}      → /onlyfansfrance
//   Country+Category:  /onlyfans{country}/{cat}onlyfans → /onlyfansfrance/blondeonlyfans

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
] as const;

export const OF_COUNTRIES = [
  { name: 'France', slug: 'france', flag: '🇫🇷' },
  { name: 'Germany', slug: 'germany', flag: '🇩🇪' },
  { name: 'Spain', slug: 'spain', flag: '🇪🇸' },
  { name: 'Italy', slug: 'italy', flag: '🇮🇹' },
  { name: 'UK', slug: 'uk', flag: '🇬🇧' },
  { name: 'USA', slug: 'usa', flag: '🇺🇸' },
  { name: 'Brazil', slug: 'brazil', flag: '🇧🇷' },
  { name: 'Colombia', slug: 'colombia', flag: '🇨🇴' },
  { name: 'Mexico', slug: 'mexico', flag: '🇲🇽' },
  { name: 'Argentina', slug: 'argentina', flag: '🇦🇷' },
  { name: 'Japan', slug: 'japan', flag: '🇯🇵' },
  { name: 'Philippines', slug: 'philippines', flag: '🇵🇭' },
  { name: 'Australia', slug: 'australia', flag: '🇦🇺' },
  { name: 'Canada', slug: 'canada', flag: '🇨🇦' },
  { name: 'Russia', slug: 'russia', flag: '🇷🇺' },
  { name: 'Ukraine', slug: 'ukraine', flag: '🇺🇦' },
  { name: 'Poland', slug: 'poland', flag: '🇵🇱' },
  { name: 'Romania', slug: 'romania', flag: '🇷🇴' },
  { name: 'Czech Republic', slug: 'czech', flag: '🇨🇿' },
  { name: 'Netherlands', slug: 'netherlands', flag: '🇳🇱' },
] as const;

export const OF_CATEGORY_SLUGS: Set<string> = new Set(OF_CATEGORIES.map((c) => c.slug));
export const OF_COUNTRY_SLUGS: Set<string> = new Set(OF_COUNTRIES.map((c) => c.slug));

// Slug lookup maps
export const OF_CATEGORY_MAP: Map<string, (typeof OF_CATEGORIES)[number]> = new Map(OF_CATEGORIES.map((c) => [c.slug, c]));
export const OF_COUNTRY_MAP: Map<string, (typeof OF_COUNTRIES)[number]> = new Map(OF_COUNTRIES.map((c) => [c.slug, c]));

/** Build the public SEO URL for a category page: /blondeonlyfans */
export function ofCategoryUrl(catSlug: string) {
  return `/${catSlug}onlyfans`;
}

/** Build the public SEO URL for a country page: /onlyfansfrance */
export function ofCountryUrl(countrySlug: string) {
  return `/onlyfans${countrySlug}`;
}

/** Build the public SEO URL for country+category: /onlyfansfrance/blondeonlyfans */
export function ofCountryCategoryUrl(countrySlug: string, catSlug: string) {
  return `/onlyfans${countrySlug}/${catSlug}onlyfans`;
}
