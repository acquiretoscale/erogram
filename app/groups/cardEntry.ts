/**
 * Entry animation disabled — cards starting at opacity 0 delayed LCP on mobile.
 * Kept as a no-op so existing call sites do not need rewiring.
 */
export function cardEntryProps(_isIndex: number): {
  className: string;
  style?: React.CSSProperties;
} {
  return { className: '' };
}
