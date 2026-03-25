import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { TrendingOFCreator } from '@/lib/models';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  await TrendingOFCreator.findByIdAndUpdate(id, { $inc: { clicks: 1 } });
  return NextResponse.json({ ok: true });
}
