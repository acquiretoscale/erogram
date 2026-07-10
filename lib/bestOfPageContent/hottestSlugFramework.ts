/**
 * Native NSFW SEO slug framework for Top 10 OnlyFans ranking pages.
 * DeepSeek must mirror these patterns — NOT literal EN translation.
 */

export type Top10SlugLocale = 'de' | 'es' | 'pt';

/** Top-10 ranking prefix on all localized hottest OF URL segments. */
export const TOP10_SLUG_RANK_PREFIX = 'top-10-';

export function withTop10SlugRankPrefix(slug: string): string {
  const s = slug.trim();
  if (!s) return s;
  return s.startsWith(TOP10_SLUG_RANK_PREFIX) ? s : `${TOP10_SLUG_RANK_PREFIX}${s}`;
}

/** Owner-approved slugs — never overwrite in batch runs. */
export const TOP10_SLUG_LOCKED: Record<string, Partial<Record<Top10SlugLocale, string>>> = {
  'big-ass': {
    de: 'top-10-onlyfans-models-mit-dickem-arsch',
    es: 'top-10-modelos-onlyfans-culo-grande',
    pt: 'top-10-modelos-onlyfans-bunda-grande',
  },
  'big-boobs': {
    de: 'top-10-onlyfans-models-mit-grossen-titten',
    es: 'top-10-modelos-onlyfans-tetonas',
    pt: 'top-10-modelos-onlyfans-peitudas',
  },
  nude: {
    de: 'top-10-nackte-onlyfans-models',
    es: 'top-10-modelos-onlyfans-desnudas',
    pt: 'top-10-modelos-onlyfans-nuas',
  },
  ahegao: {
    de: 'top-10-ahegao-onlyfans-models',
    es: 'top-10-modelos-onlyfans-ahegao',
    pt: 'top-10-modelos-onlyfans-ahegao',
  },
  fetish: {
    de: 'top-10-fetish-onlyfans-models',
    es: 'top-10-modelos-onlyfans-fetish',
    pt: 'top-10-modelos-onlyfans-fetiche',
  },
  model: { de: 'top-10-onlyfans-modelle' },
  latina: {
    de: 'top-10-latina-onlyfans-models',
    es: 'top-10-modelos-onlyfans-latinas',
    pt: 'top-10-modelos-onlyfans-latinas',
  },
  'e-girl': { de: 'top-10-e-girl-onlyfans-models' },
  blonde: {
    de: 'top-10-blonde-onlyfans-models',
    es: 'top-10-modelos-onlyfans-rubias',
    pt: 'top-10-modelos-onlyfans-loiras',
  },
  solo: { de: 'top-10-solo-onlyfans-models' },
  lesbian: {
    de: 'top-10-lesben-onlyfans-models',
    es: 'top-10-modelos-onlyfans-lesbianas',
    pt: 'top-10-modelos-onlyfans-lesbicas',
  },
  alt: { de: 'top-10-alt-onlyfans-models' },
  sexting: { de: 'top-10-sexting-onlyfans-models' },
  busty: {
    de: 'top-10-busty-onlyfans-models',
    es: 'top-10-modelos-onlyfans-tetonas',
    pt: 'top-10-modelos-onlyfans-peitudas',
  },
  british: { de: 'top-10-britische-onlyfans-models' },
  custom: { de: 'top-10-onlyfans-models-mit-custom-content' },
  'onlyfans-free': { de: 'top-10-kostenlose-onlyfans-models' },
  brunette: {
    de: 'top-10-brunette-onlyfans-models',
    es: 'top-10-modelos-onlyfans-morenas',
    pt: 'top-10-modelos-onlyfans-morenas',
  },
  petite: {
    de: 'top-10-petite-onlyfans-models',
    es: 'top-10-modelos-onlyfans-petite',
    pt: 'top-10-modelos-onlyfans-petite',
  },
  teen: {
    de: 'top-10-teen-onlyfans-models',
    es: 'top-10-modelos-onlyfans-teen',
    pt: 'top-10-modelos-onlyfans-teen',
  },
  anime: { de: 'top-10-anime-onlyfans-models' },
  turkish: { de: 'top-10-tuerkische-onlyfans-models' },
  pawg: {
    de: 'top-10-pawg-onlyfans-models',
    es: 'top-10-modelos-onlyfans-pawg',
    pt: 'top-10-modelos-onlyfans-pawg',
  },
  mommy: {
    de: 'top-10-mommy-onlyfans-models',
    es: 'top-10-modelos-onlyfans-mommy',
    pt: 'top-10-modelos-onlyfans-mommy',
  },
  cosplay: { pt: 'top-10-modelos-onlyfans-cosplay' },
};

export const TOP10_SLUG_FEW_SHOTS = Object.entries(TOP10_SLUG_LOCKED)
  .filter(([, locs]) => locs.de && locs.es && locs.pt)
  .slice(0, 12)
  .map(([slug, locs]) => ({
    en: `top-10-${slug}-onlyfans-models`,
    slug,
    de: locs.de!,
    es: locs.es!,
    pt: locs.pt!,
  }));

