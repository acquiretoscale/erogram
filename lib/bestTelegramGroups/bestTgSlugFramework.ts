/**
 * Native NSFW SEO slug framework for Best Telegram Groups ranking pages.
 */

export type BestTgSlugLocale = 'de' | 'es' | 'pt';

export const BEST_TG_SLUG_RANK_PREFIX = '10-';

export function withBestTgSlugRankPrefix(slug: string): string {
  const s = slug.trim();
  if (!s) return s;
  return s.startsWith(BEST_TG_SLUG_RANK_PREFIX) ? s : `${BEST_TG_SLUG_RANK_PREFIX}${s}`;
}

/** Owner-approved — never overwrite in batch runs. */
export const BEST_TG_SLUG_LOCKED: Record<string, Partial<Record<BestTgSlugLocale, string>>> = {
  'big-ass': {
    de: '10-beste-telegram-gruppen-grosser-arsch',
    es: '10-mejores-grupos-telegram-culos-grandes',
    pt: '10-melhores-grupos-telegram-rabudas',
  },
  'big-tits': {
    de: '10-beste-telegram-gruppen-grosse-titten',
    es: '10-mejores-grupos-telegram-tetonas',
    pt: '10-melhores-grupos-telegram-peitudas',
  },
  brazil: {
    de: '10-beste-brasilianische-telegram-gruppen',
    es: '10-mejores-grupos-telegram-brasil',
    pt: '10-melhores-grupos-telegram-brasileiras',
  },
  france: {
    de: '10-beste-franzoesische-telegram-gruppen',
    es: '10-mejores-grupos-telegram-francia',
    pt: '10-melhores-grupos-telegram-francesas',
  },
  germany: {
    de: '10-beste-deutsche-telegram-gruppen',
    es: '10-mejores-grupos-telegram-alemania',
    pt: '10-melhores-grupos-telegram-alemanha',
  },
  spain: {
    de: '10-beste-spanische-telegram-gruppen',
    es: '10-mejores-grupos-telegram-espana',
    pt: '10-melhores-grupos-telegram-espanha',
  },
  usa: {
    de: '10-beste-amerikanische-telegram-gruppen',
    es: '10-mejores-grupos-telegram-estados-unidos',
    pt: '10-melhores-grupos-telegram-americanas',
  },
  'dating-hookup': {
    de: '10-beste-telegram-gruppen-sexkontakte',
    es: '10-mejores-grupos-telegram-citas-y-encuentros',
    pt: '10-melhores-grupos-telegram-encontros-casuais',
  },
  deepthroat: {
    de: '10-beste-telegram-gruppen-tiefe-kehle',
    es: '10-mejores-grupos-telegram-garganta-profunda',
    pt: '10-melhores-grupos-telegram-garganta-profunda',
  },
  creampie: {
    de: '10-beste-telegram-gruppen-innenbesamung',
    es: '10-mejores-grupos-telegram-corridas-internas',
    pt: '10-melhores-grupos-telegram-gozada-interna',
  },
  cuckold: {
    de: '10-beste-telegram-gruppen-hahnrei',
    es: '10-mejores-grupos-telegram-cornudo',
    pt: '10-melhores-grupos-telegram-corno',
  },
  fantasy: {
    de: '10-beste-fantasie-telegram-gruppen',
    es: '10-mejores-grupos-telegram-fantasia',
    pt: '10-melhores-grupos-telegram-fantasia',
  },
  masturbation: {
    de: '10-beste-telegram-gruppen-selbstbefriedigung',
    es: '10-mejores-grupos-telegram-masturbacion',
    pt: '10-melhores-grupos-telegram-masturbacao',
  },
  taboo: {
    de: '10-beste-tabu-telegram-gruppen',
    es: '10-mejores-grupos-telegram-tabu',
    pt: '10-melhores-grupos-telegram-tabu',
  },
  'uncensored-av': {
    de: '10-beste-unzensiert-av-telegram-gruppen',
    es: '10-mejores-grupos-telegram-av-sin-censura',
    pt: '10-melhores-grupos-telegram-av-sem-censura',
  },
  blowjob: {
    de: '10-beste-telegram-gruppen-blasen',
    es: '10-mejores-grupos-telegram-mamadas',
    pt: '10-melhores-grupos-telegram-boquetes',
  },
  china: {
    de: '10-beste-chinesische-telegram-gruppen',
    es: '10-mejores-grupos-telegram-china',
    pt: '10-melhores-grupos-telegram-chinesas',
  },
  colombia: {
    de: '10-beste-kolumbianische-telegram-gruppen',
    es: '10-mejores-grupos-telegram-colombia',
    pt: '10-melhores-grupos-telegram-colombianas',
  },
  india: {
    de: '10-beste-indische-telegram-gruppen',
    es: '10-mejores-grupos-telegram-india',
    pt: '10-melhores-grupos-telegram-indianas',
  },
  japan: {
    de: '10-beste-japanische-telegram-gruppen',
    es: '10-mejores-grupos-telegram-japon',
    pt: '10-melhores-grupos-telegram-japonesas',
  },
  latina: {
    de: '10-beste-latina-telegram-gruppen',
    es: '10-mejores-grupos-telegram-latinas',
    pt: '10-melhores-grupos-telegram-latinas',
  },
  lesbian: {
    de: '10-beste-lesben-telegram-gruppen',
    es: '10-mejores-grupos-telegram-lesbianas',
    pt: '10-melhores-grupos-telegram-lesbicas',
  },
};

