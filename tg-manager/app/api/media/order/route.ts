import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { TgMediaOrder } from '@/lib/models';

export async function GET(req: NextRequest) {
  const folder = new URL(req.url).searchParams.get('folder');
  if (!folder) return NextResponse.json({ keys: [] });

  await connectDB();
  const doc = await TgMediaOrder.findOne({ folder }).lean();
  return NextResponse.json({ keys: (doc as { keys?: string[] })?.keys || [] });
}

export async function PUT(req: NextRequest) {
  const { folder, keys } = await req.json() as { folder: string; keys: string[] };
  if (!folder || !Array.isArray(keys)) {
    return NextResponse.json({ error: 'folder and keys[] required' }, { status: 400 });
  }

  await connectDB();
  await TgMediaOrder.findOneAndUpdate(
    { folder },
    { folder, keys },
    { upsert: true },
  );
  return NextResponse.json({ ok: true });
}
