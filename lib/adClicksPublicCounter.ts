import connectDB from '@/lib/db/mongodb';
import { SystemConfig } from '@/lib/models';

/** Live public promo/submit counter. Only goes up. */
export const AD_CLICKS_PUBLIC_KEY = 'ad_clicks_public_display';

type CounterState = { count: number; lifetime: number };

function parseState(raw: unknown, lifetimeClicks: number, floor: number): CounterState {
  if (raw && typeof raw === 'object' && 'count' in (raw as object)) {
    const o = raw as { count?: unknown; lifetime?: unknown };
    return {
      count: Number(o.count) || floor,
      lifetime: Number(o.lifetime) || lifetimeClicks,
    };
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    // Legacy plain number — lock lifetime anchor to current so we don't jump by full lifetime.
    return { count: raw, lifetime: lifetimeClicks };
  }
  return { count: floor, lifetime: lifetimeClicks };
}

/**
 * Sync the public display counter from REAL ad-network activity.
 *
 * Uses Campaign.clicks lifetime sum as the source of truth for "new clicks since last poll".
 * Every in-feed / OF / top-group / banner click increments Campaign.clicks in production TODAY,
 * so this moves even before any new bump code is deployed.
 *
 * Never goes down: max(stored, 30d floor) + new lifetime delta.
 */
export async function syncPublicAdClickCounter(lifetimeClicks: number, floor30d: number): Promise<number> {
  await connectDB();
  const doc = await SystemConfig.findOne({ key: AD_CLICKS_PUBLIC_KEY }).lean() as { value?: unknown } | null;
  const prev = parseState(doc?.value, lifetimeClicks, floor30d);

  const delta = Math.max(0, lifetimeClicks - prev.lifetime);
  const count = Math.max(prev.count, floor30d) + delta;

  await SystemConfig.findOneAndUpdate(
    { key: AD_CLICKS_PUBLIC_KEY },
    {
      key: AD_CLICKS_PUBLIC_KEY,
      value: { count, lifetime: lifetimeClicks } satisfies CounterState,
      lastUpdated: new Date(),
    },
    { upsert: true },
  );

  return count;
}
