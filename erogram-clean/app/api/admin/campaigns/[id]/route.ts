import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
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
    const updated = await updateCampaign(token, id, body);
    revalidatePath('/groups');
    revalidatePath('/groups/country/[country]', 'page');
    revalidatePath('/bots');
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Failed' }, { status: err.message === 'Unauthorized' ? 401 : 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getToken(req);
    const { id } = await params;
    await deleteCampaign(token, id);
    revalidatePath('/groups');
    revalidatePath('/groups/country/[country]', 'page');
    revalidatePath('/bots');
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Failed' }, { status: err.message === 'Unauthorized' ? 401 : 400 });
  }
}
