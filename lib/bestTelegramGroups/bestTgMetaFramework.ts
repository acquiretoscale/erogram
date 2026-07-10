/**
 * Native meta description framework for Best Telegram Groups pages.
 */

import { BEST_TG_CATEGORIES } from './bestTgSlugFramework';

export type BestTgMetaLocale = 'en' | 'de' | 'es' | 'pt';

export interface BestTgMetaSet {
  en: string;
  de: string;
  es: string;
  pt: string;
}

/** Perfect examples — batch must not overwrite. */
export const BEST_TG_META_LOCKED: Record<string, BestTgMetaSet> = {
  brazil: {
    en: "Want the best Brazilian Telegram groups without dodgy links? Erogram's top 10 list features curated, verified +18 channels — active communities updated regularly.",
    de: "Du suchst die besten brasilianischen Telegram-Gruppen ohne Müll-Links? Erograms Top-10-Liste: kuratiert, verifiziert und täglich aktiv — +18 Communities.",
    es: "¿Buscas los mejores grupos de Telegram brasileños sin enlaces basura? El top 10 de Erogram: comunidades +18 verificadas, activas y curadas.",
    pt: "Quer os melhores grupos Telegram brasileiros sem link falso? O top 10 da Erogram traz canais +18 verificados, ativos e curados — sem perder tempo.",
  },
  france: {
    en: "Hunting the best French Telegram groups? Erogram's top 10 ranks curated +18 channels — verified links, active members, no spam folders.",
    de: "Die besten französischen Telegram-Gruppen gesucht? Erograms Top 10: kuratierte +18-Kanäle mit verifizierten Links und echten aktiven Communities.",
    es: "¿Quieres los mejores grupos de Telegram de Francia? Top 10 de Erogram: canales +18 verificados, activos y sin enlaces rotos.",
    pt: "Quer os melhores grupos Telegram franceses? Top 10 Erogram: canais +18 curados, links verificados e comunidades realmente ativas.",
  },
  'dating-hookup': {
    en: "Need real dating & hookup Telegram groups that actually work? Erogram's top 10 list — verified +18 communities for flirting, meets and NSFW chat.",
    de: "Echte Dating- und Sexkontakt-Telegram-Gruppen gesucht? Erograms Top 10: verifizierte +18-Communities für Flirt, Treffen und heißen Chat.",
    es: "¿Grupos de Telegram para citas y encuentros que funcionen? Top 10 Erogram: comunidades +18 verificadas para ligar y chat adulto.",
    pt: "Grupos Telegram de encontros casuais que funcionam de verdade? Top 10 Erogram: comunidades +18 verificadas pra flertar e chat quente.",
  },
  deepthroat: {
    en: "Into deepthroat Telegram groups? Erogram's top 10 picks the best +18 channels — curated links, active posters, no dead groups.",
    de: "Deepthroat-Telegram-Gruppen gesucht? Erograms Top 10: die besten +18-Kanäle — kuratierte Links, aktive Poster, keine toten Gruppen.",
    es: "¿Grupos de Telegram de garganta profunda? Top 10 Erogram: mejores canales +18 con enlaces verificados y comunidades activas.",
    pt: "Grupos Telegram de garganta profunda? Top 10 Erogram: melhores canais +18 com links verificados e galera postando todo dia.",
  },
  'big-ass': {
    en: "Big ass Telegram groups worth joining? Erogram's top 10 — curated +18 channels with verified links and the most active booty-loving communities.",
    de: "Telegram-Gruppen mit dickem Arsch gesucht? Erograms Top 10: kuratierte +18-Kanäle mit verifizierten Links und aktiven Communities.",
    es: "¿Grupos de Telegram de culos grandes? Top 10 Erogram: canales +18 curados, enlaces verificados y comunidades muy activas.",
    pt: "Grupos Telegram de rabuda que valem a pena? Top 10 Erogram: canais +18 curados, links verificados e comunidades bem ativas.",
  },
};

export { BEST_TG_CATEGORIES };

const BANNED =
  /\b(putas?|schlampen|schlampe|huren|hure|fotze|fotzen|bitch|perras?|zorras?|safadas?|vadias?|sluts?|whores?)\b/i;

export function isBannedMeta(text: string): boolean {
  return BANNED.test(text);
}

export function isOldMetaPattern(entry: Partial<BestTgMetaSet> | undefined): boolean {
  if (!entry?.en) return true;
  if (!entry.pt?.trim()) return true;
  if (/If you're after the 10 best/i.test(entry.en)) return true;
  if (/Erwachsenen-Communities\.?$/.test(entry.de || '') && /Telegram-Gruppen suchen/i.test(entry.de || '')) return true;
  return false;
}

export function buildBestTgMetaSystemPrompt(): string {
  const shots = Object.entries(BEST_TG_META_LOCKED)
    .slice(0, 4)
    .map(([slug, m]) => `KEY: ${slug}\nEN: ${m.en}\nDE: ${m.de}\nES: ${m.es}\nPT: ${m.pt}`)
    .join('\n\n');

  return `You write SEO meta descriptions (140–165 chars each) for Erogram.pro "Best Telegram Groups" ranking pages (+18).

Return ONLY valid JSON array. No markdown. Each object:
{"slug":"en-key","en":"...","de":"...","es":"...","pt":"..."}

RULES — ALL LOCALES:
- Native adult SEO language — translate countries/niches properly (Brazil→brasileiro/Brasil, France→francese/Francia, deepthroat→garganta profunda/tiefe Kehle, dating→encontros/citas/Sexkontakte)
- Mention Erogram or Erogram.pro once per description
- "Top 10" or "10 best" concept
- Telegram groups/channels +18
- Curated, verified, active — vary wording, NO copy-paste template across categories
- DE: use "du", not "Sie"
- ES: informal tú, natural LATAM/Spain mix
- PT: Brazilian Portuguese (você), natural BR porn/search tone
- NEVER insults (puta, schlampe, fotze, etc.)

PERFECT EXAMPLES:
${shots}`;
}

export function buildBestTgMetaUserPrompt(items: { slug: string; label: string }[]): string {
  const lines = items.map((i) => `- slug: ${i.slug} | label: ${i.label}`);
  return `Write meta descriptions for these Best Telegram Groups categories:

${lines.join('\n')}

Return JSON array with exactly ${items.length} objects, same order.`;
}

export function parseMetaJson(raw: string): BestTgMetaSet[] {
  const cleaned = raw.replace(/^```json?\s*|\s*```$/g, '').trim();
  const parsed = JSON.parse(cleaned) as BestTgMetaSet[];
  if (!Array.isArray(parsed)) throw new Error('Expected JSON array');
  return parsed;
}

export function validateMetaSet(slug: string, m: BestTgMetaSet): string | null {
  for (const loc of ['en', 'de', 'es', 'pt'] as const) {
    const t = m[loc]?.trim();
    if (!t) return `${slug}.${loc} empty`;
    if (t.length < 80 || t.length > 200) return `${slug}.${loc} length ${t.length}`;
    if (isBannedMeta(t)) return `${slug}.${loc} banned word`;
  }
  return null;
}
