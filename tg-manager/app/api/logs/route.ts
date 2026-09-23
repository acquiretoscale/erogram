import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TgPostLog } from '@/lib/models';

export async function GET() {
  await connectDB();
  const logs = await TgPostLog.find().sort({ postedAt: -1 }).limit(100).lean();
  return NextResponse.json(logs);
}
