import { NextRequest, NextResponse } from 'next/server';
import { loginUser, setSessionCookie, clearAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
  }
  const session = await loginUser(username, password);
  if (!session) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  await setSessionCookie(session.userId, session.role);
  return NextResponse.json({ ok: true, role: session.role });
}

export async function DELETE() {
  await clearAuthCookie();
  return NextResponse.json({ ok: true });
}
