import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { ManualRevenue } from '@/lib/models';
import { authenticateUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user?.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const entries = await ManualRevenue.find({}).sort({ paidAt: -1 }).lean();

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  let totalLifetime = 0;
  let totalThisMonth = 0;
  for (const e of entries as any[]) {
    totalLifetime += e.amount || 0;
    if (new Date(e.paidAt) >= startOfMonth) totalThisMonth += e.amount || 0;
  }

  return NextResponse.json({
    entries: entries.map((e: any) => ({ ...e, _id: e._id.toString() })),
    totalLifetime,
    totalThisMonth,
  });
}

export async function POST(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user?.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const body = await req.json();
  const { amount, description, clientName, category, recurring, paidAt } = body;

  if (!amount || !description) {
    return NextResponse.json({ message: 'Amount and description are required' }, { status: 400 });
  }

  const entry = await ManualRevenue.create({
    amount: Number(amount),
    description,
    clientName: clientName || '',
    category: category || 'monthly_ad',
    recurring: !!recurring,
    paidAt: paidAt ? new Date(paidAt) : new Date(),
  });

  return NextResponse.json(entry);
}
