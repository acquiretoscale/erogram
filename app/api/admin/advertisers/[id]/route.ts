import { NextRequest, NextResponse } from 'next/server';
import { updateAdvertiser, deleteAdvertiser } from '@/lib/actions/advertisers';

function getToken(req: NextRequest): string {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : '';
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getToken(req);
    const { id } = await params;
    const body = await req.json();
    await updateAdvertiser(token, id, body);
    return NextResponse.json({ _id: id });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Failed' }, { status: err.message === 'Unauthorized' ? 401 : 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getToken(req);
    const { id } = await params;
    await deleteAdvertiser(token, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Failed' }, { status: err.message === 'Unauthorized' ? 401 : 400 });
  }
}
