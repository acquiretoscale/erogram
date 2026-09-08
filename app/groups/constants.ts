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
    'Boosty', 'Sensual', 'Soles', 'Webcam', 'Toes', 'Manhwa', 'Vampire',
    'Gamer Girl', 'JVid', 'Mixed Race', 'Bondage', 'DDLG', 'Twerk',
    'Lingerie', 'Yaoi', 'Yuri', 'Fisting', 'Streamer', 'Persian', 'SFM', 'MMD',
    'Cumshot', 'Granny', 'VIP Channel', 'Redhead', 'Ecchi', 'Submissive', 'Findom',
    'Chastity', 'Watersports', 'Futanari', 'Sissy', 'Exhibitionism', 'Handjob', '69',
    'Korea', 'Portugal', 'Turkey', 'Venezuela', 'Malaysia',
    'Onlyfans Russian', 'Latex', 'Argentina', 'Mexico', 'JOI',
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
    'Boosty', 'Sensual', 'Soles', 'Webcam', 'Toes', 'Manhwa', 'Vampire',
    'Gamer Girl', 'JVid', 'Mixed Race', 'Bondage', 'DDLG', 'Twerk',
    'Lingerie', 'Yaoi', 'Yuri', 'Fisting', 'Streamer', 'Persian', 'SFM', 'MMD',
    'Cumshot', 'Granny', 'VIP Channel', 'Redhead', 'Ecchi', 'Submissive', 'Findom',
    'Chastity', 'Watersports', 'Futanari', 'Sissy', 'Exhibitionism', 'Handjob', '69',
    'Korea', 'Portugal', 'Turkey', 'Venezuela', 'Malaysia',
    'Onlyfans Russian', 'JOI',
];

/** Vault pills hidden from the public row (kept in allCategories for SEO). */
export const vaultHiddenPills = [] as const;

/** Vault teaser pills (blurred unless premium). */
export const vaultTeaserPills = ['Threesome', 'Creampie', 'Fantasy', 'Hardcore', 'Cuckold', 'Free-use'] as const;

/** Vault pills shown after VIEW MORE, in listed order. */
export const vaultPillMore = [
    'Adult', 'Anal', 'Big Ass', 'Blonde', 'Big Tits', 'Doujin & Manga', 'Japan', 'Germany', 'Adult Games',
    'France', 'Hardcore', 'Pornhub', 'Ukraine', 'Cuckold', 'Ebony', 'Patreon',
    'Fansly', 'Live Cam', '3D Hentai', 'Masturbation', 'Public', 'Dating & Hookup',
    'Femdom', '4K & HD', 'Nylon & Pantyhose', 'UK', 'USA', 'Creampie', 'Fantasy', 'BBW',
    'Roleplay', 'Teen 18+', 'ASMR Erotic', 'Discord', 'GIFs & Clips', 'Snapchat',
    'Argentina', 'Celebrity', 'Chinese AV', 'Free-use', 'Furry', 'Taboo', 'Petite',
    'Threesome', 'Black', 'Deepthroat', 'Gangbang', 'Goth & Alt', 'JAV', 'POV',
    'Reddit', 'Glory Hole', 'Bukkake', '69', 'Bondage', 'Boosty', 'Chastity',
    'Cumshot', 'DDLG', 'Ecchi', 'Exhibitionism', 'Findom', 'Fisting', 'Futanari',
    'Gamer Girl', 'Granny', 'Handjob', 'JOI', 'JVid', 'Korea', 'Latex', 'Lingerie',
    'Malaysia', 'Manhwa', 'Mexico', 'Mixed Race', 'MMD', 'Persian', 'Portugal',
    'Redhead', 'Sensual', 'SFM', 'Sissy', 'Soles', 'Streamer', 'Submissive', 'Toes',
    'Turkey', 'Twerk', 'Vampire', 'Venezuela', 'VIP Channel', 'Watersports',
    'Telegram-Porn', 'Webcam', 'Yaoi', 'Yuri',
] as const;

/** Vault pills shown before VIEW MORE. */
export const vaultPillPrimary = [
    'Onlyfans', 'Russian', 'Onlyfans Russian', 'Hentai', 'Instagram Models',
    'Latina', 'Feet', 'BDSM', 'MILF', 'Fetish', 'Cosplay', 'NSFW-Telegram',
    'Onlyfans Leaks', 'TikTok', 'Anime', 'Asian', 'China', 'Blowjob', 'Lesbian',
    'Brazil', 'Amateur', 'Italy', 'Uncensored AV', 'Spain', 'AI NSFW', 'Colombia',
] as const;

