import { NextRequest, NextResponse } from 'next/server';
import { createAdvertiser } from '@/lib/actions/advertisers';

function getToken(req: NextRequest): string {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : '';
}

export async function POST(req: NextRequest) {
  try {
    const token = getToken(req);
    const body = await req.json();
    const result = await createAdvertiser(token, {
      name: body.name,
      email: body.email,
      company: body.company,
      logo: body.logo,
      notes: body.notes,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Failed' }, { status: err.message === 'Unauthorized' ? 401 : 400 });
  }
}
