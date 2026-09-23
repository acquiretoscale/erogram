/**
 * Server-side auth helpers — Node.js runtime only (API routes, server components).
 * Do NOT import this in middleware.ts (use lib/session.ts instead).
 */
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { connectDB } from './db';
import { User } from './models';
import { COOKIE_NAME, encodeSession, decodeSession, isOwner, isAdmin } from './session';

export { isOwner, isAdmin };

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// ── DB-based login ────────────────────────────────────────────

export async function loginUser(username: string, password: string): Promise<{ userId: string; role: string } | null> {
  // Always accept ADMIN_PASSWORD from env as owner login
  const envPass = process.env.ADMIN_PASSWORD;
  if (envPass && password === envPass) {
    try {
      await connectDB();
      const user = await User.findOne({ username: username.toLowerCase().trim() }).lean() as any;
      if (user) {
        // Update stored hash to match current ADMIN_PASSWORD
        const hashMatch = await bcrypt.compare(password, user.passwordHash);
        if (!hashMatch) {
          const newHash = await bcrypt.hash(password, 12);
          User.updateOne({ _id: user._id }, { passwordHash: newHash, lastLoginAt: new Date() }).exec().catch(() => {});
        } else {
          User.updateOne({ _id: user._id }, { lastLoginAt: new Date() }).exec().catch(() => {});
        }
        return { userId: user._id.toString(), role: user.role };
      }
    } catch { /* DB down — still allow env login */ }
    return { userId: 'admin', role: 'owner' };
  }

  try {
    await connectDB();
    const user = await User.findOne({ username: username.toLowerCase().trim() }).lean() as {
      _id: { toString(): string };
      passwordHash: string;
      role: string;
    } | null;
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;
    User.updateOne({ _id: user._id }, { lastLoginAt: new Date() }).exec().catch(() => {});
    return { userId: user._id.toString(), role: user.role };
  } catch {
    return null;
  }
}

// ── Cookie helpers ────────────────────────────────────────────

export async function setSessionCookie(userId: string, role: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, encodeSession(userId, role), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearAuthCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSession(): Promise<{ userId: string; role: string } | null> {
  const jar = await cookies();
  const cookie = jar.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  return decodeSession(cookie.value);
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

// ── Password utilities ────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