const BANNED =
  /\b(putas?|schlampen|schlampe|huren|hure|fotze|fotzen|bitch|perras?|zorras?|safadas?|vadias?|sluts?|whores?)\b/i;

export function isBannedSlugToken(slug: string): boolean {
  return BANNED.test(slug);
}

/** Loanwords that locals actually search in English — these are allowed to stay. */
const ALLOWED_LOANWORDS = new Set([
  'onlyfans', 'milf', 'pawg', 'teen', 'cosplay', 'bdsm', 'pov', 'gfe', 'joi',
  'findom', 'femdom', 'anal', 'ahegao', 'e', 'girl', 'asmr', 'bbw', 'hentai',
  'models', 'modelos', 'onlyfans', 'mas', 'mais', 'calientes', 'gostosas',
  'hot', 'top-10', 'beste', 'mejores', 'melhores', 'mit', 'von',
  'modelle', 'gruppen', 'grupos', 'telegram',
  '10', 'no', 'ppv', 'roleplay', 'sexting', 'latex', 'bondage', 'lingerie',
  'fitness', 'yoga', 'gamer', 'streamer', 'influencer', 'solo',
]);

/** True if the slug still contains English that should have been translated. */
export function hasUntranslatedEnglish(slug: string, _locale: Top10SlugLocale): boolean {
  const tokens = slug.toLowerCase().replace(/^10-/, '').split('-');
  const ENGLISH_WORDS = /^(american|argentinian|australian|brazilian|british|canadian|chilean|chinese|colombian|czech|dutch|french|german|greek|indian|irish|italian|japanese|korean|mexican|moroccan|norwegian|persian|peruvian|polish|romanian|russian|scottish|spanish|swedish|taiwanese|thai|turkish|ukrainian|finnish|feet|hairy|shaved|stockings|thick|threesome|submissive|tattoo|pregnant|neighbor|nurse|dancer|couple|celebrity|custom|exotic|natural|college|heels|hotwife|maid|big|booty|next|door|hottest|best|show|call|video|live)$/;
  return tokens.some((t) => ENGLISH_WORDS.test(t) && !ALLOWED_LOANWORDS.has(t));
}

export function buildTop10SlugSystemPrompt(locale: Top10SlugLocale): string {
  const localeRules: Record<Top10SlugLocale, string> = {
    pt: `PORTUGUESE (Brazil) — default pattern:
top-10-modelos-onlyfans-{native-niche}

Rules:
- ALWAYS start with "10-" (Top 10 ranking)
- "modelos-onlyfans" after the prefix, niche in the middle, "top-10" LAST
- Use native BR adult SEO terms: bunda-grande, peitudas, nuas, loiras, morenas, latinas, lesbicas
- Keep English loanwords when Brazilians search them: teen, petite, pawg, cosplay, ahegao, mommy
- ASCII only, lowercase, hyphens, no accents
- NEVER: putas, safadas, vadias, insults`,

    es: `SPANISH — default pattern:
top-10-modelos-onlyfans-{native-niche}

Rules:
- ALWAYS start with "10-" (Top 10 ranking)
- "modelos-onlyfans" after the prefix, niche in the middle, "top-10" LAST (or "mas-hot" for niche slang like ahegao)
- Use native ES adult SEO: culo-grande, tetonas, desnudas, rubias, morenas, latinas, lesbianas
- Keep English loanwords when LATAM searches them: teen, petite, pawg, fetish, cosplay
- ASCII only, lowercase, hyphens, no tildes in URL
- NEVER: putas, zorras, perras, insults`,

    de: `GERMAN — flexible patterns (pick the most natural, ALWAYS prefix with "10-"):

A) top-10-{niche}-onlyfans-models — default for niches/loanwords (latina, blonde, teen, pawg, cosplay)
B) top-10-onlyfans-models-mit-{trait} — body traits (dickem-arsch, grossen-titten, custom-content)
C) top-10-{adj}-onlyfans-models — adjective-first (nackte, kostenlose, britische, tuerkische)
D) top-10-onlyfans-modelle — special case for generic "Model" niche only

Rules:
- ALWAYS start with "10-" (Top 10 ranking)
- Use ß→ss as ss (top-10 not heißeste), umlauts→ae/oe/ue (tuerkische)
- ASCII only, lowercase, hyphens
- NEVER: Schlampen, Huren, Fotze, insults`,
  };

  const shots = TOP10_SLUG_FEW_SHOTS.map(
    (s) => `EN: ${s.en}\n${locale.toUpperCase()}: ${s[locale]}`,
  ).join('\n\n');

  return `You write URL path segments for adult SEO ranking pages on Erogram.
Output ONE slug per line. Nothing else — no quotes, no JSON, no explanation.

${localeRules[locale]}

ABSOLUTE RULE: Translate EVERYTHING to natural ${locale === 'de' ? 'German' : locale === 'es' ? 'Spanish' : 'Brazilian Portuguese'}.
The ONLY English words allowed are loanwords locals actually search: onlyfans, milf, pawg, teen, cosplay, bdsm, pov, gfe, joi, findom, femdom, anal, ahegao, e-girl, asmr, bbw, hentai, sexting, latex, bondage, lingerie, fitness, yoga, roleplay, solo.
Everything else — nationalities, body parts, adjectives, actions — MUST be in the target language.

PERFECT EXAMPLES (copy this style exactly):
${shots}

Output format: lowercase ASCII hyphen-slug only.`;
}

