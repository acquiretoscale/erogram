import { OF_CATEGORY_MAP } from '@/app/onlyfanssearch/constants';

/** Category slugs with 100+ free creators in DB (Jul 2026 scan). */
export const FREE_MAJOR_SLUGS = [
  'big-ass',
  'big-boobs',
  'ahegao',
  'joi',
  'blowjob',
  'goth',
  'alt',
  'tattoo',
  'twerk',
  'latina',
  'streamer',
  'blonde',
  'petite',
  'lesbian',
  'brunette',
  'amateur',
] as const;

export const FREE_MAJOR_SLUG_SET = new Set<string>(FREE_MAJOR_SLUGS);

export function isFreeMajorCategorySlug(slug: string): boolean {
  return FREE_MAJOR_SLUG_SET.has(slug);
}

export function parseBestFreeCategorySlug(routeSlug: string): string | null {
  if (!routeSlug.startsWith('free-')) return null;
  const catSlug = routeSlug.slice(5);
  if (!catSlug || !isFreeMajorCategorySlug(catSlug)) return null;
  return catSlug;
}

export function bestFreeCategoryPath(catSlug: string) {
  return `/onlyfanssearch/${catSlug}`;
}

export function getFreeMajorSubCategories() {
  return FREE_MAJOR_SLUGS.map((slug) => {
    const cat = OF_CATEGORY_MAP.get(slug);
    return {
      slug,
      label: cat?.name || slug,
      href: bestFreeCategoryPath(slug),
    };
  });
}
