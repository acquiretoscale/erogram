/**
 * Top-banner / homepage-hero page targeting.
 * Empty bannerPages on a campaign = show on every surface that fetches the slot.
 * Checking a box restricts the campaign to those surfaces only.
 */

export const BANNER_PAGES = [
  { value: 'homepage', label: 'Homepage' },
  { value: 'groups', label: 'Groups hub' },
  { value: 'group', label: 'Group pages' },
  { value: 'bots', label: 'Bots hub' },
  { value: 'bot', label: 'Bot pages' },
  { value: 'ainsfw', label: 'AI NSFW hub' },
  { value: 'ainsfw-page', label: 'AI NSFW pages' },
  { value: 'rankings', label: 'All ranking pages' },
  { value: 'ranking-ainsfw', label: 'Rankings — AI NSFW' },
  { value: 'ranking-groups', label: 'Rankings — Groups' },
  { value: 'ranking-bots', label: 'Rankings — Bots' },
  { value: 'ranking-explore', label: 'Rankings — Adult sites' },
  { value: 'ranking-onlyfans', label: 'Rankings — OnlyFans' },
  { value: 'onlyfans', label: 'OFsearch' },
  { value: 'articles', label: 'Articles' },
] as const;

export type BannerPageValue = (typeof BANNER_PAGES)[number]['value'];

export const BANNER_PAGE_LABEL: Record<string, string> = Object.fromEntries(
  BANNER_PAGES.map((p) => [p.value, p.label]),
);

/** Values stored on a campaign that should match a fetch for this page. */
export function bannerPageMatchValues(page: string): string[] {
  switch (page) {
    case 'group':
    case 'bot':
      return [page, 'join'];
    case 'ranking-ainsfw':
    case 'ranking-groups':
    case 'ranking-bots':
    case 'ranking-explore':
    case 'ranking-onlyfans':
      return [page, 'rankings'];
    default:
      return [page];
  }
}

export function rankingBannerPage(kind: 'ainsfw' | 'bots' | 'explore' | 'groups' | 'onlyfans'): string {
  if (kind === 'ainsfw') return 'ranking-ainsfw';
  if (kind === 'bots') return 'ranking-bots';
  if (kind === 'groups') return 'ranking-groups';
  if (kind === 'onlyfans') return 'ranking-onlyfans';
  return 'ranking-explore';
}
