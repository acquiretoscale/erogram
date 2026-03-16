import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';
import { getPremiumPricing, getStarsRate, usdToStars, starsToUsd, invalidatePricingCache } from '@/lib/premiumPricing';

export const dynamic = 'force-dynamic';

function enrichPlan(plan: any, rate: number) {
  const sa = typeof plan?.starsAmount === 'number' && plan.starsAmount > 0 ? plan.starsAmount : null;
  return {
    starsAmount: sa ?? usdToStars(plan?.priceUsd ?? 0, rate),
    priceUsd: sa ? starsToUsd(sa, rate) : (plan?.priceUsd ?? 0),
    days: plan?.days ?? 30,
    label: plan?.label ?? '',
    description: plan?.description ?? '',
  };
}

// Native MongoDB collection — bypasses Mongoose strict schema that strips starsAmount
async function getCollection() {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database not connected');
  return db.collection('premiumconfigs');
}

// Public GET
export async function GET() {
  try {
    invalidatePricingCache();
    const [pricing, rate] = await Promise.all([getPremiumPricing(), getStarsRate()]);

    return NextResponse.json({
      monthly: enrichPlan(pricing.monthly, rate),
      quarterly: enrichPlan(pricing.quarterly, rate),
      yearly: enrichPlan(pricing.yearly, rate),
      offerBadge: pricing.offerBadge,
      offerText: pricing.offerText,
      starsRate: rate,
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (err) {
    console.error('Error fetching premium config:', err);
    return NextResponse.json({
      monthly: { priceUsd: 12.97, days: 30, label: 'Erogram VIP (1 Month)', starsAmount: 865, description: '' },
      quarterly: { priceUsd: 19.97, days: 90, label: 'Erogram VIP (3 Months)', starsAmount: 1332, description: '' },
      yearly: { priceUsd: 29, days: 365, label: 'Erogram VIP (1 Year)', starsAmount: 1934, description: '' },
      offerBadge: '80% OFF',
      offerText: 'Launch price ends soon',
      starsRate: 0.015,
    });
  }
}

// Admin PUT — uses native MongoDB driver to bypass Mongoose's cached schema stripping starsAmount
export async function PUT(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user?.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const col = await getCollection();
    const rate = await getStarsRate();
    const setFields: Record<string, any> = {};

    for (const planKey of ['monthly', 'quarterly', 'yearly'] as const) {
      const raw = body[planKey];
      if (!raw) continue;

      const stars = typeof raw.starsAmount === 'number' ? raw.starsAmount : (typeof raw.starsAmount === 'string' ? parseInt(raw.starsAmount, 10) : null);
      const validStars = stars !== null && !isNaN(stars) && stars > 0 ? stars : null;
      const derivedUsd = validStars ? starsToUsd(validStars, rate) : (typeof raw.priceUsd === 'number' ? raw.priceUsd : 0);

      setFields[`${planKey}.starsAmount`] = validStars;
      setFields[`${planKey}.priceUsd`] = derivedUsd;
      setFields[`${planKey}.days`] = typeof raw.days === 'number' ? raw.days : 30;
      setFields[`${planKey}.label`] = typeof raw.label === 'string' ? raw.label : '';
      setFields[`${planKey}.description`] = typeof raw.description === 'string' ? raw.description : '';
    }

    if (body.offerBadge !== undefined) setFields.offerBadge = body.offerBadge;
    if (body.offerText !== undefined) setFields.offerText = body.offerText;
    setFields.updatedAt = new Date();

    console.log('[premium-config PUT] saving via native driver:', JSON.stringify(setFields, null, 2));

    await col.updateOne(
      { key: 'default' },
      { $set: setFields },
      { upsert: true }
    );

    const saved = await col.findOne({ key: 'default' });
    invalidatePricingCache();

    console.log('[premium-config PUT] VERIFIED in DB monthly.starsAmount:', saved?.monthly?.starsAmount);

    return NextResponse.json({
      ok: true,
      monthly: enrichPlan(saved?.monthly, rate),
      quarterly: enrichPlan(saved?.quarterly, rate),
      yearly: enrichPlan(saved?.yearly, rate),
      offerBadge: saved?.offerBadge ?? '80% OFF',
      offerText: saved?.offerText ?? 'Launch price ends soon',
      starsRate: rate,
    });
  } catch (err) {
    console.error('Error updating premium config:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
