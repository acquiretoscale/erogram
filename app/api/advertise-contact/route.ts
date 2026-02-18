import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Recipient: use your Resend-validated email (testing only sends to your own address until domain is verified)
const TO_EMAIL = process.env.CONTACT_EMAIL || 'eliteaccelerator@gmail.com';
const FROM_EMAIL = 'Erogram Advertise <onboarding@resend.dev>';

export async function POST(req: NextRequest) {
  if (!RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'Contact form is not configured. Set RESEND_API_KEY in .env.local.' },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { name, email, message, company } = body as { name?: string; email?: string; message?: string; company?: string };

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      );
    }

    const resend = new Resend(RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      replyTo: email.trim(),
      subject: `[Erogram Advertise] ${name.trim()}`,
      html: [
        `<p><strong>Name:</strong> ${escapeHtml(name.trim())}</p>`,
        `<p><strong>Email:</strong> ${escapeHtml(email.trim())}</p>`,
        company?.trim() ? `<p><strong>Company:</strong> ${escapeHtml(company.trim())}</p>` : '',
        `<p><strong>Message:</strong></p><pre>${escapeHtml(message.trim())}</pre>`,
      ].join(''),
    });

    if (error) {
      console.error('[advertise-contact] Resend error:', error);
      const message = error?.message || (typeof error === 'object' ? JSON.stringify(error) : 'Failed to send message.');
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (e: unknown) {
    console.error('[advertise-contact]', e);
    const message = e instanceof Error ? e.message : 'Failed to send message.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
