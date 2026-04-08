'use server';

import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';
import { deleteFromR2 } from '@/lib/r2';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const ALLOWED_USERNAME = 'eros';

async function verifyOwner(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    if (!token) return false;
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    await connectDB();
    const user = await User.findById(decoded.id).select('isAdmin username').lean() as any;
    return user?.isAdmin === true && user?.username === ALLOWED_USERNAME;
  } catch {
    return false;
  }
}

export async function deleteMediaUrls(urls: string[]): Promise<{ ok: boolean }> {
  if (!(await verifyOwner())) return { ok: false };

  await Promise.all(urls.map(url => deleteFromR2(url)));
  return { ok: true };
}
