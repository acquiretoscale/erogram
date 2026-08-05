'use server';

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';
import { sendMail } from '@/lib/email/sendMail';
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

function verificationEmailHtml(link: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#111;margin:0 0 12px;">Confirm your email</h2>
      <p style="color:#444;font-size:14px;line-height:1.5;">
        Tap the button below to verify your email address on Erogram.
      </p>
      <a href="${link}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#00AFF0;color:#fff;text-decoration:none;font-weight:bold;border-radius:8px;">
        Verify email
      </a>
      <p style="color:#888;font-size:12px;">
        This link expires in 24 hours. If you didn't create an Erogram account, ignore this email.
      </p>
    </div>
  `;
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
  const result = await sendMail({
    to: user.email,
    subject: 'Confirm your Erogram email',
    html: verificationEmailHtml(link),
    text: `Verify your email: ${link}`,
  });
  return result;
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
