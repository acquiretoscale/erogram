import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user, name, email, telegram, phone, link, budget, message } = body;

    if (!name || !email || !phone || !link || !user) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Log submission for now; wire up email/Telegram notification as needed
    console.log('[OFMAds contact form]', {
      user, name, email, telegram, phone, link, budget, message,
      submittedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[OFMAds contact form error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
