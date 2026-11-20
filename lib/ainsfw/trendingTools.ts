export type AinsfwTrendingItem = {
  slug: string;
  name: string;
  href: string;
  logo: string;
};

/** Shown until an admin saves a list from the AI NSFW page. */
export const DEFAULT_AINSFW_TRENDING: AinsfwTrendingItem[] = [
  {
    slug: 'candy-ai-ai-girlfriend',
    name: 'Your AI Slut Is Ready',
    href: 'https://candy.ai',
    logo: '/assets/ainsfw/trending/candy.png',
  },
  {
    slug: 'celebmakerai-ai-image',
    name: 'AI NSFW Image Generator',
    href: 'https://celebmakerai.com',
    logo: '/assets/ainsfw/trending/celebmaker.png',
  },
  {
    slug: 'aislutbot-ai-nude-generator',
    name: 'Best Nude Generator',
    href: 'https://aislutbot.com',
    logo: '/assets/ainsfw/trending/aislutbot.png',
  },
  {
    slug: 'hornydreams-ai-ai-girlfriend',
    name: 'AI Companion',
    href: 'https://hornydreams.ai/?affiliate=erogramx',
    logo: '/assets/ainsfw/trending/hornydreams.png',
  },
  {
    slug: 'xmode-ai-nsfw-image-generator',
    name: 'Best undress AI',
    href: 'https://xmode.ai',
    logo: '/assets/ainsfw/trending/xmode.png',
  },
  {
    slug: 'fuckd-ai-ai-companion',
    name: 'AI Girlfriend',
    href: 'https://www.fuckd.ai/?campaign=erogramx',
    logo: '/assets/ainsfw/trending/fuckd.png',
  },
];

export function isOutboundToolHref(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}
