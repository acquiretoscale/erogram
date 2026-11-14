'use server';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';
import { matchPublisherLogin, signPublisherToken } from '@/lib/auth/publisherAccess';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

export async function loginWithEmail(email: string, password: string) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();
  if (!cleanEmail || !cleanPassword) {
    return { ok: false as const, error: 'Email and password required.' };
  }

  if (matchPublisherLogin(cleanEmail, cleanPassword)) {
    return {
      ok: true as const,
      token: signPublisherToken(),
      username: 'Demopublisher',
      isAdmin: false,
      isPublisher: true,
      firstName: null,
      photoUrl: null,
      isNewUser: false,
    };
  }

  await connectDB();
  const user = await User.findOne({ email: cleanEmail });
  if (!user?.password) {
    return { ok: false as const, error: 'Invalid credentials.' };
  }

  const valid = await bcrypt.compare(cleanPassword, user.password);
  if (!valid) {
    return { ok: false as const, error: 'Invalid credentials.' };
  }

  user.lastLogin = new Date();
  user.loginCount = (user.loginCount || 0) + 1;
  await user.save();

  const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '7d' });

  const publisher = matchPublisherLogin(cleanEmail, cleanPassword);
  return {
    ok: true as const,
    token,
    username: user.username,
    isAdmin: !!user.isAdmin,
    isPublisher: publisher,
    firstName: user.firstName || null,
    photoUrl: user.photoUrl || null,
    isNewUser: false,
  };
}
