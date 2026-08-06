import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import { User, OnlyFansCreator, ProfileFeedLike } from '@/lib/models';

function onlyfansLikeKey(creatorId: string) {
  return `onlyfans:${creatorId}`;
}

export function mediaKeyFor(creatorId: string, type: string, url: string) {
  return `${creatorId}:${type}:${url}`;
}

function collectCreatorDualPhotos(creator: {
  avatar?: string;
  header?: string;
}) {
  const out: { type: 'photo'; url: string }[] = [];
  const seen = new Set<string>();
  const add = (url?: string) => {
    if (url?.startsWith('http') && !seen.has(url)) {
      seen.add(url);
      out.push({ type: 'photo', url });
    }
  };
  add(creator.avatar);
  add(creator.header);
  return out;
}

function dualPhotoMediaKeys(creatorId: string, creator: { avatar?: string; header?: string }) {
  return collectCreatorDualPhotos(creator).map((p) => mediaKeyFor(creatorId, p.type, p.url));
}

export function parseOnlyFansUsernameInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/onlyfans\.com\/([a-zA-Z0-9._-]+)/i);
  if (urlMatch) return urlMatch[1].toLowerCase();
  const handleMatch = trimmed.match(/^@?([a-zA-Z0-9._-]+)$/);
  if (handleMatch) return handleMatch[1].toLowerCase();
  return null;
}

async function ensureCreatorFeedLike(
  userId: string,
  creatorId: string,
  likeMediaKey?: string,
) {
  const creator = await OnlyFansCreator.findById(creatorId)
    .select('avatar header')
    .lean() as { avatar?: string; header?: string } | null;

  const keysToLike = new Set<string>(creator ? dualPhotoMediaKeys(creatorId, creator) : []);
  if (likeMediaKey) keysToLike.add(likeMediaKey);

  for (const mediaKey of keysToLike) {
    const existing = await ProfileFeedLike.findOne({ userId, mediaKey });
    if (!existing) {
      await ProfileFeedLike.create({ mediaKey, creatorId, userId });
    }
  }
}

export async function addUserSavedOnlyFansCreator(
  userId: string,
  creatorId: string,
  options?: { likeMediaKey?: string },
) {
  if (!mongoose.Types.ObjectId.isValid(creatorId)) {
    throw new Error('Invalid creatorId');
  }

  await connectDB();

  const creator = await OnlyFansCreator.findById(creatorId).select('_id').lean();
  if (!creator) {
    throw new Error('Creator not found');
  }

  const key = onlyfansLikeKey(creatorId);
  const user = await User.findById(userId).select('savedLikesOrder').lean() as { savedLikesOrder?: string[] } | null;
  const order = Array.isArray(user?.savedLikesOrder) ? user.savedLikesOrder : [];
  const newOrder = order.includes(key) ? order : [key, ...order];

  await User.findByIdAndUpdate(userId, {
    $addToSet: { savedCreators: creatorId },
    $set: { savedLikesOrder: newOrder },
  });

  await ensureCreatorFeedLike(userId, creatorId, options?.likeMediaKey);
}

export async function removeUserSavedOnlyFansCreator(userId: string, creatorId: string) {
  if (!mongoose.Types.ObjectId.isValid(creatorId)) {
    throw new Error('Invalid creatorId');
  }

  await connectDB();

  const key = onlyfansLikeKey(creatorId);
  const legacyKey = `creator:${creatorId}`;
  const user = await User.findById(userId).select('savedLikesOrder').lean() as { savedLikesOrder?: string[] } | null;
  const order = Array.isArray(user?.savedLikesOrder)
    ? user.savedLikesOrder.filter((k) => k !== key && k !== legacyKey)
    : [];

  await User.findByIdAndUpdate(userId, {
    $pull: { savedCreators: creatorId },
    $set: { savedLikesOrder: order },
  });
}

export async function saveOnlyFansCreatorByUsernameInput(userId: string, input: string) {
  const username = parseOnlyFansUsernameInput(input);
  if (!username) {
    throw new Error('Invalid username or link');
  }

  await connectDB();
  const creator = await OnlyFansCreator.findOne({ username, deleted: { $ne: true } })
    .select('_id')
    .lean();

  if (!creator) {
    throw new Error('Creator not found');
  }

  const creatorId = String((creator as { _id: unknown })._id);
  await addUserSavedOnlyFansCreator(userId, creatorId);
  return { creatorId };
}

export async function getCreatorDualPhotoLikeStatus(userId: string, creatorIds: string[]) {
  const validIds = creatorIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!validIds.length) return {} as Record<string, boolean>;

  await connectDB();
  const creators = await OnlyFansCreator.find({ _id: { $in: validIds } })
    .select('avatar header')
    .lean() as { _id: mongoose.Types.ObjectId; avatar?: string; header?: string }[];

  const creatorKeyMap = new Map<string, string[]>();
  const allMediaKeys: string[] = [];
  for (const creator of creators) {
    const id = String(creator._id);
    const keys = dualPhotoMediaKeys(id, creator);
    creatorKeyMap.set(id, keys);
    allMediaKeys.push(...keys);
  }

  if (!allMediaKeys.length) {
    return Object.fromEntries(validIds.map((id) => [id, false]));
  }

  const likedRows = await ProfileFeedLike.find({ userId, mediaKey: { $in: allMediaKeys } })
    .select('mediaKey')
    .lean();
  const likedSet = new Set(likedRows.map((row) => row.mediaKey as string));

  const result: Record<string, boolean> = {};
  for (const id of validIds) {
    const keys = creatorKeyMap.get(id) || [];
    result[id] = keys.length > 0 && keys.some((key) => likedSet.has(key));
  }
  return result;
}

export async function toggleCreatorDualPhotoLikes(userId: string, creatorId: string) {
  if (!mongoose.Types.ObjectId.isValid(creatorId)) {
    throw new Error('Invalid creatorId');
  }

  await connectDB();
  const creator = await OnlyFansCreator.findById(creatorId)
    .select('avatar header')
    .lean() as { avatar?: string; header?: string } | null;

  if (!creator) {
    throw new Error('Creator not found');
  }

  const mediaKeys = dualPhotoMediaKeys(creatorId, creator);
  if (!mediaKeys.length) {
    return { liked: false as const };
  }

  const existing = await ProfileFeedLike.find({ userId, mediaKey: { $in: mediaKeys } })
    .select('mediaKey')
    .lean();
  const hasAny = existing.length > 0;

  if (hasAny) {
    await ProfileFeedLike.deleteMany({ userId, mediaKey: { $in: mediaKeys } });
    return { liked: false as const };
  }

  for (const mediaKey of mediaKeys) {
    await ProfileFeedLike.create({ mediaKey, creatorId, userId });
  }
  return { liked: true as const };
}
