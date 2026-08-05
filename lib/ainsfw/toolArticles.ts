/** Tool slug → published blog article (review takes priority over /ainsfw tool page). */
export const AINSFW_TOOL_ARTICLE_LINKS: Record<string, { slug: string; title: string; image: string }> = {
  'porncreate-undress-ai': {
    slug: 'create-your-own-ai-porn-porncreate',
    title: 'Why AI Nude Generators Are the New Porn',
    image: 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/articles/why-ai-nude-generators-are-the-new-porn-porncreate-cover.webp',
  },
  'joi-ai-nude-generator': {
    slug: 'joi-ai-budget-ai-companion-nudes-generator-tested',
    title: 'JOI AI - The Budget AI Companion and Nudes generator,  Tested',
    image: 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/ainsfw/gallery/joi-ai-ai-chat-1.webp',
  },
};

export function getAinsfwToolHref(toolSlug: string): string {
  const article = AINSFW_TOOL_ARTICLE_LINKS[toolSlug];
  return article ? `/blog/${article.slug}` : `/ainsfw/${toolSlug}`;
}
