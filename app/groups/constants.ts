// ---------------------------------------------------------------------------
// Flat merged filter options (categories + countries in one alphabetical list).
// Used in the browse-filter dropdown on the groups page.
// Each entry carries an internal prefix so the API knows which field to query.
// ---------------------------------------------------------------------------

export const filterOptions: Array<{ label: string; value: string }> = [
    { label: 'Adult', value: 'cat:Adult' },
    { label: 'Adult Chat', value: 'cat:Adult Chat' },
    { label: 'AI NSFW', value: 'cat:AI NSFW' },
    { label: 'Amateur', value: 'cat:Amateur' },
    { label: 'Anal', value: 'cat:Anal' },
    { label: 'Anime', value: 'cat:Anime' },
    { label: 'Asian', value: 'cat:Asian' },
    { label: 'BDSM', value: 'cat:BDSM' },
    { label: 'Big Ass', value: 'cat:Big Ass' },
    { label: 'Big Tits', value: 'cat:Big Tits' },
    { label: 'Blowjob', value: 'cat:Blowjob' },
    { label: 'Brasil', value: 'country:Brazil' },
    { label: 'China', value: 'country:China' },
    { label: 'Colombia', value: 'country:Colombia' },
    { label: 'Cosplay', value: 'cat:Cosplay' },
    { label: 'Creampie', value: 'cat:Creampie' },
    { label: 'Cuckold', value: 'cat:Cuckold' },
    { label: 'Ebony', value: 'cat:Ebony' },
    { label: 'Fantasy', value: 'cat:Fantasy' },
    { label: 'Feet', value: 'cat:Feet' },
    { label: 'Fetish', value: 'cat:Fetish' },
    { label: 'Germany', value: 'country:Germany' },
    { label: 'Hardcore', value: 'cat:Hardcore' },
    { label: 'Hentai', value: 'cat:Hentai' },
    { label: 'Japan', value: 'country:Japan' },
    { label: 'Latina', value: 'cat:Latina' },
    { label: 'Lesbian', value: 'cat:Lesbian' },
    { label: 'Masturbation', value: 'cat:Masturbation' },
    { label: 'MILF', value: 'cat:MILF' },
    { label: 'Onlyfans', value: 'cat:Onlyfans' },
    { label: 'Telegram-Porn', value: 'cat:Telegram-Porn' },
    { label: 'Privacy', value: 'cat:Privacy' },
    { label: 'Public', value: 'cat:Public' },
    { label: 'Russian', value: 'cat:Russian' },
    { label: 'Spain', value: 'country:Spain' },
    { label: 'Threesome', value: 'cat:Threesome' },
    { label: 'Trans', value: 'cat:Trans' },
    { label: 'UK', value: 'country:UK' },
    { label: 'USA', value: 'country:USA' },
];

// ---------------------------------------------------------------------------
// Separate lists for the AddGroupModal (which still needs two dropdowns:
// one for category and one for country).
// ---------------------------------------------------------------------------

export const filterCategories = [
    'All', 'Adult', 'Adult Chat', 'AI NSFW', 'Amateur', 'Anal', 'Anime',
    'Asian', 'BDSM', 'Big Ass', 'Big Tits', 'Blowjob', 'Cosplay',
    'Creampie', 'Cuckold', 'Ebony', 'Fantasy', 'Feet', 'Fetish',
    'Hardcore', 'Hentai', 'Latina', 'Lesbian', 'Masturbation', 'MILF',
    'Onlyfans', 'Privacy', 'Public', 'Russian', 'Telegram-Porn', 'Threesome', 'Trans',
];

export const filterCountries = [
    'All', 'USA', 'UK', 'Russia', 'Spain', 'Japan',
    'Germany', 'Brazil', 'China', 'Colombia',
];

// ---------------------------------------------------------------------------
// Full arrays – kept for SEO backward-compatibility.
// generateStaticParams / sitemap / best-telegram-groups routes use these
// so that every previously-indexed URL still resolves (no 404s).
// ---------------------------------------------------------------------------

export const allCategories = [
    'All', 'Adult', 'Adult Chat', 'AI NSFW', 'Amateur', 'Anal', 'Anime',
    'Asia', 'Asian', 'BDSM', 'BDSM Lite', 'Big Ass', 'Big Tits', 'Blowjob',
    'Celebrity Lookalike', 'Cosplay', 'Costume', 'Creampie', 'Cuckold',
    'Domination', 'Double Penetration', 'Ebony', 'Erotic Horror',
    'Fantasy', 'Feet', 'Fetish', 'Furry', 'Gangbang', 'Gay', 'Glasses',
    'Group', 'Hair Play', 'Hardcore', 'Hentai', 'Interracial',
    'Latex', 'Latina', 'Leaked', 'Lesbian', 'Lesbian Tribbing', 'LGBTQ+',
    'Masturbation', 'Mature', 'Medical', 'MILF', 'Mind Control',
    'Office', 'Onlyfans', 'Oral', 'Outdoor',
    'Pet Play', 'Porn-Telegram', 'POV', 'Privacy', 'Public', 'Telegram-Porn',
    'Roleplay', 'Romantic', 'Russian',
    'SFW', 'Spanking', 'Squirting', 'Steampunk', 'Submission',
    'Taboo', 'Tease & Denial', 'Threesome', 'Tickling', 'Trans',
    'Uniforms', 'Vintage', 'Voyeur',
];

export const allCountries = [
    'All', 'USA', 'UK', 'Germany', 'France', 'Brazil', 'Russia', 'Japan',
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

// Backward-compat aliases used by many existing imports
export const categories = allCategories;
export const countries = allCountries;
