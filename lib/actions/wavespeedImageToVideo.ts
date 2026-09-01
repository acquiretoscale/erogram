'use server';

import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { AiToolGeneration } from '@/lib/models';
import { uploadToR2, isR2Configured } from '@/lib/r2';
import type { AiToolGenerationRecord, VideoModel } from '@/lib/imageToVideo/types';

const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY || '';
const LTX_SPICY_SUBMIT_URL =
  'https://api.wavespeed.ai/api/v3/wavespeed-ai/ltx-2.3-spicy/image-to-video';
const WAN_ULTRA_FAST_SUBMIT_URL =
  'https://api.wavespeed.ai/api/v3/wavespeed-ai/wan-2.2/i2v-480p-ultra-fast';
const SEEDREAM_EDIT_URL = 'https://api.wavespeed.ai/api/v3/bytedance/seedream-v5.0-pro/edit';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

const DEFAULT_PROMPT = 'Natural subtle motion, smooth camera movement, cinematic lighting.';
const ALLOWED_RESOLUTIONS = ['480p', '720p', '1080p'] as const;
const MIN_DURATION = 3;
const MAX_DURATION = 20;
const DEFAULT_RESOLUTION = '480p';
const DEFAULT_DURATION = 5;

const CHEAP_DURATIONS = [5, 8] as const;
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

type ImageToVideoResolution = (typeof ALLOWED_RESOLUTIONS)[number];

type ImageToVideoPollResult = {
  status: 'created' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'timeout' | 'unknown';
  outputUrl?: string;
  error?: string;
};

function userIdFromToken(token: string | null | undefined): string | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    return decoded?.id || null;
  } catch {
    return null;
  }
}

function normalizeResolution(value?: string): ImageToVideoResolution {
  return ALLOWED_RESOLUTIONS.includes(value as ImageToVideoResolution)
    ? (value as ImageToVideoResolution)
    : DEFAULT_RESOLUTION;
}

function normalizeDuration(value?: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_DURATION;
  return Math.min(MAX_DURATION, Math.max(MIN_DURATION, n));
}

function normalizeCheapDuration(value?: number): (typeof CHEAP_DURATIONS)[number] {
  const n = Math.round(Number(value));
  return CHEAP_DURATIONS.includes(n as (typeof CHEAP_DURATIONS)[number])
    ? (n as (typeof CHEAP_DURATIONS)[number])
    : 5;
}

type WavespeedTask = {
  id?: string;
  status?: string;
  outputs?: string[];
  urls?: { get?: string };
  error?: string;
};

function unwrapData<T extends Record<string, unknown>>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${WAVESPEED_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

export async function uploadImageToVideoSource(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const file = formData.get('file') as File | null;
  if (!file) return { error: 'No image provided.' };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { error: 'Use JPG or PNG. WEBP is not supported by the model.' };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  if (buffer.length > MAX_IMAGE_BYTES) return { error: 'Image too large. Max 10 MB.' };

  if (!isR2Configured()) {
    return {
      error: 'Image storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL.',
    };
  }

  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const key = `image-to-video/uploads/${randomUUID()}.${ext}`;
  const url = await uploadToR2(buffer, key, file.type);
  return { url };
}

export async function submitWavespeedImageToVideo(
  imageUrl: string,
  prompt?: string,
  resolution?: string,
  duration?: number,
  preset?: string,
  videoModel: VideoModel = 'current',
): Promise<{ resultUrl?: string; taskId?: string; error?: string }> {
  if (!WAVESPEED_API_KEY) {
    return { error: 'WAVESPEED_API_KEY is not configured.' };
  }
  if (!imageUrl?.trim()) return { error: 'Missing image URL.' };

  const trimmedPrompt = (prompt || DEFAULT_PROMPT).trim() || DEFAULT_PROMPT;
  const submitUrl =
    videoModel === 'cheap' ? WAN_ULTRA_FAST_SUBMIT_URL : LTX_SPICY_SUBMIT_URL;
  const body =
    videoModel === 'cheap'
      ? {
          image: imageUrl.trim(),
          prompt: trimmedPrompt,
          duration: normalizeCheapDuration(duration),
          seed: -1,
        }
      : {
          image: imageUrl.trim(),
          prompt: trimmedPrompt,
          preset: preset === 'original' ? 'original' : 'tuned',
          resolution: normalizeResolution(resolution),
          duration: normalizeDuration(duration),
          seed: -1,
        };

  const res = await fetch(submitUrl, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  const raw = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (raw && typeof raw === 'object' && 'message' in raw && String(raw.message)) ||
      `WaveSpeed request failed (${res.status}).`;
    return { error: message };
  }

  const task = unwrapData<WavespeedTask>(raw);
  const taskId = task.id;
  const resultUrl =
    task.urls?.get ||
    (taskId ? `https://api.wavespeed.ai/api/v3/predictions/${taskId}/result` : undefined);

  if (!resultUrl) return { error: 'WaveSpeed did not return a task id.' };
  return { resultUrl, taskId };
}

export async function submitWavespeedImageEdit(
  imageUrl: string,
  prompt: string,
): Promise<{ resultUrl?: string; taskId?: string; error?: string }> {
  if (!WAVESPEED_API_KEY) {
    return { error: 'WAVESPEED_API_KEY is not configured.' };
  }
  if (!imageUrl?.trim()) return { error: 'Missing image URL.' };
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) return { error: 'Write a prompt first.' };

  const body = {
    prompt: trimmedPrompt,
    images: [imageUrl.trim()],
    resolution: '1k',
    output_format: 'jpeg',
    prompt_optimization_mode: 'fast',
  };

  const res = await fetch(SEEDREAM_EDIT_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  const raw = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (raw && typeof raw === 'object' && 'message' in raw && String(raw.message)) ||
      `WaveSpeed request failed (${res.status}).`;
    return { error: message };
  }

  const task = unwrapData<WavespeedTask>(raw);
  const taskId = task.id;
  const resultUrl =
    task.urls?.get ||
    (taskId ? `https://api.wavespeed.ai/api/v3/predictions/${taskId}/result` : undefined);

  if (!resultUrl) return { error: 'WaveSpeed did not return a task id.' };
  return { resultUrl, taskId };
}

