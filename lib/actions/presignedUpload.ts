'use server';

import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';
import { getPresignedUploadUrl, isR2Configured } from '@/lib/r2';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const ALLOWED_USERNAME = 'eros';

const VIDEO_EXTS: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

const IMAGE_EXTS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const ALLOWED_TYPES = { ...VIDEO_EXTS, ...IMAGE_EXTS };

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

export async function requestPresignedUpload(contentType: string) {
  if (!(await verifyOwner())) {
    return { error: 'Unauthorized' };
  }

  if (!isR2Configured()) {
    return { error: 'R2 not configured.' };
  }

  const ext = ALLOWED_TYPES[contentType];
  if (!ext) {
    return { error: `Unsupported file type: ${contentType}` };
  }

  const isVideo = contentType.startsWith('video/');
  const folder = isVideo ? 'campaigns/videos' : 'uploads';
  const key = `${folder}/${randomUUID()}.${ext}`;

  const { uploadUrl, publicUrl } = await getPresignedUploadUrl(key, contentType);
  return { uploadUrl, publicUrl };
}
