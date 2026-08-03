'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, OnlyFansCreator } from '@/lib/models';
import {
  addCreatorAlbumPhoto,
  addCreatorAlbumVideo,
  removeCreatorAlbumPhoto,
  removeCreatorAlbumVideo,
  replaceCreatorPhoto,
} from '@/lib/actions/creatorImages';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function assertCreatorMediaAccess(token: string, slug: string) {
  if (!token) throw new Error('Sign in to manage this profile');
  let userId: string;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    if (!decoded?.id) throw new Error('Invalid session');
    userId = decoded.id;
  } catch {
    throw new Error('Invalid session');
  }

  await connectDB();
  const user = await User.findById(userId).select('isAdmin').lean() as { isAdmin?: boolean } | null;
  if (!user) throw new Error('User not found');
  if (user.isAdmin) return;

  const creator = await OnlyFansCreator.findOne({ slug, deleted: { $ne: true } })
    .select('submittedBy')
    .lean() as { submittedBy?: { toString(): string } } | null;
  if (!creator) throw new Error('Creator not found');
  if (creator.submittedBy?.toString() !== userId) {
    throw new Error('You can only upload to your own creator profile');
  }
}

export async function canManageCreatorMedia(token: string, slug: string): Promise<boolean> {
  try {
    await assertCreatorMediaAccess(token, slug);
    return true;
  } catch {
    return false;
  }
}

export async function uploadCreatorProfilePhoto(
  token: string,
  slug: string,
  type: 'avatar' | 'header',
  file: File,
): Promise<{ url: string } | { error: string }> {
  try {
    await assertCreatorMediaAccess(token, slug);
    const formData = new FormData();
    formData.set('slug', slug);
    formData.set('type', type);
    formData.set('file', file);
    return replaceCreatorPhoto(formData);
  } catch (e: any) {
    return { error: e.message || 'Upload failed' };
  }
}

export async function uploadCreatorFeedPhoto(
  token: string,
  slug: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  try {
    await assertCreatorMediaAccess(token, slug);
    return addCreatorAlbumPhoto(slug, file);
  } catch (e: any) {
    return { error: e.message || 'Upload failed' };
  }
}

export async function uploadCreatorFeedVideo(
  token: string,
  slug: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  try {
    await assertCreatorMediaAccess(token, slug);
    return addCreatorAlbumVideo(slug, file);
  } catch (e: any) {
    return { error: e.message || 'Upload failed' };
  }
}

export async function removeCreatorFeedPhoto(
  token: string,
  slug: string,
  url: string,
): Promise<{ ok: boolean } | { error: string }> {
  try {
    await assertCreatorMediaAccess(token, slug);
    return removeCreatorAlbumPhoto(slug, url);
  } catch (e: any) {
    return { error: e.message || 'Remove failed' };
  }
}

export async function removeCreatorFeedVideo(
  token: string,
  slug: string,
  url: string,
): Promise<{ ok: boolean } | { error: string }> {
  try {
    await assertCreatorMediaAccess(token, slug);
    return removeCreatorAlbumVideo(slug, url);
  } catch (e: any) {
    return { error: e.message || 'Remove failed' };
  }
}
