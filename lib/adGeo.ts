import { parseCountryCode } from '@/lib/utils/geo';

export type GeoCampaignSlice = { campaign: any; placement: string };

const LOCALE_AD_COUNTRY: Record<string, string> = {
  de: 'DE',
};

export function normalizeVisitorCountry(code?: string | null): string | undefined {
  return parseCountryCode(code ?? undefined);
}

export function countryFromSiteLocale(locale?: string | null): string | undefined {
  if (!locale) return undefined;
  return LOCALE_AD_COUNTRY[locale.toLowerCase()];
}

export function countryFromPublicPath(pathname?: string | null): string | undefined {
  if (!pathname) return undefined;
  if (pathname === '/de' || pathname.startsWith('/de/')) return 'DE';
  return undefined;
}

/**
 * GEO TARGETING — a visitor can match by MORE THAN ONE country signal:
 *   1. real IP country (DE/NL travellers, VPN)
 *   2. site version they landed on (/de/ = DE)
 * Ad shows if ANY of the visitor's countries is in its target list.
 * A US-version visitor on a non-DE IP has NO DE signal, so DE ads never show to them.
 */
export function getVisitorCountriesForAds(opts: {
  ipCountry?: string | null;
  locale?: string | null;
  pathname?: string | null;
}): string[] {
  const set = new Set<string>();
  const ip = normalizeVisitorCountry(opts.ipCountry);
  if (ip) set.add(ip);
  const fromLocale = countryFromSiteLocale(opts.locale);
  if (fromLocale) set.add(fromLocale);
  const fromPath = countryFromPublicPath(opts.pathname);
  if (fromPath) set.add(fromPath);
  return Array.from(set);
}

export function normalizeTargetCountries(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    const cc = parseCountryCode(String(item));
    if (cc && !out.includes(cc)) out.push(cc);
  }
  return out;
}

export function getCampaignTargetCountries(campaign: any): string[] {
  return normalizeTargetCountries(campaign?.targetCountries);
}

function toCountryList(visitor?: string | string[]): string[] {
  if (!visitor) return [];
  const arr = Array.isArray(visitor) ? visitor : [visitor];
  const out: string[] = [];
  for (const v of arr) {
    const cc = normalizeVisitorCountry(v);
    if (cc && !out.includes(cc)) out.push(cc);
  }
  return out;
}

/**
 * Empty targetCountries = worldwide.
 * Restricted ads show when ANY of the visitor's country signals (IP + site version) matches.
 * Hidden when the visitor has no matching signal.
 */
export function campaignMatchesVisitorGeo(campaign: any, visitor?: string | string[]): boolean {
  const targets = getCampaignTargetCountries(campaign);
  if (targets.length === 0) return true;
  const ccs = toCountryList(visitor);
  if (ccs.length === 0) return false;
  return ccs.some((cc) => targets.includes(cc));
}

export function isGeoPinnedCampaign(campaign: any): boolean {
  return Boolean(campaign?.geoPinned) && getCampaignTargetCountries(campaign).length > 0;
}

/** Matched geo-pinned ad owns the placement pool (no rotation). */
export function applyGeoToPlacementPool(
  pool: GeoCampaignSlice[],
  visitor?: string | string[],
): GeoCampaignSlice[] {
  if (pool.length === 0) return pool;
  const pinned = pool.filter(
    (v) => isGeoPinnedCampaign(v.campaign) && campaignMatchesVisitorGeo(v.campaign, visitor),
  );
  if (pinned.length > 0) {
    const sorted = [...pinned].sort((a, b) => {
      if (a.campaign.priority === 'boost' && b.campaign.priority !== 'boost') return -1;
      if (b.campaign.priority === 'boost' && a.campaign.priority !== 'boost') return 1;
      const at = new Date(a.campaign.createdAt || 0).getTime();
      const bt = new Date(b.campaign.createdAt || 0).getTime();
      return bt - at;
    });
    return [sorted[0]];
  }
  return pool.filter((v) => campaignMatchesVisitorGeo(v.campaign, visitor));
}

export function readVisitorCountryCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(/(?:^|;\s*)__ero_cc=([^;]+)/);
  return normalizeVisitorCountry(m?.[1]);
}

/** Browser: real IP country (cookie) + current site version (/de/). */
export function readVisitorCountriesForAds(): string[] {
  if (typeof window === 'undefined') return [];
  return getVisitorCountriesForAds({
    ipCountry: readVisitorCountryCookie(),
    pathname: window.location.pathname,
  });
}

