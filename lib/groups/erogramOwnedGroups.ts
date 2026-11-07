/** Erogram.pro official announcements / main channel listing on /groups. */
export const EROGRAM_OFFICIAL_GROUP_SLUG = 'official-erogram-telegram-group';

/**
 * TGempire-owned channel listings (Featured block + excluded from Top Groups organic pool).
 * Prefer canonical slugs when duplicates exist (e.g. booty-bazaar over booty).
 */
export const EROGRAM_OWNED_GROUP_SLUGS: readonly string[] = [
  'instabaddies',
  'cumsluts',
  'booty-bazaar',
  'boobies',
  'pussy-palace',
  'anal-arcade',
  'throat-throne',
];

export const EROGRAM_TOP_GROUPS_PIN_SLOT_INDEX = 1;

export function isErogramOwnedGroupSlug(slug: string): boolean {
  const s = (slug || '').toLowerCase();
  return (
    s === EROGRAM_OFFICIAL_GROUP_SLUG ||
    EROGRAM_OWNED_GROUP_SLUGS.some((x) => x === s)
  );
}
