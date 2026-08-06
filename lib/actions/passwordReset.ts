'use server';

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';
import { sendMail } from '@/lib/email/sendMail';
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

function resetEmailHtml(link: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#111;margin:0 0 12px;">Reset your password</h2>
      <p style="color:#444;font-size:14px;line-height:1.5;">
        Tap the button below to choose a new password for your Erogram account.
      </p>
      <a href="${link}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#00AFF0;color:#fff;text-decoration:none;font-weight:bold;border-radius:8px;">
        Create new password
      </a>
      <p style="color:#888;font-size:12px;">
        This link expires in 1 hour. If you did not request this, ignore this email.
      </p>
    </div>
  `;
}

export async function requestPasswordReset(email: string): Promise<{ ok: boolean; message: string }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return { ok: false, message: 'Enter your email.' };

  await connectDB();
  const user = await User.findOne({ email: cleanEmail });
  if (user?.email && user.password) {
    const link = await issueResetToken(String(user._id));
    await sendMail({
      to: user.email,
      subject: 'Reset your Erogram password',
      html: resetEmailHtml(link),
      text: `Create a new password: ${link}`,
    });
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
