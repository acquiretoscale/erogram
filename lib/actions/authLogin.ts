'use server';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

export async function loginWithEmail(email: string, password: string) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !password) {
    return { ok: false as const, error: 'Email and password required.' };
  }

  await connectDB();
  const user = await User.findOne({ email: cleanEmail });
  if (!user?.password) {
    return { ok: false as const, error: 'Invalid credentials.' };
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return { ok: false as const, error: 'Invalid credentials.' };
  }

  user.lastLogin = new Date();
  user.loginCount = (user.loginCount || 0) + 1;
  await user.save();

  const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '7d' });

  return {
    ok: true as const,
    token,
    username: user.username,
    isAdmin: !!user.isAdmin,
    firstName: user.firstName || null,
    photoUrl: user.photoUrl || null,
    isNewUser: false,
  };
}
