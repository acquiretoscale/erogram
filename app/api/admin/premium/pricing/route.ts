import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, PremiumPricing, StarsRate } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    return user?.isAdmin ? user : null;
  } catch {
    return null;
  }
}

const DEFAULT_PLANS = [
  { plan: 'monthly', starsPrice: 600, starsOriginalPrice: 3000, enabled: true, discountLabel: '80% OFF', bestseller: false },
  { plan: 'yearly', starsPrice: 3333, starsOriginalPrice: 16665, enabled: true, discountLabel: '80% OFF', bestseller: true },
  { plan: 'lifetime', starsPrice: 9999, starsOriginalPrice: 49995, enabled: false, discountLabel: '80% OFF', bestseller: false },
];

async function getLatestStarsRate(): Promise<number> {
  const latest = await StarsRate.findOne().sort({ fetchedAt: -1 }).lean() as any;
  return latest?.usdtPerStar ?? 0.014;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    let plans = await PremiumPricing.find().sort({ plan: 1 }).lean();

    if (!plans.length) {
      await PremiumPricing.insertMany(DEFAULT_PLANS);
      plans = await PremiumPricing.find().sort({ plan: 1 }).lean();
    }

    const usdPerStar = await getLatestStarsRate();

    const enriched = (plans as any[]).map((p) => ({
      ...p,
      usdPrice: +(p.starsPrice * usdPerStar).toFixed(2),
      usdOriginalPrice: +(p.starsOriginalPrice * usdPerStar).toFixed(2),
    }));

    return NextResponse.json({ plans: enriched, usdPerStar });
  } catch (error: any) {
    console.error('Error fetching premium pricing:', error);
    return NextResponse.json({ message: 'Failed to fetch pricing' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { plans } = body;

    if (!Array.isArray(plans)) {
      return NextResponse.json({ message: 'plans array is required' }, { status: 400 });
    }

    for (const p of plans) {
      if (!p.plan || typeof p.starsPrice !== 'number' || typeof p.starsOriginalPrice !== 'number') {
        return NextResponse.json({ message: `Invalid plan data for ${p.plan || 'unknown'}` }, { status: 400 });
      }
      if (p.starsPrice < 1) {
        return NextResponse.json({ message: `Stars price must be at least 1 for ${p.plan}` }, { status: 400 });
      }

      await PremiumPricing.findOneAndUpdate(
        { plan: p.plan },
        {
          starsPrice: Math.round(p.starsPrice),
          starsOriginalPrice: Math.round(p.starsOriginalPrice),
          enabled: p.enabled ?? true,
          discountLabel: p.discountLabel ?? '',
          bestseller: p.bestseller ?? false,
        },
        { upsert: true, new: true }
      );
    }

    const updated = await PremiumPricing.find().sort({ plan: 1 }).lean();
    const usdPerStar = await getLatestStarsRate();

    const enriched = (updated as any[]).map((p) => ({
      ...p,
      usdPrice: +(p.starsPrice * usdPerStar).toFixed(2),
      usdOriginalPrice: +(p.starsOriginalPrice * usdPerStar).toFixed(2),
    }));

    return NextResponse.json({ plans: enriched, usdPerStar });
  } catch (error: any) {
    console.error('Error updating premium pricing:', error);
    return NextResponse.json({ message: 'Failed to update pricing' }, { status: 500 });
  }
}
