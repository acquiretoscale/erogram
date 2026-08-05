/** Hero preview videos on AINSFW tool pages (R2, mobile-optimized). */
export const AINSFW_TOOL_PREVIEW_VIDEOS: Record<string, { mp4: string; poster?: string }> = {
  'clothoff-undress-ai': {
    mp4: 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/ainsfw/videos/clothoff-undress-ai-preview.mp4',
    poster: 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/ainsfw/videos/clothoff-undress-ai-preview-poster.webp',
  },
  'nudiva-undress-ai': {
    mp4: 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/ainsfw/videos/nudiva-undress-ai-preview.mp4',
    poster: 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/ainsfw/gallery/nudiva-undress-ai-1.webp',
  },
  'genesis-porn-ai-image': {
    mp4: 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/ainsfw/videos/genesis-porn-ai-image-preview.mp4',
    poster: 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/ainsfw/gallery/genesis-porn-ai-image-1.webp',
  },
  'candy-ai-ai-girlfriend': {
    mp4: 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/ainsfw/videos/candy-ai-ai-girlfriend-preview.mp4',
    poster: 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/ainsfw/videos/candy-ai-ai-girlfriend-preview-poster.webp',
  },
  'lovescape-ai-girlfriend': {
    mp4: 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/ainsfw/videos/lovescape-ai-girlfriend-preview.mp4',
    poster: 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/ainsfw/gallery/lovescape-ai-girlfriend-1.webp',
  },
  'porncreate-undress-ai': {
    mp4: 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/ainsfw/videos/porncreate-undress-ai-preview.mp4',
    poster: 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/ainsfw/videos/porncreate-undress-ai-preview-poster.webp',
  },
  'joi-ai-nude-generator': {
    mp4: 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/articles/joi-ai-promo-v112.mp4',
    poster: 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/articles/joi-ai-promo-v111-poster.webp',
  },
};

export function getAinsfwToolPreviewVideo(slug: string) {
  return AINSFW_TOOL_PREVIEW_VIDEOS[slug];
}
