'use server';

import jwt from 'jsonwebtoken';
import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/db/mongodb';
import { User, Campaign } from '@/lib/models';
import { slugify } from '@/lib/utils/slugify';
import {
  copyR2Object,
  deleteFromR2,
  getR2PublicUrl,
  isR2Configured,
  listR2ObjectsWithMeta,
  publicUrlToR2Key,
} from '@/lib/r2';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const VIDEO_PREFIX = 'campaigns/videos';

async function authenticateAdmin(token: string) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    await connectDB();
    const user = await User.findById(decoded.id);
    if (user?.isAdmin) return user;
  } catch {
    return null;
  }
  return null;
}

export interface AdVideoCampaignRef {
  _id: string;
  name: string;
  internalName: string;
  status: string;
  isVisible: boolean;
  slot: string;
  impressions: number;
  clicks: number;
}

export interface AdVideoRow {
  url: string;
  key: string;
  filename: string;
  size: number;
  lastModified: string;
  isR2: boolean;
  campaigns: AdVideoCampaignRef[];
  liveCampaignCount: number;
}

function normalizeVideoFilename(input: string): string {
  const trimmed = String(input || '').trim();
  const base = trimmed.replace(/\.mp4$/i, '');
  const slug = slugify(base);
  if (!slug) throw new Error('Filename is required');
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('Filename must use letters, numbers, and hyphens only');
  return `${slug}.mp4`;
}

export async function listAdVideos(token: string): Promise<{ ok: true; videos: AdVideoRow[] } | { ok: false; error: string }> {
  const admin = await authenticateAdmin(token);
  if (!admin) return { ok: false, error: 'Unauthorized' };

  await connectDB();

  const campaigns = await Campaign.find({ videoUrl: { $exists: true, $nin: [null, ''] } })
    .select('_id name internalName status isVisible slot impressions clicks videoUrl')
    .lean();

  const byUrl = new Map<string, AdVideoCampaignRef[]>();
  for (const c of campaigns) {
    const url = String((c as { videoUrl?: string }).videoUrl || '').trim();
    if (!url) continue;
    const list = byUrl.get(url) || [];
    list.push({
      _id: String(c._id),
      name: String(c.name || ''),
      internalName: String((c as { internalName?: string }).internalName || ''),
      status: String(c.status || ''),
      isVisible: (c as { isVisible?: boolean }).isVisible !== false,
      slot: String(c.slot || ''),
      impressions: Number(c.impressions || 0),
      clicks: Number(c.clicks || 0),
    });
    byUrl.set(url, list);
  }

  const r2Base = getR2PublicUrl();
  const r2Objects = isR2Configured() ? await listR2ObjectsWithMeta(VIDEO_PREFIX) : [];
  const rowsByUrl = new Map<string, AdVideoRow>();

  for (const obj of r2Objects) {
    const campaignsForUrl = byUrl.get(obj.url) || [];
    rowsByUrl.set(obj.url, {
      url: obj.url,
      key: obj.key,
      filename: obj.key.split('/').pop() || obj.key,
      size: obj.size,
      lastModified: obj.lastModified,
      isR2: true,
      campaigns: campaignsForUrl,
      liveCampaignCount: campaignsForUrl.filter((c) => c.status === 'active' && c.isVisible).length,
    });
    byUrl.delete(obj.url);
  }

  for (const [url, refs] of byUrl.entries()) {
    rowsByUrl.set(url, {
      url,
      key: publicUrlToR2Key(url) || '',
      filename: url.split('/').pop()?.split('?')[0] || url,
      size: 0,
      lastModified: '',
      isR2: !!r2Base && url.startsWith(r2Base),
      campaigns: refs,
      liveCampaignCount: refs.filter((c) => c.status === 'active' && c.isVisible).length,
    });
  }

  const videos = [...rowsByUrl.values()].sort((a, b) => {
    if (b.liveCampaignCount !== a.liveCampaignCount) return b.liveCampaignCount - a.liveCampaignCount;
    return b.size - a.size;
  });

  return { ok: true, videos };
}

export async function renameAdVideoFile(
  token: string,
  oldUrl: string,
  newFilename: string,
): Promise<{ ok: true; newUrl: string; updatedCampaigns: number } | { ok: false; error: string }> {
  const admin = await authenticateAdmin(token);
  if (!admin) return { ok: false, error: 'Unauthorized' };
  if (!isR2Configured()) return { ok: false, error: 'R2 not configured' };

  const trimmedOld = String(oldUrl || '').trim();
  const oldKey = publicUrlToR2Key(trimmedOld);
  if (!oldKey || !oldKey.startsWith(`${VIDEO_PREFIX}/`)) {
    return { ok: false, error: 'Only R2 videos under campaigns/videos can be renamed here' };
  }

  let nextFilename: string;
  try {
    nextFilename = normalizeVideoFilename(newFilename);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invalid filename' };
  }

  const newKey = `${VIDEO_PREFIX}/${nextFilename}`;
  if (newKey === oldKey) {
    return { ok: true, newUrl: trimmedOld, updatedCampaigns: 0 };
  }

  const objects = await listR2ObjectsWithMeta(VIDEO_PREFIX);
  if (objects.some((o) => o.key === newKey)) {
    return { ok: false, error: 'That filename already exists on R2' };
  }

  try {
    const newUrl = await copyR2Object(oldKey, newKey);
    await deleteFromR2(trimmedOld);

    await connectDB();
    const result = await Campaign.updateMany(
      { videoUrl: trimmedOld },
      { $set: { videoUrl: newUrl } },
    );

    revalidatePath('/groups');
    revalidatePath('/videoads');

    return { ok: true, newUrl, updatedCampaigns: result.modifiedCount };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Rename failed' };
  }
}
