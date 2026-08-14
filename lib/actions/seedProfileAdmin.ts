'use server';

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';
import { uploadToR2, isR2Configured } from '@/lib/r2';
import { compressUserAvatar, customAvatarKey, presetAvatarKey, publicAvatarUrl } from '@/lib/images/processUserAvatar';
import { PRESET_AVATAR_COUNT } from '@/lib/userAvatars';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const SEED_PASSWORD = 'seeduser123';
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

async function authenticateAdmin(token: string) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    await connectDB();
    const user = await User.findById(decoded.id).select('isAdmin').lean() as { isAdmin?: boolean } | null;
    if (user?.isAdmin) return decoded.id;
  } catch {
    return null;
  }
  return null;
}

async function isEngagementSeedUser(userId: string): Promise<boolean> {
  await connectDB();
  const user = await User.findById(userId).select('password isSeedUser').lean() as {
    password?: string;
    isSeedUser?: boolean;
  } | null;
  if (!user) return false;
  // DB flag is the source of truth: SEED USER / NOT A REAL USER
  if (user.isSeedUser === true) return true;
  if (!user.password) return false;
  return bcrypt.compare(SEED_PASSWORD, user.password);
}

export async function canEditSeedProfile(token: string, username: string) {
  const adminId = await authenticateAdmin(token);
  if (!adminId) return { ok: false as const, canEdit: false };

  await connectDB();
  const user = await User.findOne({ username }).select('_id').lean() as { _id: unknown } | null;
  if (!user) return { ok: true as const, canEdit: false };

  const canEdit = await isEngagementSeedUser(String(user._id));
  return { ok: true as const, canEdit };
}

export async function getPrivateSeedProfile(token: string, username: string) {
  const adminId = await authenticateAdmin(token);
  if (!adminId) return { ok: false as const, error: 'Unauthorized' };

  await connectDB();
  const clean = username.replace(/^@/, '').toLowerCase();
  const user = await User.findOne({ username: clean })
    .select('_id username firstName sex bio photoUrl createdAt isProfileVisible')
    .lean() as {
      _id: unknown;
      username?: string;
      firstName?: string | null;
      sex?: string | null;
      bio?: string | null;
      photoUrl?: string | null;
      createdAt?: Date;
      isProfileVisible?: boolean;
    } | null;

  if (!user) return { ok: false as const, error: 'Not found' };
  if (!(await isEngagementSeedUser(String(user._id)))) {
    return { ok: false as const, error: 'Not found' };
  }

  const { getPublicUserContributions } = await import('@/lib/actions/userProfile');
  const contributions = await getPublicUserContributions(String(user._id), 10);

  return {
    ok: true as const,
    user: {
      userId: String(user._id),
      username: user.username || clean,
      firstName: user.firstName || null,
      sex: user.sex || null,
      bio: user.bio || null,
      photoUrl: user.photoUrl || null,
      joinedAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
    },
    contributions,
  };
}

export async function updateSeedProfile(
  token: string,
  userId: string,
  data: { firstName?: string; sex?: string; bio?: string; username?: string; presetAvatarId?: number | null },
) {
  const adminId = await authenticateAdmin(token);
  if (!adminId) throw new Error('Unauthorized');
  if (!(await isEngagementSeedUser(userId))) throw new Error('This profile is not an engagement seed user');

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if ('firstName' in data) patch.firstName = data.firstName?.trim() || null;
  if ('bio' in data) patch.bio = data.bio?.trim() || null;
  if ('username' in data && data.username != null) {
    const next = data.username.trim().toLowerCase().replace(/^@/, '');
    if (!/^[a-z0-9_.]{3,24}$/.test(next)) throw new Error('Invalid username');
    await connectDB();
    const clash = await User.findOne({ username: next, _id: { $ne: userId } }).select('_id').lean();
    if (clash) throw new Error('Username already taken');
    patch.username = next;
  }
  if ('sex' in data) {
    patch.sex = data.sex === 'male' || data.sex === 'female' ? data.sex : null;
  }
  if (data.presetAvatarId != null) {
    const id = Number(data.presetAvatarId);
    if (id >= 1 && id <= PRESET_AVATAR_COUNT) {
      patch.photoUrl = publicAvatarUrl(presetAvatarKey(id));
    }
  }

  await connectDB();
  const user = await User.findByIdAndUpdate(userId, { $set: patch }, { new: true })
    .select('username firstName sex bio photoUrl')
    .lean();
  if (!user) throw new Error('User not found');
  return JSON.parse(JSON.stringify(user));
}

export async function uploadSeedProfilePhoto(token: string, userId: string, formData: FormData) {
  const adminId = await authenticateAdmin(token);
  if (!adminId) throw new Error('Unauthorized');
  if (!(await isEngagementSeedUser(userId))) throw new Error('This profile is not an engagement seed user');
  if (!isR2Configured()) throw new Error('Storage not configured');

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) throw new Error('No file uploaded');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('File too large (max 8MB)');

  await connectDB();
  const user = await User.findById(userId).select('username').lean() as { username?: string } | null;
  if (!user?.username) throw new Error('User not found');

  const optimized = await compressUserAvatar(Buffer.from(await file.arrayBuffer()));
  const photoUrl = await uploadToR2(optimized, customAvatarKey(user.username), 'image/webp');

  await User.findByIdAndUpdate(userId, { $set: { photoUrl, updatedAt: new Date() } });
  return { ok: true as const, photoUrl };
}

export async function getSeedProfilePresets() {
  if (!isR2Configured()) return [];
  const base = process.env.R2_PUBLIC_URL || '';
  return Array.from({ length: PRESET_AVATAR_COUNT }, (_, i) => ({
    id: i + 1,
    url: `${base.replace(/\/$/, '')}/${presetAvatarKey(i + 1)}`,
  }));
}
