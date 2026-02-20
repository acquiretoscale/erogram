import { NextRequest, NextResponse } from 'next/server';
import { getDashboardStats, type DashboardRange } from '@/lib/actions/campaigns';

export const dynamic = 'force-dynamic';

function getToken(req: NextRequest): string {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : '';
}

export async function GET(req: NextRequest) {
  try {
    const token = getToken(req);
    const { searchParams } = new URL(req.url);
    const advertiserIds = searchParams.get('advertiserIds');
    const slotsParam = searchParams.get('slots') || searchParams.get('slot') || undefined;
    const range = (searchParams.get('range') as DashboardRange) || '30d';
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;

    const filters = {
      advertiserIds: advertiserIds ? advertiserIds.split(',').filter(Boolean) : undefined,
      slots: slotsParam ? slotsParam.split(',').filter(Boolean) : undefined,
      range: ['today', '7d', '30d', 'custom', 'lifetime'].includes(range) ? range : '30d',
      from,
      to,
    };
    const result = await getDashboardStats(token, filters);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    return NextResponse.json(
      { message },
      { status: message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
