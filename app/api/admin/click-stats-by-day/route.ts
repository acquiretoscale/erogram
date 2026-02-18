import { NextRequest, NextResponse } from 'next/server';
import { getClickStatsByDay } from '@/lib/actions/campaigns';

function getToken(req: NextRequest): string {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : '';
}

export async function GET(req: NextRequest) {
  try {
    const token = getToken(req);
    const days = req.nextUrl.searchParams.get('days');
    const num = days === '7' ? 7 : 30;
    const data = await getClickStatsByDay(token, num as 7 | 30);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Unauthorized' }, { status: err.message === 'Unauthorized' ? 401 : 500 });
  }
}