const BANNED =
  /\b(putas?|schlampen|schlampe|huren|hure|fotze|fotzen|bitch|perras?|zorras?|safadas?|vadias?|sluts?|whores?)\b/i;

/** English tokens that must NOT appear verbatim in localized slugs (countries/actions). */
const UNTRANSLATED_EN = new Set([
  'brazil', 'france', 'germany', 'spain', 'china', 'colombia', 'india', 'japan', 'usa',
  'dating', 'hookup', 'deepthroat', 'blowjob', 'celebrity', 'fantasy', 'hardcore', 'public',
  'taboo', 'russian', 'masturbation', 'threesome', 'creampie', 'cuckold', 'uncensored',
]);

export const BEST_TG_SLUG_FEW_SHOTS = Object.entries(BEST_TG_SLUG_LOCKED)
  .filter(([, locs]) => locs.de && locs.es && locs.pt)
  .slice(0, 14)
  .map(([slug, locs]) => ({
    en: slug,
    slug,
    de: locs.de!,
    es: locs.es!,
    pt: locs.pt!,
  }));

export function isBannedSlugToken(slug: string): boolean {
  return BANNED.test(slug);
}

export function hasUntranslatedEnglish(slug: string): boolean {
  const tokens = slug.toLowerCase().replace(/^10-/, '').split('-');
  return tokens.some((t) => UNTRANSLATED_EN.has(t));
}

export function buildBestTgSlugSystemPrompt(locale: BestTgSlugLocale): string {
  const localeRules: Record<BestTgSlugLocale, string> = {
    pt: `PORTUGUÊS (Brasil) — padrão:
10-melhores-grupos-telegram-{niche-nativo-brasileiro}

REGRAS OBRIGATÓRIAS:
- SEMPRE comece com "10-"
- Traduza TUDO para português brasileiro natural de busca adulta — NUNCA deixe inglês no slug
- Países: brazil→brasileiras/brasil, france→francesas, germany→alemanha, spain→espanha, usa→americanas, china→chinesas, japan→japonesas, colombia→colombianas, india→indianas
- Ações/nichos: dating→encontros-casuais, deepthroat→garganta-profunda, blowjob→boquetes, big-ass→rabudas, big-tits→peitudas
- Mantenha empréstimos só se brasileiros realmente buscam assim: onlyfans, bdsm, milf, pov, hentai, cosplay, anal
- ASCII, minúsculas, hífens, sem acentos
- NUNCA: putas, safadas, vadias, insultos`,

    es: `ESPAÑOL — patrón:
10-mejores-grupos-telegram-{niche-nativo}

REGLAS OBLIGATORIAS:
- SIEMPRE empieza con "10-"
- Traduce TODO al español natural de búsqueda adulta — NUNCA dejes inglés en el slug
- Países: brazil→brasil, france→francia, germany→alemania, spain→espana, usa→estados-unidos, china→china, japan→japon, colombia→colombia, india→india
- Acciones/nichos: dating→citas-y-encuentros, deepthroat→garganta-profunda, blowjob→mamadas, big-ass→culos-grandes, big-tits→tetonas
- Préstamos OK solo si LATAM busca así: onlyfans, bdsm, milf, pov, hentai, cosplay, anal
- ASCII, minúsculas, guiones, sin tildes en URL
- NUNCA: putas, zorras, perras, insultos`,

    de: `DEUTSCH — flexible (IMMER mit "10-" Prefix):

A) 10-beste-{adj}-telegram-gruppen — Länder/Ethnien (brasilianische, franzoesische, deutsche, spanische, amerikanische, japanische)
B) 10-beste-telegram-gruppen-{trait} — Körper/Nischen (grosser-arsch, grosse-titten, tiefe-kehle)
C) 10-beste-{niche}-telegram-gruppen — Loanwords die Deutsche suchen (milf, bdsm, hentai, cosplay, anal, onlyfans)

REGELN:
- IMMER "10-" am Anfang
- Länder und normale Wörter auf Deutsch — NIEMALS brazil/france/germany/dating/deepthroat/blowjob im Slug
- dating-hookup → sexkontakte oder dating-und-hookup auf Deutsch
- deepthroat → tiefe-kehle, blowjob → blasen
- ß→ss, Umlaute→ae/oe/ue
- NUNCA: Schlampen, Huren, Fotze, Beleidigungen`,
  };

  const shots = BEST_TG_SLUG_FEW_SHOTS.map(
    (s) => `EN key: ${s.slug}\n${locale.toUpperCase()}: ${s[locale]}`,
  ).join('\n\n');

  return `You write URL path segments for adult SEO "Best Telegram Groups" ranking pages on Erogram.
Output ONE slug per line. Nothing else — no quotes, no JSON, no explanation.

${localeRules[locale]}

CRITICAL: Translate EVERYTHING to the target language. No English word may remain except real loanwords locals actually search (onlyfans, bdsm, milf, pov, hentai, cosplay, anal, jav, femdom, glory-hole).
Nationalities, body parts, actions, adjectives — ALL in native language.

PERFECT EXAMPLES (copy this style — native language, NOT English copy-paste):
${shots}

Output: lowercase ASCII hyphen-slug only.`;
}

