/** Tool slug → published blog article (review takes priority over /ainsfw tool page). */
export const AINSFW_TOOL_ARTICLE_LINKS: Record<string, { slug: string; title: string }> = {
  'porncreate-undress-ai': {
    slug: 'create-your-own-ai-porn-porncreate',
    title: 'Why AI Nude Generators Are the New Porn',
  },
  'joi-ai-nude-generator': {
    slug: 'joi-ai-budget-ai-companion-nudes-generator-tested',
    title: 'JOI AI - The Budget AI Companion and Nudes generator,  Tested',
  },
};

export function getAinsfwToolHref(toolSlug: string): string {
  const article = AINSFW_TOOL_ARTICLE_LINKS[toolSlug];
  return article ? `/blog/${article.slug}` : `/ainsfw/${toolSlug}`;
}
