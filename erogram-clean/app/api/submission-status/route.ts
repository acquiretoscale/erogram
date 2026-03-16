import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Group, Bot } from '@/lib/models';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const entity = searchParams.get('entity') || 'group';

  if (!id) return NextResponse.json({ status: 'unknown' });

  try {
    await connectDB();
    const Model = entity === 'bot' ? Bot : Group;
    const doc = await Model.findById(id).select('status paidBoost').lean() as any;
    if (!doc) return NextResponse.json({ status: 'not_found' });

    return NextResponse.json({
      status: doc.status,
      paid: Boolean(doc.paidBoost),
    });
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
