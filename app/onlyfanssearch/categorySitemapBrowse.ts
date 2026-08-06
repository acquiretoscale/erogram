import { BEST_OF_PAGES, type BestOfPage, bestOfBlogSlug } from '@/app/best-onlyfans-accounts/bestOfPages';

function bestRankingLinkTitle(label: string, year: number): string {
  return `10 Best ${label} OnlyFans Accounts & Creators (${year})`;
}

function top10RankingLinkTitle(label: string, year: number): string {
  return `Top 10 ${label} OnlyFans Models In ${year}`;
}

export interface CategorySitemapItem {
  slug: string;
  href: string;
  title: string;
}

export interface CategorySitemapSection {
  id: string;
  label: string;
  items: CategorySitemapItem[];
}

const CATEGORY_BLOCKS = [
  {
    id: 'body',
    label: 'Body type',
    slugs: [
      'big-ass',
      'big-boobs',
      'big-booty',
      'bbw',
      'busty',
      'chubby',
      'petite',
      'thick',
      'pawg',
      'pregnant',
      'fitness',
      'natural',
      'hairy',
      'shaved',
    ],
  },
  {
    id: 'kink',
    label: 'Kink / fetish',
    slugs: [
      'joi',
      'bdsm',
      'feet',
      'anal',
      'findom',
      'ahegao',
      'squirt',
      'femdom',
      'submissive',
      'bondage',
      'fetish',
      'latex',
      'dominatrix',
      'dick-rating',
      'oral',
      'toys',
      'step-fantasy',
    ],
  },
  {
    id: 'style',
    label: 'Style & look',
    slugs: [
      'goth',
      'goth-girl',
      'alt',
      'cosplay',
      'tattoo',
      'piercing',
      'e-girl',
      'anime',
      'catgirl',
      'bunny-girl',
      'maid',
      'lingerie',
      'bikini',
      'heels',
      'stockings',
      'blonde',
      'brunette',
      'redhead',
    ],
  },
  {
    id: 'creator',
    label: 'Creator type',
    slugs: [
      'amateur',
      'influencer',
      'celebrity',
      'streamer',
      'pornstar',
      'model',
      'gamer',
      'instagram',
      'dancer',
      'girl-next-door',
    ],
  },
  {
    id: 'age',
    label: 'Age & scenario',
    slugs: [
      'teen',
      'milf',
      'college',
      'college-girl',
      'mommy',
      'girlfriend',
      'neighbor',
      'nurse',
      'public-sex',
      'shower-sex',
      'yoga',
    ],
  },
  {
    id: 'content',
    label: 'Content & format',
    slugs: [
      'onlyfans-free',
      'no-ppv',
      'custom',
      'gfe',
      'sexting',
      'video-call',
      'live-show',
      'pov',
      'solo',
      'asmr',
      'roleplay',
      'nude',
      'topless',
    ],
  },
  {
    id: 'couples',
    label: 'Couples & orientation',
    slugs: ['couple', 'couple-lesbian', 'couple-straight', 'lesbian', 'bisexual', 'hotwife', 'threesome'],
  },
  {
    id: 'ethnicity',
    label: 'Ethnicity & culture',
    slugs: ['asian', 'ebony', 'latina', 'caucasian', 'hijabi', 'muslim', 'exotic'],
  },
] as const;

function toBestItem(page: BestOfPage): CategorySitemapItem {
  const year = new Date().getFullYear();
  return {
    slug: `${page.slug}-best`,
    href: `/best-onlyfans-accounts/${page.slug}`,
    title: bestRankingLinkTitle(page.label, year),
  };
}

function toTop10Item(page: BestOfPage): CategorySitemapItem {
  const year = new Date().getFullYear();
  return {
    slug: `${page.slug}-top10`,
    href: `/onlyfanssearch/${bestOfBlogSlug(page.slug)}`,
    title: top10RankingLinkTitle(page.label, year),
  };
}

function pagesForBlock(slugs: readonly string[]): BestOfPage[] {
  const nicheMap = new Map(BEST_OF_PAGES.filter((p) => p.type === 'niche').map((p) => [p.slug, p]));
  return slugs.map((slug) => nicheMap.get(slug)).filter(Boolean) as BestOfPage[];
}

export function getCategorySitemapSections(): CategorySitemapSection[] {
  const sections: CategorySitemapSection[] = [];

  for (const block of CATEGORY_BLOCKS) {
    const pages = pagesForBlock(block.slugs).sort((a, b) => a.label.localeCompare(b.label));
    if (pages.length === 0) continue;

    sections.push({
      id: `best-${block.id}`,
      label: `10 Best — ${block.label}`,
      items: pages.map(toBestItem),
    });
    sections.push({
      id: `top10-${block.id}`,
      label: `Top 10 — ${block.label}`,
      items: pages.map(toTop10Item),
    });
  }

  return sections;
}
