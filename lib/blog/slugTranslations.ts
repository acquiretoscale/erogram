export const BLOG_SLUG_TRANSLATIONS: Record<string, { de?: string; es?: string }> = {
};
export function getLocalizedBlogSlug(slug: string, locale: 'de' | 'es') {
  return BLOG_SLUG_TRANSLATIONS[slug]?.[locale] ?? null;
}
export function resolveBlogSlugFromPublicSegment(segment: string): string | null {
  for (const [slug, tr] of Object.entries(BLOG_SLUG_TRANSLATIONS)) {
    if (tr.de === segment || tr.es === segment) return slug;
  }
  return null;
}
