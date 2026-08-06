import { BEST_OF_PAGE_MAP, getTopBestOfByType } from '@/app/best-onlyfans-accounts/bestOfPages';
import { OF_CATEGORY_MAP } from './constants';
import { buildCategoryDisplayCounts, bestOfOnlyCount } from '@/lib/tags/categoryDisplayCount';

export interface CategoryBrowseItem {
  slug: string;
  label: string;
  count?: number;
  href: string;
  flag?: string;
}

export interface CategoryBrowseSection {
  id: string;
  label: string;
  items: CategoryBrowseItem[];
}

export interface CountryBrowseRegion {
  id: string;
  label: string;
  items: CategoryBrowseItem[];
}

/** Section groupings — main/biggest categories, OnlyGuider-style. */
const SECTION_SLUGS = [
  { id: 'access', label: 'Access', slugs: ['onlyfans-free', 'no-ppv'] },
  { id: 'gender', label: 'Gender & Identity', slugs: ['lesbian'] },
  { id: 'age', label: 'Age', slugs: ['teen', 'milf', 'mature', 'student'] },
  {
    id: 'ethnicity',
    label: 'Ethnicity',
    slugs: ['asian', 'ebony', 'arab', 'latina', 'colombian', 'brazilian', 'british', 'persian'],
  },
  { id: 'hair', label: 'Hair', slugs: ['blonde', 'brunette', 'redhead'] },
  {
    id: 'body',
    label: 'Body type',
    slugs: ['big-boobs', 'big-ass', 'bbw', 'petite', 'curvy', 'thick', 'chubby', 'fitness', 'muscle', 'pregnant'],
  },
  {
    id: 'style',
    label: 'Style & look',
    slugs: ['goth', 'alt', 'cosplay', 'tattoo', 'piercing', 'influencer', 'celebrity', 'streamer', 'amateur', 'lingerie', 'pornstar'],
  },
  {
    id: 'specialty',
    label: 'Specialty / kink',
    slugs: [
      'joi',
      'bdsm',
      'feet',
      'anal',
      'asmr',
      'roleplay',
      'findom',
      'ahegao',
      'squirt',
      'twerk',
      'blowjob',
      'submissive',
      'couple',
      'femdom',
      'nurse',
      'teacher',
      'housewife',
    ],
  },
] as const;

export const OF_BROWSE_HOT_SLUGS = new Set([
  'teen',
  'asian',
  'big-boobs',
  'big-ass',
  'goth',
  'pornstar',
]);

const COUNTRY_FLAGS: Record<string, string> = {
  spanish: '🇪🇸',
  german: '🇩🇪',
  romanian: '🇷🇴',
  british: '🇬🇧',
  french: '🇫🇷',
  ukrainian: '🇺🇦',
  bulgarian: '🇧🇬',
  italian: '🇮🇹',
  polish: '🇵🇱',
  dutch: '🇳🇱',
  greek: '🇬🇷',
  czech: '🇨🇿',
  slovak: '🇸🇰',
  swedish: '🇸🇪',
  irish: '🇮🇪',
  norwegian: '🇳🇴',
  finnish: '🇫🇮',
  scottish: '🏴',
  russian: '🇷🇺',
  croatian: '🇭🇷',
  brazilian: '🇧🇷',
  argentinian: '🇦🇷',
  colombian: '🇨🇴',
  mexican: '🇲🇽',
  american: '🇺🇸',
  canadian: '🇨🇦',
  chilean: '🇨🇱',
  peruvian: '🇵🇪',
  ecuadorian: '🇪🇨',
  'puerto-rican': '🇵🇷',
  japanese: '🇯🇵',
  chinese: '🇨🇳',
  thai: '🇹🇭',
  taiwanese: '🇹🇼',
  'south-korean': '🇰🇷',
  korean: '🇰🇷',
  filipina: '🇵🇭',
  malaysian: '🇲🇾',
  singaporean: '🇸🇬',
  moroccan: '🇲🇦',
  hijabi: '🧕',
  muslim: '🌙',
  turkish: '🇹🇷',
  arab: '🌙',
  persian: '🇮🇷',
  australian: '🇦🇺',
  'new-zealand': '🇳🇿',
};

