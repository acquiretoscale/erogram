import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Campaign } from '@/lib/models';

export const dynamic = 'force-dynamic';

const SINGLE_CTA_SLOTS = ['navbar-cta', 'join-cta', 'filter-cta'];

/** Returns active campaign for a placement. Use ?slot=navbar-cta|join-cta (single). */
export async function GET(req: NextRequest) {
  const rawSlot = req.nextUrl.searchParams.get('slot');
  const slot = (rawSlot || '').trim().toLowerCase();
  if (!slot) {
    return NextResponse.json({ campaign: null, campaigns: [] }, { status: 200 });
  }
  try {
    await connectDB();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (!SINGLE_CTA_SLOTS.includes(slot)) {
      return NextResponse.json({ campaign: null, campaigns: [] }, { status: 200 });
    }

    const doc = await Campaign.findOne({
      slot,
      status: 'active',
      isVisible: { $ne: false },
      startDate: { $lte: now },
      endDate: { $gte: startOfToday },
    })
      .select('_id destinationUrl description buttonText')
      .sort({ createdAt: -1 })
      .lean();

    if (!doc) {
      return NextResponse.json({ campaign: null, campaigns: [] }, { status: 200 });
    }

    const campaign = {
      _id: (doc as any)._id.toString(),
      destinationUrl: (doc as any).destinationUrl || '',
      description: (doc as any).description || '',
      buttonText: (doc as any).buttonText || '',
    };
    return NextResponse.json({ campaign, campaigns: [] });
  } catch (e) {
    console.error('Placement API error:', e);
    return NextResponse.json({ campaign: null, campaigns: [] }, { status: 200 });
  }
}
