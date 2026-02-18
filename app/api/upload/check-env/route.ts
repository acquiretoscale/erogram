import { NextResponse } from 'next/server';

/**
 * Safe check: which R2 env vars Vercel sees (values never exposed).
 * DELETE this file or route after debugging.
 */
export async function GET() {
  const keys = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_PUBLIC_URL',
    'R2_BUCKET_NAME',
  ] as const;
  const status: Record<string, { set: boolean; length?: number }> = {};
  for (const k of keys) {
    const v = process.env[k];
    status[k] = { set: !!v, length: v ? v.length : 0 };
  }
  const allSet = keys.every((k) => status[k].set);
  return NextResponse.json({
    message: allSet
      ? 'All R2 env vars are set.'
      : 'Some R2 env vars are missing or empty.',
    env: status,
    vercel: !!process.env.VERCEL,
  });
}
