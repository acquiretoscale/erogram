import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { PremiumPricing, StarsRate } from '@/lib/models';

const DEFAULT_PLANS = [
  { plan: 'monthly', starsPrice: 600, starsOriginalPrice: 3000, enabled: true, discountLabel: '80% OFF', bestseller: false },
  { plan: 'yearly', starsPrice: 3333, starsOriginalPrice: 16665, enabled: true, discountLabel: '80% OFF', bestseller: true },
  { plan: 'lifetime', starsPrice: 9999, starsOriginalPrice: 49995, enabled: false, discountLabel: '80% OFF', bestseller: false },
];

export async function GET() {
  try {
    await connectDB();

    let plans = await PremiumPricing.find({ enabled: true }).sort({ plan: 1 }).lean();

    if (!plans.length) {
      await PremiumPricing.insertMany(DEFAULT_PLANS);
      plans = await PremiumPricing.find({ enabled: true }).sort({ plan: 1 }).lean();
    }

    const latest = await StarsRate.findOne().sort({ fetchedAt: -1 }).lean() as any;
    const usdPerStar = latest?.usdtPerStar ?? 0.014;

    const result = (plans as any[]).map((p) => ({
      plan: p.plan,
      starsPrice: p.starsPrice,
      starsOriginalPrice: p.starsOriginalPrice,
      usdPrice: +(p.starsPrice * usdPerStar).toFixed(2),
      usdOriginalPrice: +(p.starsOriginalPrice * usdPerStar).toFixed(2),
      discountLabel: p.discountLabel,
      bestseller: p.bestseller,
    }));

    return NextResponse.json({ plans: result, usdPerStar });
  } catch (error: any) {
    console.error('Error fetching public pricing:', error);
    return NextResponse.json({ message: 'Failed to fetch pricing' }, { status: 500 });
  }
}
