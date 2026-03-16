// ---------------------------------------------------------------------------
// Unified category list. Countries are now categories too.
// Used in browse-filter dropdowns, add-group multi-select, etc.
// ---------------------------------------------------------------------------

export const filterCategories = [
    'AI NSFW', 'Amateur', 'Anal', 'Anime', 'Argentina',
    'Asian', 'BDSM', 'Big Ass', 'Big Tits', 'Black', 'Blonde', 'Blowjob',
    'Brazil', 'Brunette', 'China', 'Colombia', 'Cosplay', 'Creampie',
    'Cuckold', 'Ebony', 'Fantasy', 'Feet', 'Fetish', 'France', 'Free-use',
    'Germany', 'Hardcore', 'Italy',
    'Japan', 'Latina', 'Lesbian', 'Masturbation', 'Mexico', 'MILF',
    'NSFW-Telegram', 'Onlyfans', 'Onlyfans Leaks', 'Petite', 'Philippines', 'Privacy', 'Public', 'Red Hair', 'Russian',
    'Spain', 'Telegram-Porn', 'Threesome', 'UK', 'Ukraine', 'USA', 'Vietnam',
];

export const filterOptions: Array<{ label: string; value: string }> =
    filterCategories.map((c) => ({ label: c, value: c }));

// ---------------------------------------------------------------------------
// Full list — kept for SEO backward-compatibility.
// generateStaticParams / sitemap / best-telegram-groups routes use these
// so that every previously-indexed URL still resolves (no 404s).
// ---------------------------------------------------------------------------

export const allCategories = [
    'All', 'Adult', 'Adult Chat', 'AI NSFW', 'Amateur', 'Anal', 'Anime', 'Argentina',
    'Asia', 'Asian', 'BDSM', 'BDSM Lite', 'Big Ass', 'Big Tits', 'Black', 'Blonde', 'Blowjob',
    'Brazil', 'Brunette', 'Celebrity Lookalike', 'China', 'Colombia',
    'Cosplay', 'Costume', 'Creampie', 'Cuckold',
    'Domination', 'Double Penetration', 'Ebony', 'Erotic Horror',
    'Fantasy', 'Feet', 'Fetish', 'France', 'Free-use', 'Furry', 'Gangbang', 'Gay',
    'Germany', 'Glasses', 'Group',
    'Hair Play', 'Hardcore', 'Hentai', 'Interracial', 'Italy',
    'Japan', 'Latex', 'Latina', 'Leaked', 'Lesbian', 'Lesbian Tribbing', 'LGBTQ+',
    'Masturbation', 'Mature', 'Medical', 'Mexico', 'MILF', 'Mind Control',
    'NSFW-Telegram', 'Office', 'Onlyfans', 'Onlyfans Leaks', 'Oral', 'Outdoor',
    'Pet Play', 'Petite', 'Philippines', 'Porn-Telegram', 'POV', 'Privacy', 'Public',
    'Red Hair', 'Roleplay', 'Romantic', 'Russian',
    'SFW', 'Spain', 'Spanking', 'Squirting', 'Steampunk', 'Submission',
    'Taboo', 'Tease & Denial', 'Telegram-Porn', 'Threesome', 'Tickling', 'Trans',
    'UK', 'Ukraine', 'Uniforms', 'USA', 'Vietnam', 'Vintage', 'Voyeur',
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

// Backward-compat aliases
export const categories = allCategories;
export const countries = allCountries;
export const filterCountries = allCountries;
