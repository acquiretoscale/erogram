import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createCampaign } from '@/lib/actions/campaigns';

function getToken(req: NextRequest): string {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : '';
}

const TEXT_ONLY_SLOTS = ['navbar-cta', 'join-cta', 'filter-cta'];

export async function POST(req: NextRequest) {
  try {
    const token = getToken(req);
    const body = await req.json();
    const rawSlot = body.slot;
    const slot = typeof rawSlot === 'string' ? rawSlot.trim().toLowerCase() : rawSlot;
    const isCtaSlot = TEXT_ONLY_SLOTS.includes(slot);
    const desc = (body.description != null ? String(body.description).trim() : '') || (body.buttonText != null ? String(body.buttonText).trim() : '') || 'Visit Site';
    const result = await createCampaign(token, {
      advertiserId: body.advertiserId != null ? String(body.advertiserId).trim() : '',
      name: body.name != null ? String(body.name).trim() : '',
      slot,
      creative: isCtaSlot ? '' : (body.creative ?? ''),
      destinationUrl: body.destinationUrl != null ? String(body.destinationUrl).trim() : '',
      startDate: body.startDate != null ? String(body.startDate) : '',
      endDate: body.endDate != null ? String(body.endDate) : '',
      status: body.status ?? 'active',
      isVisible: body.isVisible !== false,
      position: body.position ?? null,
      feedTier: body.feedTier ?? null,
      tierSlot: body.tierSlot ?? null,
      description: isCtaSlot ? desc : (body.description != null ? String(body.description).trim() : ''),
      category: body.category ?? 'All',
      country: body.country ?? 'All',
      buttonText: isCtaSlot ? desc : (body.buttonText != null ? String(body.buttonText).trim() : 'Visit Site'),
    });
    revalidatePath('/groups');
    revalidatePath('/groups/country/[country]', 'page');
    revalidatePath('/bots');
    return NextResponse.json(result);
  } catch (err: any) {
    const message = err?.message || 'Failed';
    const status = message === 'Unauthorized' ? 401 : 400;
    return NextResponse.json({ message }, { status });
  }
}
