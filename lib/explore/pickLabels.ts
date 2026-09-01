export const PICK_LABELS = ['BEST CHOICE', 'RECOMMENDED', 'OUR PICK'] as const;

export type PickLabel = (typeof PICK_LABELS)[number];

export function pickLabelForFeaturedIndex(index: number): PickLabel {
  return PICK_LABELS[index % PICK_LABELS.length];
}

/** Stable varied label per category for the #1 pick (not random on every refresh). */
export function pickLabelForFirstPick(categorySlug: string): PickLabel {
  let hash = 0;
  for (let i = 0; i < categorySlug.length; i += 1) {
    hash = (hash * 31 + categorySlug.charCodeAt(i)) >>> 0;
  }
  return PICK_LABELS[hash % PICK_LABELS.length];
}
