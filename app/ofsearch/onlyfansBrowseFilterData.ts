import { BEST_OF_PAGE_MAP, getTopBestOfByType } from '@/app/best-onlyfans-accounts/bestOfPages';
import { rankingEnglishPublicPath } from '@/lib/bestOfPageContent/hottestUrls';
import { OF_CATEGORY_MAP } from './constants';

export interface BrowseFilterItem {
  slug: string;
  label: string;
  href: string;
  flag?: string;
}

export interface BrowseFilterGroup {
  id: string;
  label: string;
  items: BrowseFilterItem[];
}

const CATEGORY_TABS = [
  { id: 'age', label: 'Age', slugs: ['teen', 'milf', 'mature', 'student'] },
  { id: 'ethnicity', label: 'Ethnicity', slugs: ['asian', 'latina', 'ebony', 'arab', 'colombian', 'brazilian', 'british'] },
  { id: 'hair', label: 'Hair', slugs: ['blonde', 'brunette', 'redhead'] },
  { id: 'body', label: 'Body type', slugs: ['petite', 'big-ass', 'big-boobs', 'curvy', 'thick', 'bbw', 'chubby', 'muscle'] },
  {
    id: 'style',
    label: 'Style & look',
    slugs: ['goth', 'alt', 'cosplay', 'lingerie', 'tattoo', 'piercing', 'fitness', 'influencer', 'celebrity', 'streamer', 'amateur'],
  },
  {
    id: 'specialty',
    label: 'Specialty / kink',
    slugs: ['joi', 'bdsm', 'feet', 'anal', 'asmr', 'roleplay', 'findom', 'ahegao', 'squirt', 'twerk', 'blowjob', 'submissive', 'nurse', 'teacher', 'housewife', 'pregnant', 'pornstar', 'no-ppv', 'couple', 'lesbian'],
  },
] as const;

/** Hero filter silos — order: price (separate), hair, age, appearance, kink */
export const HERO_FILTER_SILO_DEFS = [
  { id: 'hair', label: 'Hair color', slugs: ['blonde', 'brunette', 'redhead'] },
  { id: 'age', label: 'Age', slugs: ['teen', 'milf', 'mature', 'student'] },
  {
    id: 'appearance',
    label: 'Appearance',
    slugs: [
      'asian', 'latina', 'ebony', 'arab', 'colombian', 'brazilian', 'british',
      'petite', 'big-ass', 'big-boobs', 'curvy', 'thick', 'bbw', 'chubby', 'muscle',
      'goth', 'alt', 'cosplay', 'lingerie', 'tattoo', 'piercing', 'fitness', 'influencer', 'celebrity', 'streamer', 'amateur',
    ],
  },
  {
    id: 'kink',
    label: 'Kink',
    slugs: [
      'joi', 'bdsm', 'feet', 'anal', 'asmr', 'roleplay', 'findom', 'ahegao', 'squirt', 'twerk', 'blowjob', 'submissive', 'nurse', 'teacher', 'housewife', 'pregnant', 'pornstar', 'no-ppv', 'couple', 'lesbian',
    ],
  },
] as const;

export function getHeroFilterSilos(): { id: string; label: string; items: BrowseFilterItem[] }[] {
  return HERO_FILTER_SILO_DEFS.map((silo) => ({
    id: silo.id,
    label: silo.label,
    items: mapSlugs(silo.slugs),
  })).filter((s) => s.items.length > 0);
}

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
  turkish: '🇹🇷',
  arab: '🌙',
  persian: '🇮🇷',
  australian: '🇦🇺',
  'new-zealand': '🇳🇿',
};

function bestHref(slug: string) {
  return rankingEnglishPublicPath(slug, 'best');
}

function labelForSlug(slug: string): string {
  const page = BEST_OF_PAGE_MAP.get(slug);
  if (page) return page.label;
  const cat = OF_CATEGORY_MAP.get(slug);
  if (cat) return cat.name;
  return slug;
}

function mapSlugs(slugs: readonly string[]): BrowseFilterItem[] {
  return slugs
    .map((slug) => {
      if (!BEST_OF_PAGE_MAP.has(slug) && !OF_CATEGORY_MAP.has(slug)) return null;
      return {
        slug,
        label: labelForSlug(slug),
        href: bestHref(slug),
        flag: COUNTRY_FLAGS[slug],
      };
    })
    .filter(Boolean) as BrowseFilterItem[];
}

export function getOnlyFansBrowseFilterGroups(): BrowseFilterGroup[] {
  const groups: BrowseFilterGroup[] = CATEGORY_TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    items: mapSlugs(tab.slugs),
  })).filter((g) => g.items.length > 0);

  const countries = getTopBestOfByType('country', 200)
    .filter((p) => p.count > 0)
    .map((p) => ({
      slug: p.slug,
      label: p.label,
      href: bestHref(p.slug),
      flag: COUNTRY_FLAGS[p.slug],
    }));

  if (countries.length) {
    groups.push({ id: 'country', label: 'Country', items: countries });
  }

  const states = getTopBestOfByType('state', 50)
    .filter((p) => p.count > 0)
    .map((p) => ({
      slug: p.slug,
      label: p.label,
      href: bestHref(p.slug),
      flag: '🇺🇸',
    }));

  if (states.length) {
    groups.push({ id: 'states', label: 'US States', items: states });
  }

  return groups;
}

/** Homepage spotlight countries — same slugs/labels as legacy country grid. */
export const HOMEPAGE_COUNTRY_SLUGS = [
  'american',
  'british',
  'canadian',
  'spanish',
  'german',
  'french',
  'colombian',
  'australian',
  'ukrainian',
] as const;

export function getHomepageCountryItems(): BrowseFilterItem[] {
  return HOMEPAGE_COUNTRY_SLUGS.map((slug) => {
    const page = BEST_OF_PAGE_MAP.get(slug);
    if (!page || page.count === 0) return null;
    return {
      slug,
      label: page.label,
      href: bestHref(slug),
      flag: COUNTRY_FLAGS[slug],
    };
  }).filter(Boolean) as BrowseFilterItem[];
}
