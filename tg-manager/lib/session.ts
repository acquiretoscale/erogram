/**
 * Pure session helpers — no Node.js builtins, safe for Edge (middleware).
 * Handles cookie encoding/decoding only.
 */
import { NextRequest } from 'next/server';

export const COOKIE_NAME = 'tgm_session';

function getSecret(): string {
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || 'fallback_secret';
}

function sign(payload: string): string {
  const secret = getSecret();
  let hash = 0;
  const str = payload + secret;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export function encodeSession(userId: string, role: string): string {
  const payload = `${userId}:${role}`;
  const sig = sign(payload);
  return btoa(`${payload}:${sig}`);
}

export function decodeSession(token: string): { userId: string; role: string } | null {
  try {
    const decoded = atob(token);
    const parts = decoded.split(':');
    if (parts.length !== 3) return null;
    const [userId, role, sig] = parts;
    const payload = `${userId}:${role}`;
    if (sign(payload) !== sig) return null;
    return { userId, role };
  } catch {
    return null;
  }
}

export function getSessionFromRequest(req: NextRequest): { userId: string; role: string } | null {
  const cookie = req.cookies.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  return decodeSession(cookie.value);
}

export function isAuthenticatedFromRequest(req: NextRequest): boolean {
  return getSessionFromRequest(req) !== null;
}

export function isOwner(role: string): boolean {
  return role === 'owner';
}

export function isAdmin(role: string): boolean {
  return role === 'owner' || role === 'admin';
}
