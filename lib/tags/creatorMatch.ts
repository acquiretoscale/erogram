import type { BestOfPage } from '@/app/best-onlyfans-accounts/bestOfPages';

const R2 = process.env.R2_PUBLIC_URL || '';

export function buildR2AvatarMatch() {
  if (!R2) return { $ne: '' as const };
  try {
    const host = new URL(R2).host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return { $regex: new RegExp(host, 'i') };
  } catch {
    return { $ne: '' as const };
  }
}

function buildKeywordRegex(patterns: string[]) {
  const hasRegexSyntax = patterns.some((p) => p.includes('\\b') || p.includes('\\'));
  if (hasRegexSyntax) {
    return new RegExp(`(${patterns.join('|')})`, 'i');
  }
  const esc = patterns.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(${esc.join('|')})`, 'i');
}

const MAX_CATEGORIES = 4;
export const creatorQualityFilter = {
  avatar: buildR2AvatarMatch(),
  gender: 'female',
  deleted: { $ne: true },
  $expr: { $lte: [{ $size: { $ifNull: ['$categories', []] } }, MAX_CATEGORIES] },
};

export function buildBestOfCreatorMatch(page: BestOfPage): Record<string, unknown> {
  const base: Record<string, unknown> = { ...creatorQualityFilter };

  if (page.match === 'category' && page.categorySlug) {
    base.categories = page.categorySlug;
    return base;
  }

  if (page.patterns?.length) {
    const regex = buildKeywordRegex(page.patterns);
    base.$or = [
      { bio: regex },
      { categories: regex },
      { name: regex },
      { username: regex },
      { location: regex },
    ];
  }

  return base;
}

export function buildSlugCreatorMatch(slug: string): Record<string, unknown> {
  return {
    ...creatorQualityFilter,
    categories: slug,
  };
}
