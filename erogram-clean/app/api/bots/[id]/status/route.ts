import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Bot } from '@/lib/models';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await connectDB();
  const bot = await Bot.findById(id).select('status paidBoost').lean() as any;
  if (!bot) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ status: bot.status, paid: !!bot.paidBoost });
}