/** Vault pill row, highest vault group count first. */
export const vaultPillOrder = [
    'Onlyfans', 'Russian', 'Onlyfans Russian', 'Instagram Models', 'Hentai', 'Feet',
    'Latina', 'MILF', 'BDSM', 'Fetish', 'TikTok', 'Onlyfans Leaks', 'Anime', 'Asian',
    'China', 'Cosplay', 'Italy', 'Spain', 'Blowjob', 'Adult Games', 'Doujin & Manga',
    'Germany', 'Uncensored AV', 'NSFW-Telegram', 'Amateur', 'Fansly', 'France',
    'Colombia', 'Lesbian', 'Patreon', 'Ukraine', 'Live Cam', 'Pornhub', '3D Hentai',
    'Cuckold', 'Brazil', 'Japan', 'Anal', 'Dating & Hookup', 'Nylon & Pantyhose',
    'Big Ass', 'Ebony', 'Femdom', 'ASMR Erotic', 'Discord', 'Snapchat', 'AI NSFW',
    'Furry', 'Public', 'Roleplay', 'Argentina', 'BBW', 'Celebrity', 'GIFs & Clips',
    'Chinese AV', 'Creampie', 'Masturbation', 'Reddit', 'Taboo', 'Free-use', 'Hardcore',
    'Petite', 'Threesome', 'UK', 'Fantasy', 'Glory Hole',
    '69', '4K & HD', 'Black', 'Bondage', 'Boosty', 'Bukkake', 'Chastity', 'Cumshot',
    'DDLG', 'Deepthroat', 'Ecchi', 'Exhibitionism', 'Findom', 'Fisting', 'Futanari',
    'Gamer Girl', 'Gangbang', 'Goth & Alt', 'Granny', 'Handjob', 'JAV', 'JOI', 'JVid',
    'Korea', 'Latex', 'Lingerie', 'Malaysia', 'Manhwa', 'Mexico', 'Mixed Race', 'MMD',
    'Persian', 'Portugal', 'POV', 'Redhead', 'Sensual', 'SFM', 'Sissy', 'Soles',
    'Streamer', 'Submissive', 'Teen 18+', 'Toes', 'Turkey', 'Twerk', 'Vampire',
    'Venezuela', 'VIP Channel', 'Watersports', 'Webcam', 'Yaoi', 'Yuri',
] as const;

/** Thin vault pills kept for aliases; main order is vaultPillOrder. */
export const vaultPillBottom = [] as const;

/** @deprecated use vaultPillOrder */
export const vaultNewCategoriesMiddle = vaultPillOrder;
/** @deprecated use vaultPillBottom */
export const vaultNewCategoriesBottom = vaultPillBottom;

/** Name/description match when groups are not tagged with the pill name yet. */
export const vaultNewCategoryRegex: Record<string, string> = {
    Boosty: 'boosty',
    Sensual: '\\bsensual\\b',
    Soles: '\\bsoles\\b|foot sole',
    Webcam: '\\bwebcam\\b|вебкам',
    Toes: '\\btoes\\b|toe fetish',
    Manhwa: '\\bmanhwa\\b|манхва',
    Vampire: '\\bvampire\\b|вампир',
    'Gamer Girl': 'gamer girl|girl gamer',
    JVid: '\\bjvid\\b',
    'Mixed Race': 'mixed race|eurasian|\\bhapa\\b',
    Bondage: '\\bbondage\\b|\\bshibari\\b|бондаж',
    DDLG: '\\bddlg\\b|age play|little space|\\babdl\\b',
    Twerk: 'twerk',
    Lingerie: '\\blingerie\\b|\\bunderwear\\b|бель',
    Yaoi: '\\byaoi\\b|яой',
    Yuri: '\\byuri\\b|юри',
    Fisting: '\\bfisting\\b',
    Streamer: '\\bstreamer\\b|twitch girl|стример',
    Persian: '\\bpersian\\b|\\birani\\b|иран',
    SFM: '\\bsfm\\b|source filmmaker',
    MMD: '\\bmmd\\b',
    Cumshot: '\\bcumshot\\b|cum shot',
    Granny: '\\bgranny\\b|\\bgilf\\b',
    'VIP Channel': 'vip channel|private channel|приват',
    Redhead: '\\bredhead\\b|\\bginger\\b|red hair',
    Ecchi: '\\becchi\\b|этчи',
    Submissive: '\\bsubmissive\\b|slave girl|рабын',
    Findom: '\\bfindom\\b|финдом',
    Chastity: '\\bchastity\\b',
    Watersports: 'watersport|golden shower|золотой дождь',
    Futanari: '\\bfuta\\b|\\bfutanari\\b|扶她',
    Sissy: '\\bsissy\\b',
    Exhibitionism: 'exhibition',
    Handjob: '\\bhandjob\\b|hand job',
    '69': '\\b69\\b',
    Korea: '\\bkorea\\b|\\bkorean\\b|한국|коре',
    Portugal: '\\bportugal\\b|\\bportuguese\\b|португал',
    Turkey: '\\bturkey\\b|\\bturkish\\b|турци',
    Venezuela: '\\bvenezuela\\b|\\bvenezuelan\\b',
    Malaysia: '\\bmalaysia\\b|\\bmalaysian\\b',
    'ASMR Erotic': '\\basmr\\b|асмр',
    Latex: '\\blatex\\b|латекс',
    TikTok: 'tiktok|tik tok|тикток',
    Argentina: 'argentina|argentin',
    Mexico: 'mexico|mexican|mexicana',
    Italy: 'italy|italian|italia',
    'Nylon & Pantyhose': 'nylon|pantyhose|stockings|чулк|丝袜',
    Femdom: 'femdom|dominatrix',
    Ebony: '\\bebony\\b',
    Snapchat: 'snapchat',
    Furry: '\\bfurry\\b',
    'AI NSFW': 'ai nsfw|ai porn|ai generated',
    Roleplay: 'roleplay|role play',
    'Dating & Hookup': 'dating|hookup',
    Celebrity: 'celebrity|celeb leak',
    'Chinese AV': 'chinese av|国产',
    BBW: '\\bbbw\\b',
    'GIFs & Clips': '\\bgif\\b',
    JOI: '\\bjoi\\b|jerk.?off.?instruct',
    Petite: '\\bpetite\\b',
    'Live Cam': 'live cam|webcam|вебкам',
    Discord: 'discord',
    Reddit: 'reddit',
};

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
export const GROUPS_FEED_PAGE_SIZE = 24;
/** Minimum listings a category needs to appear in the "Trending Group Categories" row. */
export const TRENDING_CATEGORY_MIN_COUNT = 20;
