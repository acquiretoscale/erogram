import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { ManualRevenue } from '@/lib/models';
import { authenticateUser } from '@/lib/auth';

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
