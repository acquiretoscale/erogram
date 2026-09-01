const MASCOT_COUNT = 12;

/** Cloudflare R2 — immutable WebP mascots (~4–6KB each). */
const EXPLORE_MASCOT_CDN = (
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_R2_PUBLIC_URL
    ? process.env.NEXT_PUBLIC_R2_PUBLIC_URL.replace(/\/$/, '')
    : 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev'
);

export function exploreMascotSrc(categoryIndex: number): string {
  const n = ((categoryIndex % MASCOT_COUNT) + MASCOT_COUNT) % MASCOT_COUNT;
  const file = `mascot-${String(n + 1).padStart(2, '0')}.webp`;
  return `${EXPLORE_MASCOT_CDN}/explore/mascots/${file}`;
}

/** Local fallback if CDN fails in dev. */
export function exploreMascotFallbackSrc(categoryIndex: number): string {
  const n = ((categoryIndex % MASCOT_COUNT) + MASCOT_COUNT) % MASCOT_COUNT;
  return `/assets/explore/mascots/mascot-${String(n + 1).padStart(2, '0')}.webp`;
}
