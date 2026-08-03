export type AINSFWPlan = 'basic' | 'boost' | 'startup';

export const AINSFW_PLAN_PRICES: Record<AINSFWPlan, number> = {
  basic: 49,
  boost: 197,
  startup: 497,
};
