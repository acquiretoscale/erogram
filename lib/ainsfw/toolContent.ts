import { AINSFW_GALLERY } from '@/app/ainsfw/galleryMap';

export type ToolContentFields = {
  descriptionOverride?: string;
  imageOverride?: string;
  customGallery?: string[];
  hiddenGalleryUrls?: string[];
  galleryManaged?: boolean;
  coverManaged?: boolean;
};

export function resolveGallery(slug: string, content?: ToolContentFields | null): string[] {
  if (content?.galleryManaged && Array.isArray(content.customGallery)) {
    return content.customGallery;
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
    customGallery: doc.customGallery || [],
    hiddenGalleryUrls: doc.hiddenGalleryUrls || [],
  };
}

export function mergeToolContent<T extends { description: string; image: string }>(
  tool: T,
  content?: ToolContentFields | null,
): T {
  if (!content) return tool;
  const description = content.descriptionOverride?.trim();
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
  };
}
