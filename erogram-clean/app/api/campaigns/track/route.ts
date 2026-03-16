import { NextRequest, NextResponse } from 'next/server';
import { trackClick } from '@/lib/actions/campaigns';

/** Public: record a campaign click (feed ad, banner, etc.). No auth. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const campaignId = typeof body?.campaignId === 'string' ? body.campaignId.trim() : '';
    if (!campaignId) {
      return NextResponse.json({ ok: false, message: 'campaignId required' }, { status: 400 });
    }
    await trackClick(campaignId, body?.placement);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