export async function saveAiToolGeneration(input: {
  clientId: string;
  token?: string | null;
  mode: 'image' | 'video';
  videoModel?: VideoModel | null;
  sourceImageUrl: string;
  outputUrl: string;
  prompt?: string;
  quality?: string;
  duration?: number | null;
}): Promise<{ ok: boolean; error?: string }> {
  const clientId = input.clientId?.trim();
  if (!clientId) return { ok: false, error: 'Missing client id.' };
  if (!input.sourceImageUrl?.trim() || !input.outputUrl?.trim()) {
    return { ok: false, error: 'Missing output.' };
  }

  try {
    await connectDB();
    const userId = userIdFromToken(input.token);
    await AiToolGeneration.create({
      clientId,
      userId: userId || null,
      mode: input.mode,
      videoModel: input.mode === 'video' ? input.videoModel || 'current' : null,
      sourceImageUrl: input.sourceImageUrl.trim(),
      outputUrl: input.outputUrl.trim(),
      prompt: (input.prompt || '').trim(),
      quality: (input.quality || '').trim(),
      duration: input.duration ?? null,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not save generation.' };
  }
}

export async function listAiToolGenerations(
  clientId: string,
  token?: string | null,
): Promise<{ items: AiToolGenerationRecord[]; error?: string }> {
  const trimmedClientId = clientId?.trim();
  if (!trimmedClientId) return { items: [], error: 'Missing client id.' };

  try {
    await connectDB();
    const userId = userIdFromToken(token);
    const query = userId
      ? { $or: [{ clientId: trimmedClientId }, { userId }] }
      : { clientId: trimmedClientId };

    const docs = await AiToolGeneration.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const items: AiToolGenerationRecord[] = docs.map((doc) => ({
      id: String(doc._id),
      mode: doc.mode as 'image' | 'video',
      videoModel: (doc.videoModel as VideoModel | null) || null,
      sourceImageUrl: String(doc.sourceImageUrl || ''),
      outputUrl: String(doc.outputUrl || ''),
      prompt: String(doc.prompt || ''),
      quality: String(doc.quality || ''),
      duration: typeof doc.duration === 'number' ? doc.duration : null,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    }));

    return { items };
  } catch {
    return { items: [], error: 'Could not load archive.' };
  }
}

export async function pollWavespeedImageToVideo(
  resultUrl: string,
): Promise<ImageToVideoPollResult> {
  if (!WAVESPEED_API_KEY) {
    return { status: 'failed', error: 'WAVESPEED_API_KEY is not configured.' };
  }
  if (!resultUrl?.trim()) return { status: 'failed', error: 'Missing result URL.' };

  const res = await fetch(resultUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` },
    cache: 'no-store',
  });

  const raw = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (raw && typeof raw === 'object' && 'message' in raw && String(raw.message)) ||
      `WaveSpeed poll failed (${res.status}).`;
    return { status: 'failed', error: message };
  }

  const task = unwrapData<WavespeedTask>(raw);
  const status = (task.status || 'unknown') as ImageToVideoPollResult['status'];

  if (status === 'completed') {
    const outputUrl = task.outputs?.[0];
    if (!outputUrl) return { status: 'failed', error: 'Task completed but no output URL was returned.' };
    return { status, outputUrl };
  }

  if (status === 'failed' || status === 'cancelled' || status === 'timeout') {
    return { status, error: task.error || 'Generation failed.' };
  }

  return { status };
}
