/**
 * Placeholder image used when a bot/group/ad has no image or image fails to load.
 * SEO-friendly: avoids broken image icons; use descriptive alt text where this is shown.
 *
 * Set NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL to your R2 URL (e.g. after running
 * scripts/upload-placeholder-to-r2.mjs) to serve the placeholder from R2.
 */
const FALLBACK_PATH = '/assets/placeholder-no-image.png';

export const PLACEHOLDER_IMAGE_URL: string =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL) || FALLBACK_PATH;

/** For server-only code that can use R2_PUBLIC_URL when R2 is configured. */
export function getPlaceholderImageUrl(): string {
  const r2 = typeof process !== 'undefined' && process.env?.R2_PUBLIC_URL;
  if (r2) {
    const base = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
    return base ? `${base}/placeholders/no-image.png` : FALLBACK_PATH;
  }
  return typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL
    ? process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL
    : FALLBACK_PATH;
}
