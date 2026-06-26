// Blog categories — single source of truth for the /blog section.
// Slugs are SEO-stable and must never change once live.

export interface BlogCategory {
  slug: string;
  name: string;
  /** Short uppercase eyebrow label shown above cards */
  eyebrow: string;
  /** SEO meta title for the category hub */
  metaTitle: string;
  /** SEO meta description for the category hub */
  metaDescription: string;
  /** One-line tagline shown under the category heading */
  tagline: string;
}

export const BLOG_CATEGORIES: BlogCategory[] = [
  {
    slug: 'ai-nsfw',
    name: 'AI & the Machine',
    eyebrow: 'AI & The Machine',
    metaTitle: 'AI & the Machine — NSFW AI Guides | Erogram Editorial',
    metaDescription:
      'Deep dives on AI companions, image generators, undress bots, and the tools quietly rewriting adult content.',
    tagline: 'AI companions, generators, and the tools rewriting adult content.',
  },
  {
    slug: 'onlyfans-creators',
    name: 'Creators & OnlyFans',
    eyebrow: 'Creators & OnlyFans',
    metaTitle: 'Creators & OnlyFans — Rankings & Profiles | Erogram Editorial',
    metaDescription:
      'Curated creator lists, rankings, and the business of OnlyFans — reported honestly from the Erogram desk.',
    tagline: 'Rankings, profiles, and the business of OnlyFans.',
  },
  {
    slug: 'adult-entertainment',
    name: 'The Scene',
    eyebrow: 'The Scene',
    metaTitle: 'The Scene — Adult Culture & Features | Erogram Editorial',
    metaDescription:
      'Features, investigations, and culture from across the adult entertainment world.',
    tagline: 'Features, investigations, and culture from across the adult web.',
  },
  {
    slug: 'telegram-groups-bots',
    name: 'Telegram',
    eyebrow: 'Telegram',
    metaTitle: 'Telegram NSFW Groups & Bots Guides | Erogram Editorial',
    metaDescription:
      'Everything about NSFW Telegram groups and bots — finding safe channels, avoiding scams, using the best adult Telegram tools.',
    tagline: 'Finding, joining, and running the best adult Telegram channels.',
  },
];

export const BLOG_CATEGORY_SLUGS = BLOG_CATEGORIES.map((c) => c.slug);

export const BLOG_CATEGORY_MAP: Record<string, BlogCategory> = Object.fromEntries(
  BLOG_CATEGORIES.map((c) => [c.slug, c])
);

export function getBlogCategory(slug: string): BlogCategory | undefined {
  return BLOG_CATEGORY_MAP[slug];
}

export const DEFAULT_BLOG_CATEGORY = 'adult-entertainment';
