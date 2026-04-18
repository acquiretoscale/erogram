import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

export interface PlanConfig {
  priceUsd: number;
  starsAmount: number | null;
  days: number;
  label: string;
  description: string;
}

export interface PremiumPricing {
  monthly: PlanConfig;
  quarterly: PlanConfig;
  yearly: PlanConfig;
  lifetime: PlanConfig;
  offerBadge: string;
  offerText: string;
}

const DEFAULTS: PremiumPricing = {
  monthly: { priceUsd: 8.99, starsAmount: 600, days: 30, label: 'Erogram VIP (1 Month)', description: '30-day unlimited access — Secret Vault, bookmarks & more' },
  quarterly: { priceUsd: 13.49, starsAmount: 900, days: 90, label: 'Erogram VIP (3 Months)', description: '3-month unlimited access — Secret Vault, bookmarks & more' },
  yearly: { priceUsd: 29.99, starsAmount: 2000, days: 365, label: 'Erogram VIP (1 Year)', description: '1-year unlimited access — Secret Vault, bookmarks & more' },
  lifetime: { priceUsd: 197, starsAmount: 13000, days: 36500, label: 'Erogram VIP (Lifetime)', description: 'Lifetime unlimited access — Secret Vault, bookmarks & more' },
  offerBadge: '80% OFF',
  offerText: 'Launch price ends soon',
};

let cached: PremiumPricing | null = null;
let cachedAt = 0;
const TTL = 60_000;

export function invalidatePricingCache() {
  cached = null;
  cachedAt = 0;
}

export async function getPremiumPricing(): Promise<PremiumPricing> {
  if (cached && Date.now() - cachedAt < TTL) return cached;

  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return DEFAULTS;
    const doc = await db.collection('premiumconfigs').findOne({ key: 'default' }) as any;
    if (doc) {
      const pick = (def: PlanConfig, raw: any): PlanConfig => ({
        priceUsd: raw?.priceUsd ?? def.priceUsd,
        starsAmount: raw?.starsAmount ?? def.starsAmount,
        days: raw?.days ?? def.days,
        label: raw?.label ?? def.label,
        description: raw?.description ?? def.description,
      });
      cached = {
        monthly: pick(DEFAULTS.monthly, doc.monthly),
        quarterly: pick(DEFAULTS.quarterly, doc.quarterly),
        yearly: pick(DEFAULTS.yearly, doc.yearly),
        lifetime: pick(DEFAULTS.lifetime, doc.lifetime),
        offerBadge: doc.offerBadge ?? DEFAULTS.offerBadge,
        offerText: doc.offerText ?? DEFAULTS.offerText,
      };
    } else {
      cached = DEFAULTS;
    }
  } catch {
    cached = DEFAULTS;
  }

  cachedAt = Date.now();
  return cached!;
}

const VALID_PLANS = ['monthly', 'quarterly', 'yearly', 'lifetime'] as const;
export type ValidPlan = typeof VALID_PLANS[number];

export function isValidPlan(plan: string): plan is ValidPlan {
  return (VALID_PLANS as readonly string[]).includes(plan);
}

export function getPlanConfig(pricing: PremiumPricing, plan: ValidPlan): PlanConfig {
  return pricing[plan];
}

// Fetch live Stars-to-USD rate
let rateCache: { rate: number; at: number } | null = null;
const RATE_TTL = 300_000; // 5 min

export async function getStarsRate(): Promise<number> {
  if (rateCache && Date.now() - rateCache.at < RATE_TTL) return rateCache.rate;
  try {
    const res = await fetch('https://bes-dev.github.io/telegram_stars_rates/api.json', { method: 'GET', cache: 'no-store' });
    const d = await res.json();
    if (typeof d?.usdt_per_star === 'number' && Number.isFinite(d.usdt_per_star) && d.usdt_per_star > 0) {
      rateCache = { rate: d.usdt_per_star, at: Date.now() };
      return d.usdt_per_star;
    }
  } catch { /* fall through */ }
  return 0.015; // fallback
}

export function usdToStars(usd: number, ratePerStar: number): number {
  if (ratePerStar <= 0) return Math.ceil(usd / 0.015);
  return Math.ceil(usd / ratePerStar);
}

export function starsToUsd(stars: number, ratePerStar: number): number {
  const rate = ratePerStar > 0 ? ratePerStar : 0.015;
  return +(stars * rate).toFixed(2);
}
