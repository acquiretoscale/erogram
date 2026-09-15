import { EXPLORE_CATEGORIES } from '@/lib/explore/topPornSitesData';
import { getBestAiToolMetaDescription } from '@/lib/bestAiNsfwTools/metaDescriptions';

export type DirectoryKind = 'ainsfw' | 'bots' | 'explore';
export type DirectoryMatch =
  | 'all-ainsfw'
  | 'ai-girlfriend'
  | 'undress-ai'
  | 'ai-porn-generator'
  | 'bots-undress'
  | 'bots-girlfriend'
  | 'explore';

export type DirectoryPageConfig = {
  slug: string;
  homeTitle: string;
  homeDescription: string;
  label: string;
  kind: DirectoryKind;
  match: DirectoryMatch;
  exploreSourceSlug?: string;
  browseHref: string;
};

function explore(slug: string) {
  const category = EXPLORE_CATEGORIES.find((entry) => entry.slug === slug);
  return {
    title: category?.title || '',
    description: category?.description || '',
  };
}

const liveAsian = explore('best-live-asian-sex-cams');
const vr = explore('best-vr-porn');
const premium = explore('best-premium-porn');
const liveCams = explore('best-live-sex-cams');
const premiumAsian = explore('best-premium-asian-porn-sites');
const asianPorn = explore('best-asian-porn-sites');
const uncensoredJav = explore('best-uncensored-jav-porn-websites');

export const DIRECTORY_PAGES: DirectoryPageConfig[] = [
  {
    slug: 'best-ainsfw',
    homeTitle: 'Best AINSFW',
    homeDescription: '',
    label: 'AI NSFW',
    kind: 'ainsfw',
    match: 'all-ainsfw',
    browseHref: '/ainsfw',
  },
  {
    slug: 'best-ai-girlfriend',
    homeTitle: 'Best AI girlfriend',
    homeDescription: '',
    label: 'AI Girlfriend',
    kind: 'ainsfw',
    match: 'ai-girlfriend',
    browseHref: '/ainsfw',
  },
  {
    slug: 'best-undress-ai',
    homeTitle: 'Best undress AI',
    homeDescription: '',
    label: 'Undress AI',
    kind: 'ainsfw',
    match: 'undress-ai',
    browseHref: '/ainsfw',
  },
  {
    slug: 'best-ai-porn-generator',
    homeTitle: 'Best AI Porn generator',
    homeDescription: '',
    label: 'AI Porn Generator',
    kind: 'ainsfw',
    match: 'ai-porn-generator',
    browseHref: '/ainsfw',
  },
  {
    slug: 'best-undress-telegram-bots',
    homeTitle: 'Undress',
    homeDescription: '',
    label: 'Undress AI',
    kind: 'bots',
    match: 'bots-undress',
    browseHref: '/bots',
  },
  {
    slug: 'best-ai-girlfriend-telegram-bots',
    homeTitle: 'AI girlfriend',
    homeDescription: '',
    label: 'AI Girlfriend',
    kind: 'bots',
    match: 'bots-girlfriend',
    browseHref: '/bots',
  },
  {
    slug: 'best-vr-porn',
    homeTitle: vr.title,
    homeDescription: vr.description,
    label: 'VR Porn',
    kind: 'explore',
    match: 'explore',
    exploreSourceSlug: 'best-vr-porn',
    browseHref: '/best-porn',
  },
  {
    slug: 'best-premium-porn',
    homeTitle: premium.title,
    homeDescription: premium.description,
    label: 'Premium Porn',
    kind: 'explore',
    match: 'explore',
    exploreSourceSlug: 'best-premium-porn',
    browseHref: '/best-porn',
  },
  {
    slug: 'best-live-sex-cams',
    homeTitle: liveCams.title,
    homeDescription: liveCams.description,
    label: 'Live Sex Cams',
    kind: 'explore',
    match: 'explore',
    exploreSourceSlug: 'best-live-sex-cams',
    browseHref: '/best-porn',
  },
  {
    slug: 'best-asian-sex-cams',
    homeTitle: 'Best asian sex cams',
    homeDescription: liveAsian.description,
    label: 'Asian Sex Cams',
    kind: 'explore',
    match: 'explore',
    exploreSourceSlug: 'best-live-asian-sex-cams',
    browseHref: '/best-porn',
  },
  {
    slug: 'best-premium-asian-porn-sites',
    homeTitle: premiumAsian.title,
    homeDescription: premiumAsian.description,
    label: 'Premium Asian Porn Sites',
    kind: 'explore',
    match: 'explore',
    exploreSourceSlug: 'best-premium-asian-porn-sites',
    browseHref: '/best-porn',
  },
  {
    slug: 'best-asian-porn-sites',
    homeTitle: asianPorn.title,
    homeDescription: asianPorn.description,
    label: 'Asian Porn Sites',
    kind: 'explore',
    match: 'explore',
    exploreSourceSlug: 'best-asian-porn-sites',
    browseHref: '/best-porn',
  },
  {
    slug: 'best-uncensored-jav-porn-websites',
    homeTitle: uncensoredJav.title,
    homeDescription: uncensoredJav.description,
    label: 'Uncensored Jav Porn websites',
    kind: 'explore',
    match: 'explore',
    exploreSourceSlug: 'best-uncensored-jav-porn-websites',
    browseHref: '/best-porn',
  },
];

