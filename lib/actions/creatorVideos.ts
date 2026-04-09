'use server';

import { randomUUID } from 'crypto';
import { uploadToR2, isR2Configured, deleteFromR2 } from '@/lib/r2';

const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export async function uploadCreatorVideo(formData: FormData): Promise<{ url?: string; error?: string }> {
  const file = formData.get('file') as File;
  if (!file) return { error: 'No file provided' };
  if (!ALLOWED_TYPES.includes(file.type)) return { error: 'Invalid type. Use MP4, WebM, or MOV.' };

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  if (buffer.length > MAX_VIDEO_BYTES) return { error: 'Video too large. Max 100 MB.' };

  if (!isR2Configured()) {
    return { error: 'R2 not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL.' };
  }

  const ext = file.type === 'video/quicktime' ? 'mov' : file.type.split('/')[1];
  const key = `creator-videos/${randomUUID()}.${ext}`;
  const url = await uploadToR2(buffer, key, file.type);
  return { url };
}

export async function deleteCreatorVideo(publicUrl: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await deleteFromR2(publicUrl);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
