export const STAR_RATE = 0.013;

export const SCALE_USD = 129;
export const SCALE_STARS = Math.round(SCALE_USD / STAR_RATE);

export type BoostEntityType = 'group' | 'bot';

export const BOOST_STARS: Record<BoostEntityType, { week: number; month: number }> = {
  group: { week: 2000, month: 5000 },
  bot: { week: 3000, month: 6000 },
};

export function starsToUsd(stars: number): number {
  return Math.round(stars * STAR_RATE * 100) / 100;
}

export function cryptoUsdFromStars(stars: number): number {
  return starsToUsd(stars);
}

export function boostStars(entityType: BoostEntityType, duration: 'week' | 'month'): number {
  return BOOST_STARS[entityType][duration];
}

export type BoostPaymentType = 'normal_listing' | 'instant_approval' | 'boost_week' | 'boost_month' | 'scale_month';

const STARS_BY_TYPE: Record<BoostPaymentType, number | null> = {
  normal_listing: 1000,
  instant_approval: 1500,
  boost_week: null,
  boost_month: null,
  scale_month: SCALE_STARS,
};

export function buildBoostPaymentUpdate(
  entity: { boostExpiresAt?: Date | string | null },
  type: BoostPaymentType,
  entityType: BoostEntityType,
  extras: { paidBoostStars?: number; lastPaymentChargeId?: string } = {},
  now = new Date(),
): Record<string, unknown> {
  const currentExpiry = entity.boostExpiresAt ? new Date(entity.boostExpiresAt) : null;
  const boostBase = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const update: Record<string, unknown> = { ...extras };

  const starsAmount =
    extras.paidBoostStars ??
    (type === 'boost_week'
      ? BOOST_STARS[entityType].week
      : type === 'boost_month'
        ? BOOST_STARS[entityType].month
        : type === 'scale_month'
          ? SCALE_STARS
          : STARS_BY_TYPE[type]);

  if (type === 'normal_listing') {
    update.paidBoost = true;
    if (starsAmount != null) update.paidBoostStars = starsAmount;
    return update;
  }

  if (type === 'instant_approval') {
    update.status = 'approved';
    update.paidBoost = true;
    if (starsAmount != null) update.paidBoostStars = starsAmount;
    return update;
  }

  if (type === 'boost_week' || type === 'boost_month' || type === 'scale_month') {
    const days = type === 'boost_week' ? 7 : 30;
    const boostExpiry = new Date(boostBase);
    boostExpiry.setDate(boostExpiry.getDate() + days);
    update.status = 'approved';
    update.featured = true;
    update.featuredAt = now;
    update.boosted = true;
    update.boostExpiresAt = boostExpiry;
    update.boostDuration = type === 'boost_week' ? '7d' : '30d';
    update.paidBoost = true;
    if (starsAmount != null) update.paidBoostStars = starsAmount;
    return update;
  }

  return update;
}

/** True only while an organic boost is live (paid history alone does not qualify). */
export function isListingBoostLive(entity: {
  boosted?: boolean;
  boostExpiresAt?: string | Date | null;
}): boolean {
  if (!entity.boosted) return false;
  if (!entity.boostExpiresAt) return true;
  return new Date(entity.boostExpiresAt) > new Date();
}

/** Verified badge = actively boosted listing, not expired paid customers. */
export function entityShowsVerifiedBadge(entity: {
  boosted?: boolean;
  boostExpiresAt?: string | Date | null;
}): boolean {
  return isListingBoostLive(entity);
}
