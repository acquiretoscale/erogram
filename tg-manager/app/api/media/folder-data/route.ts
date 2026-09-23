import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TgPostLog, TgMediaOrder, TgNicheLink } from '@/lib/models';
import { listFiles } from '@/lib/r2';

export async function GET(req: NextRequest) {
  const folder = new URL(req.url).searchParams.get('folder');
  if (!folder) return NextResponse.json({ error: 'folder required' }, { status: 400 });

  await connectDB();

  const [files, orderDoc, postedLogs, links] = await Promise.all([
    listFiles(folder),
    TgMediaOrder.findOne({ folder }).lean(),
    TgPostLog.find({
      status: 'success',
      $or: [
        { mediaFolder: folder },
        { mediaFolder: { $in: [null, ''] }, mediaKey: { $regex: `/${folder}/`, $options: 'i' } },
      ],
    }).select('mediaKey').lean(),
    TgNicheLink.find({ folder }).sort({ createdAt: -1 }).lean(),
  ]);

  const keys = (orderDoc as any)?.keys || [];
  const postedKeys = [...new Set((postedLogs as { mediaKey: string }[]).map(l => l.mediaKey).filter(Boolean))];

  return NextResponse.json({ files, order: keys, postedKeys, links });
}
