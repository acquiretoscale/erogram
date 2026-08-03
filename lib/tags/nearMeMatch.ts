import { buildBrowseQualityMatch, buildSearchOrClauses, expandSearchQuery } from '@/lib/tags/ofSearchMatch';

/** ISO 3166-1 alpha-2 → creator signals (category slugs + text patterns). */
const COUNTRY_NEAR: Record<string, { slugs: string[]; patterns: string[] }> = {
  US: {
    slugs: ['usa', 'american'],
    patterns: ['usa', 'american', 'united states', 'miami', 'los angeles', 'california', 'texas', 'florida', 'las vegas', 'new york'],
  },
  GB: {
    slugs: ['uk', 'british'],
    patterns: ['uk', 'british', 'united kingdom', 'london', 'england', 'scotland'],
  },
  CA: {
    slugs: ['canada'],
    patterns: ['canada', 'canadian', 'toronto', 'vancouver', 'montreal'],
  },
  AU: {
    slugs: ['australia'],
    patterns: ['australia', 'australian', 'sydney', 'melbourne'],
  },
  DE: {
    slugs: ['germany', 'german'],
    patterns: ['germany', 'german', 'deutsch'],
  },
  FR: {
    slugs: ['france', 'french'],
    patterns: ['france', 'french', 'paris'],
  },
  ES: {
    slugs: ['spain', 'spanish'],
    patterns: ['spain', 'spanish', 'madrid', 'barcelona'],
  },
  IT: {
    slugs: ['italy'],
    patterns: ['italy', 'italian', 'rome', 'milan'],
  },
  BR: {
    slugs: ['brazil', 'brazilian', 'brasil'],
    patterns: ['brazil', 'brazilian', 'brasil', 'rio', 'são paulo', 'sao paulo'],
  },
  MX: {
    slugs: ['mexico', 'mexican'],
    patterns: ['mexico', 'mexican', 'cdmx'],
  },
  CO: {
    slugs: ['colombia', 'colombian'],
    patterns: ['colombia', 'colombian', 'bogota', 'medellin', 'cali'],
  },
  AR: {
    slugs: ['argentina'],
    patterns: ['argentina', 'argentinian', 'buenos aires'],
  },
  JP: {
    slugs: ['japan', 'japanese'],
    patterns: ['japan', 'japanese', 'tokyo', 'osaka'],
  },
  PH: {
    slugs: ['philippines'],
    patterns: ['philippines', 'filipina', 'filipino', 'manila'],
  },
  TH: {
    slugs: ['thailand', 'thai'],
    patterns: ['thailand', 'thai', 'bangkok'],
  },
  UA: {
    slugs: ['ukraine'],
    patterns: ['ukraine', 'ukrainian', 'kyiv', 'kiev'],
  },
  PL: {
    slugs: ['poland'],
    patterns: ['poland', 'polish', 'warsaw'],
  },
  NL: {
    slugs: ['netherlands'],
    patterns: ['netherlands', 'dutch', 'amsterdam'],
  },
  RO: {
    slugs: ['romania'],
    patterns: ['romania', 'romanian', 'bucharest'],
  },
  IN: {
    slugs: ['india'],
    patterns: ['india', 'indian', 'mumbai', 'delhi'],
  },
};

export const NEAR_ME_MIN_RESULTS = 8;

const COUNTRY_DISPLAY: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  BR: 'Brazil',
  MX: 'Mexico',
  CO: 'Colombia',
  AR: 'Argentina',
  JP: 'Japan',
  PH: 'Philippines',
  TH: 'Thailand',
  UA: 'Ukraine',
  PL: 'Poland',
  NL: 'Netherlands',
  RO: 'Romania',
  IN: 'India',
};

export const REGION_LABELS: Record<string, string> = {
  'north-america': 'North America',
  'south-america': 'South America',
  europe: 'Europe',
  oceania: 'Oceania',
  asia: 'Asia',
};

