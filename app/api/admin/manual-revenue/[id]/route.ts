import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { ManualRevenue } from '@/lib/models';
import { authenticateUser } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await authenticateUser(req);
  if (!user?.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const body = await req.json();
  const update: Record<string, any> = {};
  if (body.amount !== undefined) update.amount = Number(body.amount);
  if (body.description !== undefined) update.description = body.description;
  if (body.clientName !== undefined) update.clientName = body.clientName;
  if (body.category !== undefined) update.category = body.category;
  if (body.recurring !== undefined) update.recurring = !!body.recurring;
  if (body.paidAt !== undefined) update.paidAt = new Date(body.paidAt);

  const updated = await ManualRevenue.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!updated) return NextResponse.json({ message: 'Not found' }, { status: 404 });

  return NextResponse.json({ ...updated, _id: (updated as any)._id.toString() });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await authenticateUser(req);
  if (!user?.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const deleted = await ManualRevenue.findByIdAndDelete(id);
  if (!deleted) return NextResponse.json({ message: 'Not found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
