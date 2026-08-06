import { OF_CATEGORY_MAP } from '@/app/onlyfanssearch/constants';

export type InterestOption = { slug: string; name: string; count?: number };

/** Top creator category slugs for profile interests (live DB order, Aug 2026). */
export const PROFILE_OF_INTEREST_SLUGS: readonly string[] = [
  'big-ass',
  'big-boobs',
  'cosplay',
  'latina',
  'petite',
  'milf',
  'streamer',
  'blonde',
  'ahegao',
  'thick',
  'lesbian',
  'teen',
  'alt',
  'asian',
  'brunette',
  'feet',
  'goth',
  'lingerie',
  'anal',
  'redhead',
  'fitness',
  'squirt',
  'tattoo',
  'findom',
  'submissive',
  'joi',
  'amateur',
  'celebrity',
  'couple',
  'bbw',
  'blowjob',
  'colombian',
  'pornstar',
  'student',
  'bdsm',
  'ebony',
  'british',
  'roleplay',
  'brazilian',
  'twerk',
  'piercing',
  'nurse',
];

export function profileOfInterestLabel(slug: string): string {
  return OF_CATEGORY_MAP.get(slug)?.name || slug.replace(/-/g, ' ');
}

export function sanitizeUserInterests(
  input: {
    preferredPlatforms?: string[];
    interests?: string[];
    aiInterests?: string[];
  },
  allowed: { tagSlugs: Set<string> },
) {
  const interests = (input.interests || []).filter((s) => allowed.tagSlugs.has(s));
  return {
    preferredPlatforms: ['onlyfans'],
    interests,
    aiInterests: [] as string[],
  };
}

export function interestLabel(slug: string, catalog?: InterestOption[]): string {
  const hit = catalog?.find((c) => c.slug === slug);
  if (hit) return hit.name;
  return profileOfInterestLabel(slug);
}
