import type { ExploreSite } from '@/lib/explore/topPornSitesData';

/** Stable key for admin overrides and category ordering. */
export function exploreSiteKey(site: ExploreSite): string {
  if (site.url.startsWith('/porn-websites/')) {
    return site.url.slice('/porn-websites/'.length);
  }
  if (site.url.startsWith('/explore/') && !site.url.startsWith('/explore/sites/')) {
    return site.url.slice('/explore/'.length);
  }
  if (site.url.startsWith('/explore/sites/')) {
    return site.url.replace('/explore/sites/', '');
  }
  if (site.url.startsWith('/ainsfw/')) {
    return site.url.slice(1);
  }
  if (site.url.startsWith('/') && site.url.length > 1) {
    return site.url.slice(1);
  }
  return site.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function applySiteOrder(sites: ExploreSite[], siteKeys: string[]): ExploreSite[] {
  if (!siteKeys.length) return sites;
  const byKey = new Map(sites.map((site) => [exploreSiteKey(site), site]));
  const ordered: ExploreSite[] = [];
  for (const key of siteKeys) {
    const site = byKey.get(key);
    if (site) {
      ordered.push(site);
      byKey.delete(key);
    }
  }
  for (const site of byKey.values()) ordered.push(site);
  return ordered;
}
