import { NextResponse } from 'next/server';

const DESTINATION = 'https://www.joi.com/?utm_source=erogram.pro&utm_medium=referral';

export function GET() {
  return NextResponse.redirect(DESTINATION, 302);
}
