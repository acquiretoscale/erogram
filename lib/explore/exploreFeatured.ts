import type { ExploreCategory, ExploreSite } from '@/lib/explore/topPornSitesData';
import { exploreSiteListingPath } from '@/lib/explore/exploreSiteListings';

/** Featured site keys per category (matched against site name + url). Order = display order. */
const FEATURED_MATCHERS: Record<string, string[]> = {
  'best-premium-porn': ['faphouse'],
  'best-live-sex-cams': ['stripchat', 'jerkroulette', 'instacam'],
  'best-ai-porn-sites': ['clothoff', 'nudiva', 'genesis porn'],
  'best-vr-porn': ['stripchatvr'],
  'best-ai-companion-websites': ['ourdream'],
  'best-ai-porn-generator-sites': ['genesisporn', 'clothoff'],
  'best-live-asian-sex-cams': ['stripchat asian'],
  'best-free-cam-girl-video-sites': ['stripchat', 'instacam', 'jerkroulette'],
};

function siteHaystack(site: ExploreSite): string {
  return `${site.name} ${site.url} ${site.externalUrl ?? ''}`.toLowerCase();
}

function matchesPattern(site: ExploreSite, pattern: string): boolean {
  return siteHaystack(site).includes(pattern.toLowerCase());
}

const EXTRA_SITES: Record<string, ExploreSite[]> = {
  'best-free-cam-girl-video-sites': [
    {
      name: 'StripChat',
      url: exploreSiteListingPath('stripchat'),
      externalUrl: 'https://stripchat.com/',
    },
    {
      name: 'Instacam',
      url: exploreSiteListingPath('instacam'),
      externalUrl: 'https://instacams.com/',
    },
    {
      name: 'JerkRoulette',
      url: exploreSiteListingPath('jerkroulette'),
      externalUrl: 'https://www.jerkroulette.com/',
    },
  ],
  'best-ai-porn-generator-sites': [
    {
      name: 'Clothoff.net',
      url: '/ainsfw/clothoff-net-undress-ai',
      externalUrl: 'https://clothoff.app/r/erogrampro26',
      image:
        'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/ainsfw/clothoff-net-undress-ai.webp',
      openInNewTab: true,
    },
  ],
};

function mergeExtraSites(sites: ExploreSite[], categorySlug: string): ExploreSite[] {
  const extras = EXTRA_SITES[categorySlug];
  if (!extras?.length) return sites;

  const merged = [...sites];
  for (const extra of extras) {
    if (merged.some((site) => matchesPattern(site, extra.name.split('.')[0]))) continue;
    merged.push(extra);
  }
  return merged;
}

export function applyCategoryFeatured(category: ExploreCategory): ExploreCategory {
  const patterns = FEATURED_MATCHERS[category.slug];
  const withExtras = mergeExtraSites(category.sites, category.slug);
  if (!patterns?.length) return { ...category, sites: withExtras };

  const featured: ExploreSite[] = [];
  const rest: ExploreSite[] = [];
  const used = new Set<number>();

  for (const pattern of patterns) {
    const idx = withExtras.findIndex((site, i) => !used.has(i) && matchesPattern(site, pattern));
    if (idx < 0) continue;
    used.add(idx);
    featured.push({ ...withExtras[idx], featured: true });
  }

  withExtras.forEach((site, index) => {
    if (!used.has(index)) rest.push(site);
  });

  return { ...category, sites: [...featured, ...rest] };
}

export function applyExploreFeatured(categories: ExploreCategory[]): ExploreCategory[] {
  return categories.map(applyCategoryFeatured);
}