/** Countries mapped to region even when not in COUNTRY_NEAR. */
export const COUNTRY_TO_REGION: Record<string, string> = {
  US: 'north-america',
  CA: 'north-america',
  MX: 'north-america',
  BR: 'south-america',
  CO: 'south-america',
  AR: 'south-america',
  CL: 'south-america',
  PE: 'south-america',
  VE: 'south-america',
  EC: 'south-america',
  UY: 'south-america',
  PY: 'south-america',
  BO: 'south-america',
  GB: 'europe',
  DE: 'europe',
  FR: 'europe',
  ES: 'europe',
  IT: 'europe',
  PL: 'europe',
  NL: 'europe',
  UA: 'europe',
  RO: 'europe',
  IE: 'europe',
  SE: 'europe',
  NO: 'europe',
  DK: 'europe',
  FI: 'europe',
  BE: 'europe',
  AT: 'europe',
  CH: 'europe',
  PT: 'europe',
  GR: 'europe',
  CZ: 'europe',
  HU: 'europe',
  AU: 'oceania',
  NZ: 'oceania',
  JP: 'asia',
  PH: 'asia',
  TH: 'asia',
  IN: 'asia',
  KR: 'asia',
  TW: 'asia',
  SG: 'asia',
  MY: 'asia',
  ID: 'asia',
  VN: 'asia',
};

export const REGION_ORDER = ['north-america', 'south-america', 'europe', 'asia', 'oceania'] as const;

export function regionIdForCountry(countryCode: string): string | undefined {
  return COUNTRY_TO_REGION[countryCode.trim().toUpperCase()];
}

export function regionLabel(regionId: string): string {
  return REGION_LABELS[regionId] || regionId;
}

export function buildRegionNearMeMatch(regionId: string): Record<string, unknown> | null {
  const codes = Object.entries(COUNTRY_TO_REGION)
    .filter(([, region]) => region === regionId)
    .map(([cc]) => cc);
  const or: Record<string, unknown>[] = [];
  const slugSeen = new Set<string>();
  const patternSeen = new Set<string>();

  for (const cc of codes) {
    const country = COUNTRY_NEAR[cc];
    if (!country) continue;
    for (const slug of country.slugs) {
      if (slugSeen.has(slug)) continue;
      slugSeen.add(slug);
      const plan = expandSearchQuery(slug.replace(/-/g, ' '));
      if (plan) or.push(...buildSearchOrClauses(plan));
    }
    for (const phrase of country.patterns) {
      if (patternSeen.has(phrase)) continue;
      patternSeen.add(phrase);
      const re = new RegExp(escapeRegex(phrase), 'i');
      or.push({ location: re });
      or.push({ bio: re });
    }
  }

  if (!or.length) return null;
  return buildBrowseQualityMatch(or);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildNearMeCreatorMatch(countryCode?: string, city?: string) {
  const or: Record<string, unknown>[] = [];
  const cc = countryCode?.trim().toUpperCase();
  const country = cc ? COUNTRY_NEAR[cc] : undefined;

  if (country) {
    const slugSet = new Set(country.slugs);
    for (const slug of slugSet) {
      const plan = expandSearchQuery(slug.replace(/-/g, ' '));
      if (plan) or.push(...buildSearchOrClauses(plan));
    }
    for (const phrase of country.patterns) {
      const re = new RegExp(escapeRegex(phrase), 'i');
      or.push({ location: re });
      or.push({ bio: re });
    }
  }

  const cityTrim = city?.trim();
  if (cityTrim && cityTrim.length >= 2) {
    const re = new RegExp(escapeRegex(cityTrim), 'i');
    or.push({ location: re });
    or.push({ bio: re });
    or.push({ categories: re });
  }

  if (!or.length) return null;
  return buildBrowseQualityMatch(or);
}

export function nearMeAreaLabel(countryCode?: string, city?: string): string {
  const cityTrim = city?.trim();
  const cc = countryCode?.trim().toUpperCase();
  const countryName = cc && COUNTRY_DISPLAY[cc] ? COUNTRY_DISPLAY[cc] : cc || '';
  if (cityTrim && countryName) return `${cityTrim}, ${countryName}`;
  if (cityTrim) return cityTrim;
  return countryName;
}
