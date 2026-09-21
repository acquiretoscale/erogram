export type AINSFWPlan = 'basic' | 'boost' | 'startup' | 'free';

export const AINSFW_PLAN_PRICES: Record<AINSFWPlan, number> = {
  basic: 97,
  boost: 197,
  startup: 297,
  free: 0,
};

export function ainsfwStarsAmount(plan: AINSFWPlan): number {
  const base = AINSFW_PLAN_PRICES[plan];
  if (base <= 0) return 0;
  return Math.round(base / 0.013);
}

export function isAINSFWPlan(value: string): value is AINSFWPlan {
  return value in AINSFW_PLAN_PRICES;
}
