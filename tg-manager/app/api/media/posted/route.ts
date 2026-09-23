import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TgPostLog } from '@/lib/models';

export async function GET(req: NextRequest) {
  const folder = new URL(req.url).searchParams.get('folder');
  if (!folder) return NextResponse.json({ keys: [] });

  await connectDB();

  // Use indexed mediaFolder field; fall back to regex for legacy logs
  const logs = await TgPostLog.find({
    status: 'success',
    $or: [
      { mediaFolder: folder },
      { mediaFolder: { $in: [null, ''] }, mediaKey: { $regex: `/${folder}/`, $options: 'i' } },
    ],
  }).select('mediaKey').lean();

  const postedKeys = [...new Set((logs as { mediaKey: string }[]).map(l => l.mediaKey).filter(Boolean))];
  return NextResponse.json({ keys: postedKeys });
}
