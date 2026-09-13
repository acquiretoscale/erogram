/** Hero preview videos on AINSFW tool pages. Empty: listings use screenshot images only. */
export const AINSFW_TOOL_PREVIEW_VIDEOS: Record<string, { mp4: string; poster?: string }> = {};

export const AINSFW_REVIEW_EXAMPLE_VIDEOS: Record<string, { mp4: string; poster?: string }[]> = {};

export function getAinsfwToolPreviewVideo(
  _slug: string,
  _customUrl?: string,
): { mp4: string; poster?: string } | undefined {
  return undefined;
}
