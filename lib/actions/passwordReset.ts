'use server';

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';
import { sendMail } from '@/lib/email/sendMail';
import { renderEmailTemplate } from '@/lib/email/templates';
import { CANONICAL_BASE } from '@/lib/seo/socialMeta';

const TOKEN_TTL_MS = 60 * 60 * 1000;
const GENERIC_OK = 'If an account exists, we sent instructions to the email on file.';

async function issueResetToken(userId: string) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + TOKEN_TTL_MS);
  await User.updateOne(
    { _id: userId },
    { $set: { passwordResetToken: rawToken, passwordResetTokenExpires: expires } },
  );
  return `${CANONICAL_BASE}/reset-password?token=${rawToken}`;
}

export async function requestPasswordReset(email: string): Promise<{ ok: boolean; message: string }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return { ok: false, message: 'Enter your email.' };

  await connectDB();
  const user = await User.findOne({ email: cleanEmail });
  if (user?.email && user.password) {
    const link = await issueResetToken(String(user._id));
    const rendered = await renderEmailTemplate('password-reset', { resetUrl: link });
    if (rendered) {
      await sendMail({
        to: user.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
    }
  }

  return { ok: true, message: GENERIC_OK };
}

export async function resetPasswordWithToken(token: string, password: string): Promise<{ ok: boolean; error?: string }> {
  if (!token) return { ok: false, error: 'Missing reset link.' };
  if (!password || password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };

  await connectDB();
  const user = await User.findOne({ passwordResetToken: token });
  if (!user) return { ok: false, error: 'Invalid or already used link.' };
  if (!user.passwordResetTokenExpires || user.passwordResetTokenExpires < new Date()) {
    return { ok: false, error: 'This link has expired. Request a new one from the login page.' };
  }

  user.password = await bcrypt.hash(password, 10);
  user.passwordResetToken = null;
  user.passwordResetTokenExpires = null;
  await user.save();
  return { ok: true };
}