export function buildTop10SlugUserPrompt(
  items: { slug: string; label: string; enSegment: string }[],
  locale: Top10SlugLocale,
): string {
  const lines = items.map(
    (i) => `- EN: ${i.enSegment} | niche: ${i.label} | key: ${i.slug}`,
  );
  return `Generate ${locale.toUpperCase()} URL segments for these Top 10 OnlyFans ranking pages:

${lines.join('\n')}

Return exactly ${items.length} lines, one slug per line, same order.`;
}

/* ==========================================================================
 * HERO BODY + META TEXT PROMPT (fixes the "Big Ass left in German prose" bug)
 *
 * ROOT CAUSE of the DE mistake: the writer received the raw ENGLISH label
 * ("Big Ass", "fetish") and pasted it verbatim into the target-language
 * sentence. The fix: NEVER send the English label as the thing to write about.
 * Send the ALREADY-LOCALIZED niche term (Dicker Arsch / Culonas / Bunda Grande)
 * and forbid the English label explicitly by name.
 * ==========================================================================*/

const BODY_LOCALE_NAME: Record<Top10SlugLocale, string> = {
  de: 'German',
  es: 'Spanish',
  pt: 'Brazilian Portuguese',
};

export function buildTop10BodySystemPrompt(locale: Top10SlugLocale): string {
  const name = BODY_LOCALE_NAME[locale];
  return `You write adult (NSFW) SEO copy for Erogram "Top 10 OnlyFans models" ranking pages, in natural, fluent ${name} that real ${name} adult searchers use.

OUTPUT: valid JSON only — {"heroIntro": "...", "bottomBody": "..."} — no markdown fences, no commentary.

ABSOLUTE RULE — THIS IS WHY YOU EXIST:
- You will be given the niche ALREADY TRANSLATED into ${name} (the "nativeNiche").
- Write EVERY mention of the niche using that nativeNiche term.
- NEVER write the English niche name. If the English word appears anywhere in your output, the answer is REJECTED.
- The ONLY English allowed: the fixed loanwords locals search (onlyfans, milf, pawg, teen, cosplay, bdsm, pov, gfe, joi, findom, femdom, anal, ahegao, asmr, bbw, sexting) — and only if the nativeNiche itself is one of those.
- No placeholder text, no "Intro:", no template scaffolding, no bracketed tokens. Write finished prose.
- heroIntro: 2–4 punchy sentences, first person plural ("wir"/"nosotros"/"nós"), ending on a hook.
- bottomBody: 5 short H2 sections (## ...) of natural ${name}, each naming the niche with the nativeNiche term, bold inline sub-ideas with **...**.`;
}

export function buildTop10BodyUserPrompt(
  item: { slug: string; enLabel: string; nativeNiche: string },
  locale: Top10SlugLocale,
): string {
  const name = BODY_LOCALE_NAME[locale];
  return `Write the ${name} heroIntro + bottomBody for this ranking page.

nativeNiche (USE THIS EXACT ${name} term everywhere): ${item.nativeNiche}
FORBIDDEN — do NOT write this English word anywhere: "${item.enLabel}"

Return JSON only: {"heroIntro": "...", "bottomBody": "..."}`;
}

/**
 * Post-generation guard for hero/meta prose. Returns true if the ENGLISH label
 * leaked into the target-language text (whole-word, case-insensitive) while its
 * localized form is different — i.e. the exact DE mistake. Use this to reject +
 * regenerate before writing to disk.
 */
export function bodyHasUntranslatedNiche(text: string, enLabel: string, nativeNiche: string): boolean {
  if (!text || !enLabel) return false;
  if (enLabel.toLowerCase() === nativeNiche.toLowerCase()) return false; // loanword, same in both
  const re = new RegExp(`\\b${enLabel.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'i');
  return re.test(text);
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
  return withTop10SlugRankPrefix(base);
}

/** @deprecated Use TOP10_SLUG_LOCKED */
export const HOTTEST_SLUG_LOCKED = TOP10_SLUG_LOCKED;
export const HOTTEST_SLUG_RANK_PREFIX = TOP10_SLUG_RANK_PREFIX;
export type HottestSlugLocale = Top10SlugLocale;
export const withHottestSlugRankPrefix = withTop10SlugRankPrefix;
export const buildHottestSlugSystemPrompt = buildTop10SlugSystemPrompt;
export const buildHottestSlugUserPrompt = buildTop10SlugUserPrompt;
export const buildHottestBodySystemPrompt = buildTop10BodySystemPrompt;
export const buildHottestBodyUserPrompt = buildTop10BodyUserPrompt;
