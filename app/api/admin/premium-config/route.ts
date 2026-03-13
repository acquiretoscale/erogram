import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import connectDB from '@/lib/db/mongodb';
import { PremiumConfig } from '@/lib/models';
import { getPremiumPricing, getStarsRate, usdToStars, invalidatePricingCache } from '@/lib/premiumPricing';

// Force Next.js to treat this as a dynamic route (never static-cache)
export const dynamic = 'force-dynamic';

// Public GET — returns pricing + live Stars conversion
export async function GET() {
  try {
    const [pricing, rate] = await Promise.all([getPremiumPricing(), getStarsRate()]);

    return NextResponse.json({
      monthly: { ...pricing.monthly, starsAmount: usdToStars(pricing.monthly.priceUsd, rate) },
      quarterly: { ...pricing.quarterly, starsAmount: usdToStars(pricing.quarterly.priceUsd, rate) },
      yearly: { ...pricing.yearly, starsAmount: usdToStars(pricing.yearly.priceUsd, rate) },
      offerBadge: pricing.offerBadge,
      offerText: pricing.offerText,
      starsRate: rate,
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (err) {
    console.error('Error fetching premium config:', err);
    return NextResponse.json({
      monthly: { priceUsd: 12.97, days: 30, label: 'Erogram VIP (1 Month)', starsAmount: 865 },
      quarterly: { priceUsd: 19.97, days: 90, label: 'Erogram VIP (3 Months)', starsAmount: 1332 },
      yearly: { priceUsd: 29, days: 365, label: 'Erogram VIP (1 Year)', starsAmount: 1934 },
      offerBadge: '80% OFF',
      offerText: 'Launch price ends soon',
      starsRate: 0.015,
    });
  }
}

// Admin PUT — update pricing
export async function PUT(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user?.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    await connectDB();

    const update: Record<string, any> = {};
    if (body.monthly) update.monthly = body.monthly;
    if (body.quarterly) update.quarterly = body.quarterly;
    if (body.yearly) update.yearly = body.yearly;
    if (body.offerBadge !== undefined) update.offerBadge = body.offerBadge;
    if (body.offerText !== undefined) update.offerText = body.offerText;

    const config = await PremiumConfig.findOneAndUpdate(
      { key: 'default' },
      { $set: update },
      { new: true, upsert: true }
    ).lean();

    // Bust the server-side in-memory cache so the next GET reads fresh from DB
    invalidatePricingCache();

    return NextResponse.json({ ok: true, config });
  } catch (err) {
    console.error('Error updating premium config:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
