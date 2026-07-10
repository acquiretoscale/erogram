/**
 * Slug framework for Best OnlyFans Accounts category pages.
 * Pattern: 10-{native translation}
 */

export type BoaSlugLocale = 'de' | 'es' | 'pt';

export const BOA_SLUG_RANK_PREFIX = '10-';

export function withBoaSlugRankPrefix(slug: string): string {
  const s = slug.trim();
  if (!s) return s;
  return s.startsWith(BOA_SLUG_RANK_PREFIX) ? s : `${BOA_SLUG_RANK_PREFIX}${s}`;
}

const BANNED =
  /\b(putas?|schlampen|schlampe|huren|hure|fotze|fotzen|bitch|perras?|zorras?|safadas?|vadias?|sluts?|whores?)\b/i;

export function isBannedSlugToken(slug: string): boolean {
  return BANNED.test(slug);
}

const ALLOWED_LOANWORDS = new Set([
  'onlyfans', 'milf', 'pawg', 'teen', 'cosplay', 'bdsm', 'pov', 'gfe', 'joi',
  'findom', 'femdom', 'anal', 'ahegao', 'asmr', 'bbw', 'hentai', 'sexting',
  'latex', 'bondage', 'lingerie', 'fitness', 'yoga', 'roleplay', 'solo',
  'accounts', 'contas', 'cuentas', 'beste', 'mejores', 'melhores', '10',
]);

const ENGLISH_WORDS = /^(american|argentinian|australian|brazilian|british|canadian|chilean|chinese|colombian|czech|dutch|french|german|greek|indian|irish|italian|japanese|korean|mexican|moroccan|norwegian|persian|peruvian|polish|romanian|russian|scottish|spanish|swedish|taiwanese|thai|turkish|ukrainian|finnish|feet|hairy|shaved|stockings|thick|threesome|submissive|tattoo|pregnant|neighbor|nurse|dancer|couple|celebrity|custom|exotic|natural|college|heels|hotwife|maid|big|booty|next|door|hottest|best|show|call|video|live)$/;

export function hasUntranslatedEnglish(slug: string): boolean {
  const tokens = slug.toLowerCase().replace(/^10-/, '').split('-');
  return tokens.some((t) => ENGLISH_WORDS.test(t) && !ALLOWED_LOANWORDS.has(t));
}

export function buildBoaSlugSystemPrompt(locale: BoaSlugLocale): string {
  const localeRules: Record<BoaSlugLocale, string> = {
    de: `DEUTSCH — Muster:
10-beste-{niche-auf-deutsch}-onlyfans-accounts

REGELN:
- IMMER mit "10-" beginnen
- Übersetze ALLES in natürliches Deutsch
- ß→ss, Umlaute→ae/oe/ue, ASCII, Kleinbuchstaben, Bindestriche
- NIEMALS: Schlampen, Huren, Fotze, Beleidigungen`,

    es: `ESPAÑOL — patrón:
10-mejores-cuentas-{niche-en-espanol}-onlyfans

REGLAS:
- SIEMPRE empieza con "10-"
- Traduce TODO al español natural
- ASCII, minúsculas, guiones, sin tildes en URL
- NUNCA: putas, zorras, perras, insultos`,

    pt: `PORTUGUÊS (Brasil) — padrão:
10-melhores-contas-{niche-em-portugues}-onlyfans

REGRAS:
- SEMPRE comece com "10-"
- Traduza TUDO para português brasileiro natural
- ASCII, minúsculas, hífens, sem acentos
- NUNCA: putas, safadas, vadias, insultos`,
  };

  return `You write URL path segments for adult SEO "Best OnlyFans Accounts" ranking pages on Erogram.
Output ONE slug per line. Nothing else — no quotes, no JSON, no explanation.

${localeRules[locale]}

ABSOLUTE RULE: Translate EVERYTHING to natural ${locale === 'de' ? 'German' : locale === 'es' ? 'Spanish' : 'Brazilian Portuguese'}.
The ONLY English words allowed are loanwords locals actually search: onlyfans, milf, pawg, teen, cosplay, bdsm, pov, gfe, joi, findom, femdom, anal, ahegao, e-girl, asmr, bbw, hentai, sexting, latex, bondage, lingerie, fitness, yoga, roleplay, solo.
Everything else — nationalities, body parts, adjectives, actions — MUST be in the target language.

Output format: lowercase ASCII hyphen-slug only. ALWAYS start with "10-".`;
}

export function buildBoaSlugUserPrompt(
  items: { slug: string; label: string }[],
  locale: BoaSlugLocale,
): string {
  const lines = items.map((i) => `- EN key: ${i.slug} | label: ${i.label}`);
  return `Generate ${locale.toUpperCase()} URL segments for these Best OnlyFans Accounts categories:

${lines.join('\n')}

Return exactly ${items.length} lines, one slug per line, same order. Each MUST start with "10-".`;
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
  return withBoaSlugRankPrefix(base);
}

export const BOA_CATEGORIES: { slug: string; label: string }[] = [
  { slug: 'ahegao', label: 'Ahegao' },
  { slug: 'alt', label: 'Alt' },
  { slug: 'amateur', label: 'Amateur' },
  { slug: 'asian', label: 'Asian' },
  { slug: 'big-ass', label: 'Big Ass' },
  { slug: 'big-boobs', label: 'Big Boobs' },
  { slug: 'blonde', label: 'Blonde' },
  { slug: 'brunette', label: 'Brunette' },
  { slug: 'cosplay', label: 'Cosplay' },
  { slug: 'curvy', label: 'Curvy' },
  { slug: 'ebony', label: 'Ebony' },
  { slug: 'feet', label: 'Feet' },
  { slug: 'fitness', label: 'Fitness' },
  { slug: 'goth', label: 'Goth' },
  { slug: 'joi', label: 'JOI' },
  { slug: 'latina', label: 'Latina' },
  { slug: 'lesbian', label: 'Lesbian' },
  { slug: 'lingerie', label: 'Lingerie' },
  { slug: 'milf', label: 'MILF' },
  { slug: 'petite', label: 'Petite' },
  { slug: 'piercing', label: 'Piercing' },
  { slug: 'redhead', label: 'Redhead' },
  { slug: 'squirt', label: 'Squirt' },
  { slug: 'streamer', label: 'Streamer' },
  { slug: 'tattoo', label: 'Tattoo' },
  { slug: 'teen', label: 'Teen' },
  { slug: 'thick', label: 'Thick' },
  { slug: 'twerk', label: 'Twerk' },
];
