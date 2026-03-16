import { NextResponse } from 'next/server';

/**
 * Returns the contact email for the advertise form. Only used at runtime by the form.
 * Email is not in the page source or JS bundle. /api is disallowed in robots.txt
 * so this response is not indexed by search engines.
 */
export async function GET() {
  const email = process.env.CONTACT_EMAIL;
  if (!email?.trim()) {
    return NextResponse.json({ email: null }, { status: 503 });
  }
  return NextResponse.json({ email: email.trim() });
}
