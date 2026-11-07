/** Ad A/B rotation only: scraped avatar + dedicated test images — not profile feed extras. */
export function buildFullAdRotationAlbum(
  avatar?: string | null,
  adRotationPhotos?: string[] | null,
): string[] {
  return [avatar, ...((adRotationPhotos as string[]) || [])].filter(Boolean);
}
