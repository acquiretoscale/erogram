import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Campaign, CampaignClick, Advertiser } from '@/lib/models';
import { authenticateUser } from '@/lib/auth';

const CTA_SLOTS = ['join-cta', 'navbar-cta'] as const;
type CtaSlot = typeof CTA_SLOTS[number];

async function getClickStats(campaignId: string) {
  const now = new Date();
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const id = campaignId;

  const [today, d7, d30] = await Promise.all([
    CampaignClick.countDocuments({ campaignId: id, clickedAt: { $gte: startOfToday } }),
    CampaignClick.countDocuments({ campaignId: id, clickedAt: { $gte: last7d } }),
    CampaignClick.countDocuments({ campaignId: id, clickedAt: { $gte: last30d } }),
  ]);
  return { today, last7d: d7, last30d: d30 };
}

// GET — return both CTA slots with stats
export async function GET(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user?.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const campaigns = await Campaign.find({ slot: { $in: CTA_SLOTS } })
    .sort({ createdAt: -1 })
    .lean();

  const advertisers = await Advertiser.find({}).select('_id name').lean();

  const result: Record<CtaSlot, any[]> = { 'join-cta': [], 'navbar-cta': [] };

  for (const c of campaigns) {
    const slot = (c as any).slot as CtaSlot;
    const stats = await getClickStats((c as any)._id.toString());
    result[slot].push({
      _id: (c as any)._id.toString(),
      name: (c as any).name,
      description: (c as any).description || (c as any).buttonText || '',
      destinationUrl: (c as any).destinationUrl,
      status: (c as any).status,
      startDate: (c as any).startDate,
      endDate: (c as any).endDate,
      clicks: (c as any).clicks || 0,
      clicksToday: stats.today,
      clicks7d: stats.last7d,
      clicks30d: stats.last30d,
      advertiserId: (c as any).advertiserId?.toString() || '',
      createdAt: (c as any).createdAt,
    });
  }

  return NextResponse.json({
    slots: result,
    advertisers: advertisers.map((a: any) => ({ _id: a._id.toString(), name: a.name })),
  });
}

// POST — create a new CTA campaign
export async function POST(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user?.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const body = await req.json();
  const { slot, name, description, destinationUrl, advertiserId, startDate, endDate } = body;

  if (!CTA_SLOTS.includes(slot)) return NextResponse.json({ message: 'Invalid slot' }, { status: 400 });
  if (!destinationUrl || !name || !advertiserId) return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });

  // Pause any currently active campaign in this slot
  await Campaign.updateMany({ slot, status: 'active' }, { $set: { status: 'paused' } });

  const campaign = await Campaign.create({
    slot,
    name: name.trim(),
    description: description?.trim() || name.trim(),
    buttonText: description?.trim() || name.trim(),
    destinationUrl: destinationUrl.trim(),
    advertiserId,
    creative: '',
    startDate: startDate ? new Date(startDate) : new Date(),
    endDate: endDate ? new Date(endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    status: 'active',
    isVisible: true,
    clicks: 0,
    impressions: 0,
  });

  return NextResponse.json({ _id: campaign._id.toString() });
}

// PUT — update text/URL/status of an existing CTA campaign
export async function PUT(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user?.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const body = await req.json();
  const { id, description, destinationUrl, status, startDate, endDate, name } = body;
  if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

  const update: any = {};
  if (description !== undefined) { update.description = description.trim(); update.buttonText = description.trim(); }
  if (destinationUrl !== undefined) update.destinationUrl = destinationUrl.trim();
  if (status !== undefined) update.status = status;
  if (startDate !== undefined) update.startDate = new Date(startDate);
  if (endDate !== undefined) update.endDate = new Date(endDate);
  if (name !== undefined) update.name = name.trim();

  await Campaign.findByIdAndUpdate(id, { $set: update });
  return NextResponse.json({ ok: true });
}

// DELETE — delete a CTA campaign
export async function DELETE(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user?.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

  await Campaign.findByIdAndDelete(id);
  await CampaignClick.deleteMany({ campaignId: id });

  return NextResponse.json({ ok: true });
}
