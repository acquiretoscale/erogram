export const AINSFW_SLUG_TRANSLATIONS: Record<string, { de?: string; es?: string }> = {
};
export function getLocalizedAinsfwSlug(slug: string, locale: 'de' | 'es') {
  return AINSFW_SLUG_TRANSLATIONS[slug]?.[locale] ?? null;
}
export function resolveAinsfwSlugFromPublicSegment(segment: string): string | null {
  for (const [slug, tr] of Object.entries(AINSFW_SLUG_TRANSLATIONS)) {
    if (tr.de === segment || tr.es === segment) return slug;
  }
  return null;
}
