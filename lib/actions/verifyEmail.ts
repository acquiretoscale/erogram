'use server';

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';
import { sendMail } from '@/lib/email/sendMail';
import { renderEmailTemplate } from '@/lib/email/templates';
import { CANONICAL_BASE } from '@/lib/seo/socialMeta';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function getUserIdFromToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    return decoded?.id || null;
  } catch {
    return null;
  }
}

export async function sendVerificationEmail(userId: string): Promise<{ ok: boolean; error?: string }> {
  await connectDB();
  const user = await User.findById(userId);
  if (!user) return { ok: false, error: 'User not found' };
  if (!user.email) return { ok: false, error: 'No email on this account' };
  if (user.emailVerified) return { ok: true };

  const rawToken = crypto.randomBytes(32).toString('hex');
  user.emailVerifyToken = rawToken;
  user.emailVerifyTokenExpires = new Date(Date.now() + TOKEN_TTL_MS);
  await user.save();

  const link = `${CANONICAL_BASE}/verify-email?token=${rawToken}`;
  const rendered = await renderEmailTemplate('email-verify', { verifyUrl: link });
  if (!rendered) return { ok: false, error: 'Verification email template is empty' };

  return sendMail({
    to: user.email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
}

export async function resendVerificationEmail(authToken: string): Promise<{ ok: boolean; error?: string }> {
  const userId = getUserIdFromToken(authToken);
  if (!userId) return { ok: false, error: 'Not logged in' };
  return sendVerificationEmail(userId);
}

export async function verifyEmailToken(token: string): Promise<{ ok: boolean; error?: string }> {
  if (!token) return { ok: false, error: 'Missing token' };
  await connectDB();
  const user = await User.findOne({ emailVerifyToken: token });
  if (!user) return { ok: false, error: 'Invalid or already used link' };
  if (!user.emailVerifyTokenExpires || user.emailVerifyTokenExpires < new Date()) {
    return { ok: false, error: 'This link has expired. Request a new one.' };
  }
  user.emailVerified = true;
  user.emailVerifyToken = null;
  user.emailVerifyTokenExpires = null;
  await user.save();
  return { ok: true };
}
