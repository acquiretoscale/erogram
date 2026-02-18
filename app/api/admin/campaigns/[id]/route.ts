import { NextRequest, NextResponse } from 'next/server';
import { updateCampaign, deleteCampaign } from '@/lib/actions/campaigns';

function getToken(req: NextRequest): string {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : '';
}

const TEXT_ONLY_SLOTS = ['navbar-cta', 'join-cta', 'filter-cta'];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getToken(req);
    const { id } = await params;
    const body = await req.json();
    if (body.slot && TEXT_ONLY_SLOTS.includes(body.slot)) {
      body.creative = '';
    }
    await updateCampaign(token, id, body);
    return NextResponse.json({ _id: id });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Failed' }, { status: err.message === 'Unauthorized' ? 401 : 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getToken(req);
    const { id } = await params;
    await deleteCampaign(token, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Failed' }, { status: err.message === 'Unauthorized' ? 401 : 400 });
  }
}