export const HOME_DIRECTORY_GROUPS: { heading?: string; slugs: string[] }[] = [
  {
    slugs: ['best-ainsfw', 'best-ai-girlfriend', 'best-undress-ai', 'best-ai-porn-generator'],
  },
  {
    heading: 'Best Telegram bots',
    slugs: ['best-undress-telegram-bots', 'best-ai-girlfriend-telegram-bots'],
  },
  {
    heading: 'Best Adult websites',
    slugs: [
      'best-vr-porn',
      'best-premium-porn',
      'best-live-sex-cams',
      'best-asian-sex-cams',
      'best-premium-asian-porn-sites',
      'best-asian-porn-sites',
      'best-uncensored-jav-porn-websites',
    ],
  },
];

const FEATURED_HOME_PREVIEWS = new Set([
  'best-ainsfw',
  'best-ai-girlfriend',
  'best-undress-ai',
  'best-ai-porn-generator',
  'best-undress-telegram-bots',
  'best-ai-girlfriend-telegram-bots',
  'best-premium-porn',
  'best-live-sex-cams',
  'best-vr-porn',
]);

export const HOME_FEATURED_PREVIEW = 10;
export const HOME_DEFAULT_PREVIEW = 10;
export const RANKING_LIMIT = 30;

export function directoryPageFromSlug(slug: string): DirectoryPageConfig | undefined {
  return DIRECTORY_PAGES.find((page) => page.slug === slug);
}

export function homePreviewLimit(slug: string): number {
  return FEATURED_HOME_PREVIEWS.has(slug) ? HOME_FEATURED_PREVIEW : HOME_DEFAULT_PREVIEW;
}

export function directoryMetaDescription(page: DirectoryPageConfig, year: number): string {
  if (page.kind === 'explore' && page.homeDescription) return page.homeDescription;
  if (page.match === 'ai-girlfriend') {
    return getBestAiToolMetaDescription('ai-girlfriend', 'en') || '';
  }
  if (page.match === 'undress-ai') {
    return getBestAiToolMetaDescription('undress-ai', 'en') || '';
  }
  if (page.match === 'ai-porn-generator') {
    return getBestAiToolMetaDescription('ai-porn-generator', 'en') || '';
  }
  if (page.kind === 'ainsfw') {
    return `Discover the top 30 best ${page.label.toLowerCase()} tools in ${year}. Curated, ranked list of the most popular adult AI tools.`;
  }
  return `Discover the top 30 best ${page.label.toLowerCase()} Telegram bots in ${year}. Curated, ranked list of the most popular and active adult bots.`;
}