export function buildBestTgSlugUserPrompt(
  items: { slug: string; label: string }[],
  locale: BestTgSlugLocale,
): string {
  const lines = items.map((i) => `- EN key: ${i.slug} | label: ${i.label}`);
  return `Generate ${locale.toUpperCase()} URL segments for these Best Telegram Groups categories:

${lines.join('\n')}

Return exactly ${items.length} lines, one slug per line, same order.`;
}

export function normalizeSlugOutput(raw: string): string {
  const base = raw
    .trim()
    .toLowerCase()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return withBestTgSlugRankPrefix(base);
}

/** Category labels for batch script — matches slugTranslations keys. */
export const BEST_TG_CATEGORIES: { slug: string; label: string }[] = [
  { slug: 'adult', label: 'Adult' },
  { slug: 'ai-nsfw', label: 'AI NSFW' },
  { slug: 'amateur', label: 'Amateur' },
  { slug: 'anal', label: 'Anal' },
  { slug: 'anime', label: 'Anime' },
  { slug: 'asian', label: 'Asian' },
  { slug: 'bbw', label: 'BBW' },
  { slug: 'bdsm', label: 'BDSM' },
  { slug: 'big-ass', label: 'Big Ass' },
  { slug: 'big-tits', label: 'Big Tits' },
  { slug: 'blonde', label: 'Blonde' },
  { slug: 'blowjob', label: 'Blowjob' },
  { slug: 'brazil', label: 'Brazil' },
  { slug: 'celebrity', label: 'Celebrity' },
  { slug: 'china', label: 'China' },
  { slug: 'chinese-av', label: 'Chinese AV' },
  { slug: 'colombia', label: 'Colombia' },
  { slug: 'cosplay', label: 'Cosplay' },
  { slug: 'creampie', label: 'Creampie' },
  { slug: 'cuckold', label: 'Cuckold' },
  { slug: 'dating-hookup', label: 'Dating & Hookup' },
  { slug: 'deepthroat', label: 'Deepthroat' },
  { slug: 'ebony', label: 'Ebony' },
  { slug: 'fantasy', label: 'Fantasy' },
  { slug: 'feet', label: 'Feet' },
  { slug: 'femdom', label: 'Femdom' },
  { slug: 'fetish', label: 'Fetish' },
  { slug: 'france', label: 'France' },
  { slug: 'germany', label: 'Germany' },
  { slug: 'glory-hole', label: 'Glory Hole' },
  { slug: 'hardcore', label: 'Hardcore' },
  { slug: 'hentai', label: 'Hentai' },
  { slug: 'india', label: 'India' },
  { slug: 'japan', label: 'Japan' },
  { slug: 'jav', label: 'JAV' },
  { slug: 'latina', label: 'Latina' },
  { slug: 'lesbian', label: 'Lesbian' },
  { slug: 'live-cam', label: 'Live Cam' },
  { slug: 'masturbation', label: 'Masturbation' },
  { slug: 'milf', label: 'MILF' },
  { slug: 'nsfw-telegram', label: 'NSFW Telegram' },
  { slug: 'nylon-pantyhose', label: 'Nylon & Pantyhose' },
  { slug: 'onlyfans', label: 'OnlyFans' },
  { slug: 'onlyfans-leaks', label: 'OnlyFans Leaks' },
  { slug: 'pov', label: 'POV' },
  { slug: 'public', label: 'Public' },
  { slug: 'russian', label: 'Russian' },
  { slug: 'spain', label: 'Spain' },
  { slug: 'taboo', label: 'Taboo' },
  { slug: 'telegram-porn', label: 'Telegram Porn' },
  { slug: 'threesome', label: 'Threesome' },
  { slug: 'uncensored-av', label: 'Uncensored AV' },
  { slug: 'usa', label: 'USA' },
];
