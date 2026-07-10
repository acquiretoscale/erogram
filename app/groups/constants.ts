// ---------------------------------------------------------------------------
// Unified category list. Countries are now categories too.
// Used in browse-filter dropdowns, add-group multi-select, etc.
// ---------------------------------------------------------------------------

export const filterCategories = [
    // --- Core niches ---
    'AI NSFW', 'Amateur', 'Anal', 'Anime',
    'ASMR Erotic', 'Asian',
    'BDSM', 'BBW', 'Big Ass', 'Big Tits', 'Black', 'Blonde', 'Blowjob', 'Bukkake',
    'Brazil', 'China', 'Chinese AV', 'Colombia', 'Cosplay', 'Creampie', 'Cuckold',
    'Dating & Hookup', 'Deepthroat', 'Discord', 'Doujin & Manga',
    'Ebony',
    'Fantasy', 'Fansly', 'Feet', 'Femdom', 'Fetish', 'France', 'Free-use', 'Furry',
    'Gangbang', 'Germany', 'GIFs & Clips', 'Glory Hole', 'Goth & Alt',
    'Hardcore', 'Hentai', '3D Hentai',
    'India', 'Instagram Models', 'Interracial', 'Italy',
    'Japan', 'JAV',
    'Latina', 'Lesbian', 'Live Cam',
    'Masturbation', 'MILF',
    'NSFW-Telegram', 'Nylon & Pantyhose',
    'Onlyfans', 'Onlyfans Leaks',
    'Patreon', 'Petite', 'Pornhub', 'POV', 'Privacy', 'Public',
    'Reddit', 'Roleplay', 'Russian',
    'Snapchat', 'Spain',
    'Taboo', 'Teen 18+', 'Telegram-Porn', 'Threesome', 'TikTok',
    'UK', 'Ukraine', 'Uncensored AV', 'USA',
    '4K & HD',
    'Adult Games',
    'Celebrity',
];

export const filterOptions: Array<{ label: string; value: string }> =
    filterCategories.map((c) => ({ label: c, value: c }));

// ---------------------------------------------------------------------------
// Full list — kept for SEO backward-compatibility.
// generateStaticParams / sitemap / best-telegram-groups routes use these
// so that every previously-indexed URL still resolves (no 404s).
// ---------------------------------------------------------------------------

export const allCategories = [
    'All', 'Adult', 'Adult Chat', 'Adult Games', 'AI NSFW', 'Amateur', 'Anal', 'Anime', 'Argentina',
    'ASMR Erotic', 'Asia', 'Asian',
    'BDSM', 'BDSM Lite', 'BBW', 'Big Ass', 'Big Tits', 'Black', 'Blonde', 'Blowjob', 'Brazil',
    'Brunette', 'Bukkake',
    'Celebrity', 'Celebrity Lookalike', 'China', 'Chinese AV', 'Colombia', 'Cosplay', 'Costume',
    'Creampie', 'Cuckold',
    'Dating & Hookup', 'Deepthroat', 'Discord', 'Domination', 'Doujin & Manga', 'Double Penetration',
    'Ebony', 'Erotic Horror',
    'Fansly', 'Fantasy', 'Feet', 'Femdom', 'Fetish', 'France', 'Free-use', 'Furry',
    'Gangbang', 'Gay', 'Germany', 'GIFs & Clips', 'Glasses', 'Glory Hole', 'Goth & Alt', 'Group',
    'Hair Play', 'Hardcore', 'Hentai', '3D Hentai', 'India', 'Instagram Models', 'Interracial', 'Italy',
    'Japan', 'JAV',
    'Latex', 'Latina', 'Leaked', 'Lesbian', 'Lesbian Tribbing', 'LGBTQ+', 'Live Cam',
    'Masturbation', 'Mature', 'Medical', 'Mexico', 'MILF', 'Mind Control',
    'NSFW-Telegram', 'Nylon & Pantyhose',
    'Office', 'Onlyfans', 'Onlyfans Leaks', 'Oral', 'Outdoor',
    'Patreon', 'Pet Play', 'Petite', 'Philippines', 'Porn-Telegram', 'Pornhub', 'POV', 'Privacy', 'Public',
    'Red Hair', 'Reddit', 'Roleplay', 'Romantic', 'Russian',
    'SFW', 'Snapchat', 'Spain', 'Spanking', 'Squirting', 'Steampunk', 'Submission',
    'Taboo', 'Tease & Denial', 'Teen 18+', 'Telegram-Porn', 'Threesome', 'Tickling', 'TikTok', 'Trans',
    'UK', 'Ukraine', 'Uncensored AV', 'Uniforms', 'USA',
    'Vietnam', 'Vintage', 'Voyeur',
    '4K & HD',
];

