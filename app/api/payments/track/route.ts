import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { PremiumEvent } from '@/lib/models';
import { authenticateUser } from '@/lib/auth';

const CLIENT_EVENTS = ['page_view', 'modal_open', 'plan_click'] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, plan, source, reason } = body;

    if (!event || !CLIENT_EVENTS.includes(event)) {
      return NextResponse.json({ message: 'Invalid event' }, { status: 400 });
    }

    await connectDB();

    const user = await authenticateUser(req);

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               req.headers.get('x-real-ip') || null;

    await PremiumEvent.create({
      event,
      userId: user?._id || null,
      username: user?.username || null,
      plan: plan || null,
      source: source || null,
      reason: reason || null,
      ip,
      userAgent: req.headers.get('user-agent') || null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Premium track error:', err);
    return NextResponse.json({ ok: true });
  }
}
