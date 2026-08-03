import { OF_CATEGORIES } from '@/app/onlyfanssearch/constants';

export const USER_PLATFORMS = [
  { id: 'onlyfans', label: 'OnlyFans' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'ai', label: 'AI NSFW' },
] as const;

export type UserPlatformId = (typeof USER_PLATFORMS)[number]['id'];

export type InterestOption = { slug: string; name: string };

/** Always available on profile interests — categories + tag-only niches (even below tag index threshold). */
export const PROFILE_TAG_SLUGS: readonly string[] = [
  ...OF_CATEGORIES.map((c) => c.slug),
  'solo',
  'model',
  'custom',
  'natural',
  'fetish',
  'nude',
  'sexting',
  'mommy',
  'girlfriend',
  'toys',
  'instagram',
  'german',
  'greek',
  'moroccan',
  'french',
  'spanish',
  'japanese',
  'korean',
  'mexican',
  'asexual',
  'bulgarian',
  'caucasian',
  'couple-lesbian',
  'couple-straight',
  'croatian',
  'ecuadorian',
  'malaysian',
  'public-sex',
  'shower-sex',
  'singaporean',
  'slovak',
  'step-fantasy',
];

const PLATFORM_IDS = new Set(USER_PLATFORMS.map((p) => p.id));

export function sanitizeUserInterests(
  input: {
    preferredPlatforms?: string[];
    interests?: string[];
    aiInterests?: string[];
  },
  allowed: { tagSlugs: Set<string>; aiSlugs: Set<string> },
) {
  const preferredPlatforms = (input.preferredPlatforms || []).filter((p) =>
    PLATFORM_IDS.has(p as UserPlatformId),
  );
  const interests = (input.interests || []).filter((s) => allowed.tagSlugs.has(s));
  const aiInterests = (input.aiInterests || []).filter((s) => allowed.aiSlugs.has(s));
  return { preferredPlatforms, interests, aiInterests };
}

export function interestLabel(slug: string, catalog?: InterestOption[]): string {
  const hit = catalog?.find((c) => c.slug === slug);
  if (hit) return hit.name;
  return slug.replace(/-/g, ' ');
}
