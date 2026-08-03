import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import { User, OnlyFansCreator } from '@/lib/models';

function onlyfansLikeKey(creatorId: string) {
  return `onlyfans:${creatorId}`;
}

export async function addUserSavedOnlyFansCreator(userId: string, creatorId: string) {
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
}

export async function removeUserSavedOnlyFansCreator(userId: string, creatorId: string) {
  if (!mongoose.Types.ObjectId.isValid(creatorId)) {
    throw new Error('Invalid creatorId');
  }

  await connectDB();

  const key = onlyfansLikeKey(creatorId);
  const user = await User.findById(userId).select('savedLikesOrder').lean() as { savedLikesOrder?: string[] } | null;
  const order = Array.isArray(user?.savedLikesOrder)
    ? user.savedLikesOrder.filter((k) => k !== key)
    : [];

  await User.findByIdAndUpdate(userId, {
    $pull: { savedCreators: creatorId },
    $set: { savedLikesOrder: order },
  });
}
