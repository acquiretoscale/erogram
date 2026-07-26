import type { Locale } from '@/lib/i18n';

/** Bing flags descriptions under ~120 chars. Target 120-158. */
export const MIN_ENTITY_META_DESC = 120;
export const MAX_ENTITY_META_DESC = 158;

function slugVariant(slug: string): number {
  return [...slug].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 3;
}

function fmtMembers(count: number): string {
  if (count >= 1_000_000) return `${Math.floor(count / 100_000) / 10}M+ members`;
  if (count >= 1_000) return `${Math.floor(count / 1_000)}K+ members`;
  if (count >= 100) return `${count.toLocaleString()}+ members`;
  return '';
}

function primaryNiche(categories: string[], category: string, country: string): string {
  const raw = categories.find(Boolean) || category || country || 'adult';
  const lower = raw.toLowerCase();
  if (lower === 'ai nsfw') return 'AI';
  return lower;
}

function clamp(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= MAX_ENTITY_META_DESC) return t;
  const cut = t.slice(0, MAX_ENTITY_META_DESC - 3);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > MIN_ENTITY_META_DESC ? cut.slice(0, lastSpace) : cut) + '...';
}

function ensureMinLength(text: string): string {
  let t = text.replace(/\s+/g, ' ').trim();
  if (t.length >= MIN_ENTITY_META_DESC) return clamp(t);
  const withShort = `${t} Free on Erogram.`;
  if (withShort.length >= MIN_ENTITY_META_DESC) return clamp(withShort);
  return clamp(`${t} Discover more NSFW Telegram listings on Erogram.`);
}

export function resolveEntityMetaDescription(
  masterDesc: string,
  dbDesc: string | undefined,
  generated: string,
): string {
  if (masterDesc?.trim()) return masterDesc.trim();
  const clean = (dbDesc || '').trim();
  if (clean.length >= MIN_ENTITY_META_DESC) {
    return clean.length > MAX_ENTITY_META_DESC
      ? clamp(clean)
      : clean;
  }
  return clamp(generated);
}

export function buildGroupListingMetaDescription(input: {
  name: string;
  slug: string;
  memberCount: number;
  categories: string[];
  category: string;
  country: string;
  locale: Locale;
}): string {
  const { name, slug, memberCount, categories, category, country, locale } = input;
  const niche = primaryNiche(categories, category, country);
  const members = fmtMembers(memberCount);
  const v = slugVariant(slug);

  const en: [string, string, string] = [
    `${name} Telegram group${members ? ` with ${members}` : ''}. Daily NSFW ${niche} content, active community, verified join link. Browse free on Erogram.`,
    `Join ${name} on Telegram for daily NSFW ${niche} videos and content${members ? `, ${members}` : ''}. Verified link, browse free on Erogram.`,
    `${name} on Telegram: popular NSFW ${niche} channel${members ? `, ${members}` : ', active members'}. Verified join link on Erogram.`,
  ];
  const de: [string, string, string] = [
    `${name} Telegram-Gruppe${members ? ` mit ${members}` : ''}. Täglich NSFW ${niche} Inhalte, aktive Community, verifizierter Link. Kostenlos auf Erogram.`,
    `Tritt ${name} auf Telegram bei: täglich NSFW ${niche} Videos${members ? `, ${members}` : ''}. Verifizierter Link auf Erogram.`,
    `${name} auf Telegram: beliebter NSFW ${niche} Kanal${members ? `, ${members}` : ''}. Verifizierter Beitrittslink auf Erogram.`,
  ];
  const es: [string, string, string] = [
    `Grupo ${name} en Telegram${members ? ` con ${members}` : ''}. Contenido NSFW ${niche} diario, comunidad activa, enlace verificado. Gratis en Erogram.`,
    `Únete a ${name} en Telegram: videos NSFW ${niche} diarios${members ? `, ${members}` : ''}. Enlace verificado en Erogram.`,
    `${name} en Telegram: canal NSFW ${niche} popular${members ? `, ${members}` : ''}. Enlace verificado, gratis en Erogram.`,
  ];
  const pt: [string, string, string] = [
    `Grupo ${name} no Telegram${members ? ` com ${members}` : ''}. Conteúdo NSFW ${niche} diário, comunidade ativa, link verificado. Grátis no Erogram.`,
    `Entre no ${name} no Telegram: vídeos NSFW ${niche} diários${members ? `, ${members}` : ''}. Link verificado no Erogram.`,
    `${name} no Telegram: canal NSFW ${niche} popular${members ? `, ${members}` : ''}. Link verificado, grátis no Erogram.`,
  ];

  const map = { en, de, es, pt };
  return ensureMinLength(map[locale]?.[v] || en[v]);
}

export function buildBotListingMetaDescription(input: {
  name: string;
  slug: string;
  categories: string[];
  category: string;
  country: string;
  locale: Locale;
}): string {
  const { name, slug, categories, category, country, locale } = input;
  const niche = primaryNiche(categories, category, country);
  const v = slugVariant(slug);

  const en: [string, string, string] = [
    `${name} Telegram bot for NSFW ${niche} content. Free to try, instant results, verified bot link. Browse and use on Erogram.`,
    `Use ${name} on Telegram: NSFW ${niche} bot with verified link and active users. Try free on Erogram.`,
    `${name} on Telegram: popular NSFW ${niche} bot. Verified link, free to start. Find it on Erogram.`,
  ];
  const de: [string, string, string] = [
    `${name} Telegram-Bot für NSFW ${niche} Inhalte. Gratis testen, sofortige Ergebnisse, verifizierter Link auf Erogram.`,
    `Nutze ${name} auf Telegram: NSFW ${niche} Bot mit verifiziertem Link. Gratis starten auf Erogram.`,
    `${name} auf Telegram: beliebter NSFW ${niche} Bot. Verifizierter Link, gratis auf Erogram.`,
  ];
  const es: [string, string, string] = [
    `Bot ${name} en Telegram para contenido NSFW ${niche}. Prueba gratis, resultados al instante, enlace verificado en Erogram.`,
    `Usa ${name} en Telegram: bot NSFW ${niche} con enlace verificado. Pruébalo gratis en Erogram.`,
    `${name} en Telegram: bot NSFW ${niche} popular. Enlace verificado, gratis en Erogram.`,
  ];
  const pt: [string, string, string] = [
    `Bot ${name} no Telegram para conteúdo NSFW ${niche}. Teste grátis, resultados instantâneos, link verificado no Erogram.`,
    `Use ${name} no Telegram: bot NSFW ${niche} com link verificado. Comece grátis no Erogram.`,
    `${name} no Telegram: bot NSFW ${niche} popular. Link verificado, grátis no Erogram.`,
  ];

  const map = { en, de, es, pt };
  return ensureMinLength(map[locale]?.[v] || en[v]);
}