const COUNTRY_REGIONS = [
  {
    id: 'europe',
    label: 'Europe',
    slugs: [
      'spanish',
      'german',
      'romanian',
      'british',
      'french',
      'ukrainian',
      'bulgarian',
      'italian',
      'polish',
      'dutch',
      'greek',
      'czech',
      'slovak',
      'swedish',
      'irish',
      'norwegian',
      'finnish',
      'scottish',
      'russian',
      'croatian',
    ],
  },
  {
    id: 'americas',
    label: 'Americas',
    slugs: ['brazilian', 'argentinian', 'colombian', 'mexican', 'american', 'canadian', 'chilean', 'peruvian', 'ecuadorian', 'puerto-rican'],
  },
  {
    id: 'asia',
    label: 'Asia',
    slugs: ['japanese', 'chinese', 'thai', 'taiwanese', 'south-korean', 'korean', 'filipina', 'malaysian', 'singaporean'],
  },
  {
    id: 'mena',
    label: 'MENA & Africa',
    slugs: ['moroccan', 'turkish', 'arab', 'persian', 'hijabi', 'muslim'],
  },
  {
    id: 'oceania',
    label: 'Oceania',
    slugs: ['australian', 'new-zealand'],
  },
] as const;

function resolveBrowseItem(slug: string, displayCounts: Map<string, number>): CategoryBrowseItem | null {
  const page = BEST_OF_PAGE_MAP.get(slug);
  const count = displayCounts.get(slug) ?? bestOfOnlyCount(slug);
  if (page) {
    return {
      slug,
      label: page.label,
      count,
      href: `/best-onlyfans-accounts/${slug}`,
      flag: COUNTRY_FLAGS[slug],
    };
  }
  const cat = OF_CATEGORY_MAP.get(slug);
  if (cat) {
    return {
      slug,
      label: cat.name,
      count,
      href: `/onlyfanssearch/${slug}`,
      flag: COUNTRY_FLAGS[slug],
    };
  }
  return null;
}

function mapSlugs(slugs: readonly string[], displayCounts: Map<string, number>): CategoryBrowseItem[] {
  return slugs.map((slug) => resolveBrowseItem(slug, displayCounts)).filter(Boolean) as CategoryBrowseItem[];
}

function allSectionSlugs(): string[] {
  const slugs = new Set<string>();
  for (const section of SECTION_SLUGS) {
    for (const slug of section.slugs) slugs.add(slug);
  }
  for (const region of COUNTRY_REGIONS) {
    for (const slug of region.slugs) slugs.add(slug);
  }
  return [...slugs];
}

export async function getCategoryBrowseSections(): Promise<CategoryBrowseSection[]> {
  const displayCounts = await buildCategoryDisplayCounts(allSectionSlugs());
  return SECTION_SLUGS.map((section) => ({
    id: section.id,
    label: section.label,
    items: mapSlugs(section.slugs, displayCounts),
  })).filter((section) => section.items.length > 0);
}

export async function getCountryBrowseRegions(): Promise<CountryBrowseRegion[]> {
  const displayCounts = await buildCategoryDisplayCounts(allSectionSlugs());
  return COUNTRY_REGIONS.map((region) => ({
    id: region.id,
    label: region.label,
    items: mapSlugs(region.slugs, displayCounts),
  })).filter((region) => region.items.length > 0);
}

/** US state best-of pages that currently have matched creators (count > 0). */
export function getUsStateBrowseItems(): CategoryBrowseItem[] {
  return getTopBestOfByType('state', 50)
    .filter((page) => page.count > 0)
    .map((page) => ({
      slug: page.slug,
      label: page.label,
      count: page.count,
      href: `/best-onlyfans-accounts/${page.slug}`,
      flag: '🇺🇸',
    }));
}

export function formatBrowseCount(n?: number) {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}
