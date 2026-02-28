import { NextRequest, NextResponse } from 'next/server';
import { trackImpression } from '@/lib/actions/campaigns';

/** Public: record a campaign impression (feed ad visibility). No auth. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const campaignId = typeof body?.campaignId === 'string' ? body.campaignId.trim() : '';
    if (!campaignId) {
      return NextResponse.json({ ok: false, message: 'campaignId required' }, { status: 400 });
    }
    await trackImpression(campaignId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
