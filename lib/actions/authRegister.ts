'use server';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, NewsletterSubscriber } from '@/lib/models';
import { notifyAdminsOfNewUser } from '@/lib/utils/notifyAdmins';
import { sendVerificationEmail } from '@/lib/actions/verifyEmail';
import { randomPresetAvatarUrl } from '@/lib/userAvatars';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerWithEmail(
  email: string,
  password: string,
  updatesOptIn = false,
): Promise<
  | { ok: true; token: string; username: string; isAdmin: boolean; firstName: string | null; photoUrl: string | null }
  | { ok: false; error: string }
> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(cleanEmail)) return { ok: false, error: 'Please enter a valid email address.' };
  if (!password || password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };

  await connectDB();

  const existing = await User.findOne({ email: cleanEmail }).lean();
  if (existing) return { ok: false, error: 'An account with this email already exists. Sign in instead.' };

  const baseUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20) || 'user';
  let username = baseUsername;
  let attempts = 0;
  while (await User.findOne({ username })) {
    attempts += 1;
    username = `${baseUsername}_${attempts}`;
  }

  const hashed = await bcrypt.hash(password, 10);
  const photoUrl = randomPresetAvatarUrl();

  try {
    const user = await User.create({
      username,
      email: cleanEmail,
      password: hashed,
      photoUrl,
    });

    notifyAdminsOfNewUser({ username, provider: 'email' }).catch(() => {});
    sendVerificationEmail(user._id.toString()).catch(() => {});

    if (updatesOptIn) {
      NewsletterSubscriber.updateOne(
        { email: cleanEmail },
        { $setOnInsert: { email: cleanEmail, source: 'signup', status: 'subscribed' } },
        { upsert: true },
      ).catch(() => {});
    }

    const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '7d' });

    return {
      ok: true,
      token,
      username: user.username,
      isAdmin: !!user.isAdmin,
      firstName: user.firstName || null,
      photoUrl: user.photoUrl || null,
    };
  } catch (e: any) {
    if (e?.code === 11000) return { ok: false, error: 'An account with this email already exists. Sign in instead.' };
    console.error('[registerWithEmail]', e);
    return { ok: false, error: 'Could not create account. Please try again.' };
  }
}
