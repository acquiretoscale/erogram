import { NextRequest, NextResponse } from 'next/server';

const ADVERTISE_PASSWORD = process.env.ADVERTISE_PASSWORD || 'erogram2026';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (password === ADVERTISE_PASSWORD) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false }, { status: 401 });
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
}
