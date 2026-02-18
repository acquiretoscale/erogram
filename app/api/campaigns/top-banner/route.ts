import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Campaign } from '@/lib/models';

export const dynamic = 'force-dynamic';

/** Returns active top-banner campaigns only (status=active, visible, within dates). */
export async function GET() {
  try {
    await connectDB();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const docs = await Campaign.find({
      slot: 'top-banner',
      status: 'active',
      isVisible: { $ne: false },
      startDate: { $lte: now },
      endDate: { $gte: startOfToday },
    })
      .select('_id creative destinationUrl slot')
      .sort({ createdAt: -1 })
      .limit(2)
      .lean();

    const campaigns = docs.map((c: any) => ({
      _id: String(c._id),
      creative: c.creative || '',
      destinationUrl: c.destinationUrl || '',
      slot: c.slot,
    }));

    return NextResponse.json(campaigns);
  } catch (e) {
    console.error('Top banner API error:', e);
    return NextResponse.json([], { status: 200 });
  }
}
