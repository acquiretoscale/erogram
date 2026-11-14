import { AINSFW_GALLERY } from '@/app/ainsfw/galleryMap';

export type EditorialHighlight = { title: string; body: string };

export type EditorialReviewFields = {
  shortDescription?: string;
  featureHighlights?: EditorialHighlight[];
};

export type ToolContentFields = {
  descriptionOverride?: string;
  imageOverride?: string;
  tryNowUrlOverride?: string;
  customGallery?: string[];
  hiddenGalleryUrls?: string[];
  galleryManaged?: boolean;
  coverManaged?: boolean;
  ctaText?: string;
  categoriesOverride?: string[];
  editorialReview?: EditorialReviewFields;
};

export function resolveGallery(slug: string, content?: ToolContentFields | null): string[] {
  // Once admin/listing-owner has managed the gallery, ONLY their saved list is used.
  // Empty customGallery means intentionally empty — never fall back to the hardcoded map.
  if (content?.galleryManaged) {
    return Array.isArray(content.customGallery) ? content.customGallery : [];
  }
  if ((content?.hiddenGalleryUrls?.length ?? 0) > 0) {
    const base = AINSFW_GALLERY[slug] || [];
    const hidden = new Set(content!.hiddenGalleryUrls);
    return base.filter((u) => !hidden.has(u));
  }
  return AINSFW_GALLERY[slug] || [];
}

export function contentFromStats(doc?: ToolContentFields | null): ToolContentFields {
  if (!doc) return {};
  return {
    descriptionOverride: doc.descriptionOverride || '',
    imageOverride: doc.imageOverride || '',
    tryNowUrlOverride: doc.tryNowUrlOverride || '',
    customGallery: doc.customGallery || [],
    hiddenGalleryUrls: doc.hiddenGalleryUrls || [],
    galleryManaged: !!doc.galleryManaged || (doc.hiddenGalleryUrls?.length ?? 0) > 0 || (doc.customGallery?.length ?? 0) > 0,
    coverManaged: !!doc.coverManaged,
    ctaText: doc.ctaText || '',
    categoriesOverride: doc.categoriesOverride || [],
    editorialReview: doc.editorialReview,
  };
}

export function mergeToolContent<T extends { description: string; image: string; tryNowUrl?: string; category?: string; categories?: string[] }>(
  tool: T,
  content?: ToolContentFields | null,
): T {
  if (!content) return tool;
  const description = content.descriptionOverride?.trim();
  const tryNowUrl = content.tryNowUrlOverride?.trim();
  const ctaText = content.ctaText?.trim();
  const categories = (content.categoriesOverride || []).map((c) => c.trim()).filter(Boolean).slice(0, 6);
  let image: string | undefined;
  if (content.coverManaged) {
    image = content.imageOverride?.trim() || '/assets/image.jpg';
  } else if (content.imageOverride?.trim()) {
    image = content.imageOverride.trim();
  }
  return {
    ...tool,
    ...(description ? { description } : {}),
    ...(image !== undefined ? { image } : {}),
    ...(tryNowUrl ? { tryNowUrl } : {}),
    ...(ctaText ? { ctaText } : {}),
    ...(categories.length ? { categories, category: categories[0] } : {}),
  };
}