// Legacy country list — kept ONLY for SEO backward-compat of /country/[slug] routes.
export const allCountries = [
    'All', 'Adult-Telegram', 'USA', 'UK', 'Germany', 'France', 'Brazil', 'Russia', 'Japan',
    'South Korea', 'Philippines', 'Thailand', 'Spain', 'Mexico', 'Canada',
    'Australia', 'Italy', 'Netherlands', 'Czech Republic', 'China', 'Argentina',
    'South Africa', 'Nigeria', 'Turkey', 'Indonesia', 'Pakistan', 'Bangladesh',
    'Vietnam', 'Malaysia', 'Singapore', 'New Zealand', 'Sweden', 'Norway', 'Denmark',
    'Finland', 'Poland', 'Ukraine', 'Egypt', 'Saudi Arabia', 'United Arab Emirates',
    'Israel', 'Iran', 'Iraq', 'Algeria', 'Morocco', 'Ethiopia', 'Kenya', 'Ghana',
    'Colombia', 'Chile', 'Peru', 'Venezuela', 'Ecuador', 'Bolivia', 'Paraguay',
    'Uruguay', 'Costa Rica', 'Panama', 'Dominican Republic', 'Cuba', 'Portugal',
    'Belgium', 'Switzerland', 'Austria', 'Greece', 'Ireland', 'Hungary', 'Romania',
    'Bulgaria', 'Croatia', 'Serbia', 'Slovakia', 'Slovenia', 'Lithuania', 'Latvia',
    'Estonia', 'Iceland', 'Luxembourg', 'Malta', 'Cyprus', 'Qatar', 'Kuwait',
    'Oman', 'Bahrain', 'Jordan', 'Lebanon', 'Syria', 'Yemen', 'Afghanistan',
    'Sri Lanka', 'Nepal', 'Bhutan', 'Maldives', 'Myanmar', 'Cambodia', 'Laos',
    'Mongolia', 'Taiwan', 'Hong Kong', 'Macau', 'Kazakhstan',
];

// Categories hidden from all public UI surfaces but kept in allCategories
// so that generateStaticParams / sitemap / direct-URL access still work (SEO safe).
export const HIDDEN_CATEGORIES = new Set(['Gay', 'Trans', 'LGBTQ+']);

export const visibleCategories = allCategories.filter(c => !HIDDEN_CATEGORIES.has(c));

// Backward-compat aliases — DO NOT filter these; they feed generateStaticParams & sitemap
export const categories = allCategories;
export const countries = allCountries;
export const filterCountries = allCountries;

/**
 * Canonical URL slug for a category on /best-telegram-groups/[category].
 * Spaces + "&" → hyphens (e.g. "AI NSFW" → "ai-nsfw", "Goth & Alt" → "goth-alt").
 * This is the ONE source of truth — all links + sitemap MUST use this so Google
 * only ever sees the hyphenated form. Old %20/space URLs 301 to this in middleware.
 */
export function categorySlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Resolve a URL slug (hyphenated OR legacy space form) back to the real category name. */
export function categoryFromSlug(slug: string): string | undefined {
  const decoded = decodeURIComponent(slug).toLowerCase();
  return categories.find(
    (c) => c.toLowerCase() === decoded || categorySlug(c) === decoded,
  );
}

/** Groups feed: unified batch size on /groups and each /groups/page/N (mobile + desktop). */
export const GROUPS_FEED_PAGE_SIZE = 32;
/** Minimum listings a category needs to appear in the "Trending Group Categories" row. */
export const TRENDING_CATEGORY_MIN_COUNT = 20;
