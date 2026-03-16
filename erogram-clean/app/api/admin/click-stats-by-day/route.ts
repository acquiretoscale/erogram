import { NextRequest, NextResponse } from 'next/server';
import { getClickStatsByDay } from '@/lib/actions/campaigns';

function getToken(req: NextRequest): string {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : '';
}

export async function GET(req: NextRequest) {
  try {
    const token = getToken(req);
    const from = req.nextUrl.searchParams.get('from');
    const to = req.nextUrl.searchParams.get('to');
    const days = req.nextUrl.searchParams.get('days');
    let data: { date: string; clicks: number }[];
    if (from && to) {
      data = await getClickStatsByDay(token, 30, from, to);
    } else {
      const num = days === '7' ? 7 : 30;
      data = await getClickStatsByDay(token, num as 7 | 30);
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Unauthorized' }, { status: err.message === 'Unauthorized' ? 401 : 500 });
  }
}
