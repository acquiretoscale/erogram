export function ainsfwReviewAverage(reviews: { rating: number }[]): number {
  if (!reviews.length) return 0;
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  return Math.round((sum / reviews.length) * 100) / 100;
}

export function ainsfwReviewAverageLabel(avg: number): string {
  return (Math.round(avg * 10) / 10).toFixed(1);
}

/** Star index 1–5: full, half, or empty from decimal average (e.g. 4.9 → four full + one half). */
export function ainsfwStarTier(avg: number, star: number): 'full' | 'half' | 'empty' {
  if (avg >= star) return 'full';
  if (avg >= star - 0.5) return 'half';
  return 'empty';
}
