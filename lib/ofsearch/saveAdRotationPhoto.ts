import { uploadToR2, isR2Configured } from '@/lib/r2';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import { optimizeCreatorPhoto, validateCreatorPhotoUpload } from '@/lib/creatorMedia';
import { MAX_CREATOR_PHOTO_BYTES } from '@/lib/creatorMediaLimits';

function adRotationPhotoKey(slug: string, index: number): string {
  const cacheBust = Date.now().toString(36);
  return `onlyfanssearch/${slug}-ad-rot-${index + 1}-${cacheBust}.jpg`;
}

/** Direct save — not a server action, so File/Buffer stays in-process. */
export async function saveAdRotationPhoto(
  slug: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  if (!slug || !file) return { error: 'Missing slug or file' };
  const sizeErr = validateCreatorPhotoUpload(file.size);
  if (sizeErr) return { error: sizeErr };
  if (!isR2Configured()) return { error: 'R2 not configured' };

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length === 0) return { error: 'File buffer empty' };

  let optimized: Buffer;
  try {
    optimized = await optimizeCreatorPhoto(buf);
    if (optimized.length > MAX_CREATOR_PHOTO_BYTES) {
      return { error: 'Photo still too large after optimization (max 1 MB)' };
    }
  } catch (e: any) {
    return { error: e.message || 'Photo optimization failed' };
  }

  await connectDB();
  const creator = (await OnlyFansCreator.findOne(
    {
      deleted: { $ne: true },
      $or: [{ slug }, { username: slug.replace(/-onlyfans$/i, '') }],
    },
    'slug avatar adRotationPhotos username',
  ).lean()) as any;
  if (!creator) return { error: 'Creator not found' };

  const dbSlug = creator.slug || slug;
  const existing: string[] = creator.adRotationPhotos || [];
  const key = adRotationPhotoKey(dbSlug, existing.length);
  let url: string;
  try {
    url = await uploadToR2(optimized, key, 'image/jpeg');
  } catch (e: any) {
    return { error: e?.message || 'Storage upload failed' };
  }

  await OnlyFansCreator.updateOne({ _id: creator._id }, { $push: { adRotationPhotos: url } });
  return { url };
}
