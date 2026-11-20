export const AINSFW_EDITORIAL_PICKS_KEY = 'ainsfw_editorial_picks';
export const AINSFW_EDITORIAL_PICK_COUNT = 8;
export const AINSFW_EDITORIAL_PICK_LABEL = "EROGRAM EDITORIAL TEAM'S PICK";
export const AINSFW_EDITORIAL_PICK_DEFAULTS = [
  'hornydreams-ai-ai-girlfriend',
  'fapwise-ai-nude-generator',
  'aislutbot-ai-nude-generator',
  'porncreate-undress-ai',
];

export function normalizeEditorialPickSlugs(raw: unknown, limit = AINSFW_EDITORIAL_PICK_COUNT): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const slugs: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const slug = item.trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    slugs.push(slug);
    if (slugs.length >= limit) break;
  }
  return slugs;
}
