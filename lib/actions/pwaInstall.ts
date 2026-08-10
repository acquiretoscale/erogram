'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

/** Mark the logged-in user as having installed the PWA. Add-only (never clears). */
export async function markPwaInstalled(token: string) {
  if (!token) return { ok: false };
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    if (!decoded?.id) return { ok: false };
    await connectDB();
    await User.updateOne(
      { _id: decoded.id, pwaInstalledAt: null },
      { $set: { pwaInstalledAt: new Date() } }
    );
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
