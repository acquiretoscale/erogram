'use server';

import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import { deleteFromR2 } from '@/lib/r2';

export interface CreatorProfile {
  _id: string;
  name: string;
  username: string;
  slug: string;
  bio: string;
  avatar: string;
  avatarThumbC50: string;
  avatarThumbC144: string;
  header: string;
  categories: string[];
  subscriberCount: number;
  likesCount: number;
  mediaCount: number;
  photosCount: number;
  videosCount: number;
  audiosCount: number;
  postsCount: number;
  price: number;
  isFree: boolean;
  isVerified: boolean;
  url: string;
  gender: string;
  scrapedAt: string | null;
  lastSeen: string;
  location: string;
  website: string;
  joinDate: string;
  onlyfansId: number;
  hasStories: boolean;
  hasStream: boolean;
  tipsEnabled: boolean;
  tipsMin: number;
  tipsMax: number;
  finishedStreamsCount: number;
  instagramUrl: string;
  instagramUsername: string;
  twitterUrl: string;
  tiktokUrl: string;
  fanslyUrl: string;
  pornhubUrl: string;
  telegramUrl: string;
  extraPhotos: string[];
}

export async function getCreatorBySlug(slug: string): Promise<CreatorProfile | null> {
  try {
    await connectDB();
    const creator = await OnlyFansCreator.findOne({ slug, deleted: { $ne: true } }).lean();
    if (!creator) return null;

    const c = creator as any;
    return {
      _id: c._id.toString(),
      name: c.name || '',
      username: c.username || '',
      slug: c.slug || '',
      bio: c.bio || '',
      avatar: c.avatar || '',
      avatarThumbC50: c.avatarThumbC50 || '',
      avatarThumbC144: c.avatarThumbC144 || '',
      header: c.header || '',
      categories: c.categories || [],
      subscriberCount: c.subscriberCount || 0,
      likesCount: c.likesCount || 0,
      mediaCount: c.mediaCount || 0,
      photosCount: c.photosCount || 0,
      videosCount: c.videosCount || 0,
      audiosCount: c.audiosCount || 0,
      postsCount: c.postsCount || 0,
      price: c.price || 0,
      isFree: c.isFree || false,
      isVerified: c.isVerified || false,
      url: c.url || '',
      gender: c.gender || 'unknown',
      scrapedAt: c.scrapedAt ? new Date(c.scrapedAt).toISOString() : null,
      lastSeen: c.lastSeen || '',
      location: c.location || '',
      website: c.website || '',
      joinDate: c.joinDate || '',
      onlyfansId: c.onlyfansId || 0,
      hasStories: c.hasStories || false,
      hasStream: c.hasStream || false,
      tipsEnabled: c.tipsEnabled || false,
      tipsMin: c.tipsMin || 0,
      tipsMax: c.tipsMax || 0,
      finishedStreamsCount: c.finishedStreamsCount || 0,
      instagramUrl: c.instagramUrl || '',
      instagramUsername: c.instagramUsername || '',
      twitterUrl: c.twitterUrl || '',
      tiktokUrl: c.tiktokUrl || '',
      fanslyUrl: c.fanslyUrl || '',
      pornhubUrl: c.pornhubUrl || '',
      telegramUrl: c.telegramUrl || '',
      extraPhotos: c.extraPhotos || [],
    };
  } catch {
    return null;
  }
}

export async function getRelatedCreators(
  categories: string[],
  excludeSlug: string,
  limit = 6
): Promise<CreatorProfile[]> {
  try {
    await connectDB();
    const creators = await OnlyFansCreator.find({
      categories: { $in: categories },
      slug: { $ne: excludeSlug },
      avatar: { $ne: '' },
      deleted: { $ne: true },
    })
      .sort({ likesCount: -1 })
      .limit(limit)
      .select('name username slug avatar header categories subscriberCount likesCount photosCount videosCount price isFree isVerified url location')
      .lean();

    return (creators as any[]).map((c) => ({
      _id: c._id.toString(),
      name: c.name || '',
      username: c.username || '',
      slug: c.slug || '',
      bio: '',
      avatar: c.avatar || '',
      avatarThumbC50: '',
      avatarThumbC144: '',
      header: c.header || '',
      categories: c.categories || [],
      subscriberCount: c.subscriberCount || 0,
      likesCount: c.likesCount || 0,
      mediaCount: 0,
      photosCount: c.photosCount || 0,
      videosCount: c.videosCount || 0,
      audiosCount: 0,
      postsCount: 0,
      price: c.price || 0,
      isFree: c.isFree || false,
      isVerified: c.isVerified || false,
      url: c.url || '',
      gender: 'female',
      scrapedAt: null,
      lastSeen: '',
      location: c.location || '',
      website: '',
      joinDate: '',
      onlyfansId: 0,
      hasStories: false,
      hasStream: false,
      tipsEnabled: false,
      tipsMin: 0,
      tipsMax: 0,
      finishedStreamsCount: 0,
      instagramUrl: '',
      instagramUsername: '',
      twitterUrl: '',
      tiktokUrl: '',
      fanslyUrl: '',
      pornhubUrl: '',
      telegramUrl: '',
      extraPhotos: [],
    }));
  } catch {
    return [];
  }
}

// ── Admin actions ──

export async function updateCreatorFields(slug: string, fields: Record<string, any>) {
  await connectDB();
  await OnlyFansCreator.updateOne({ slug }, { $set: fields }, { strict: false });
  return { success: true };
}

export async function deleteCreatorPhoto(slug: string, photoType: 'avatar' | 'header' | 'extra', extraIndex?: number) {
  await connectDB();
  const creator = await OnlyFansCreator.findOne({ slug }).lean() as any;
  if (!creator) return { success: false };

  if (photoType === 'avatar') {
    await deleteFromR2(creator.avatar);
    await OnlyFansCreator.updateOne({ slug }, { $set: { avatar: '' } });
  } else if (photoType === 'header') {
    await deleteFromR2(creator.header);
    await OnlyFansCreator.updateOne({ slug }, { $set: { header: '' } });
  } else if (photoType === 'extra' && typeof extraIndex === 'number') {
    const extras: string[] = creator.extraPhotos || [];
    if (extras[extraIndex]) {
      await deleteFromR2(extras[extraIndex]);
      extras.splice(extraIndex, 1);
      await OnlyFansCreator.updateOne({ slug }, { $set: { extraPhotos: extras } }, { strict: false });
    }
  }
  return { success: true };
}

export async function deleteCreator(slug: string) {
  await connectDB();
  const creator = await OnlyFansCreator.findOne({ slug }).lean() as any;
  if (!creator) return { success: false };

  if (creator.avatar) await deleteFromR2(creator.avatar).catch(() => {});
  if (creator.header) await deleteFromR2(creator.header).catch(() => {});
  for (const url of creator.extraPhotos || []) {
    if (url) await deleteFromR2(url).catch(() => {});
  }

  await OnlyFansCreator.updateOne({ slug }, { $set: { deleted: true, deletedAt: new Date() } });
  return { success: true };
}
