'use server';

import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';

export async function getPendingCreators() {
  await connectDB();
  const docs = await OnlyFansCreator.find({
    $or: [
      { submissionStatus: 'pending' },
      { submittedByUser: true },
    ],
  })
    .sort({ createdAt: -1 })
    .select('name username slug avatar header bio categories location price url extraPhotos submissionStatus createdAt')
    .lean();
  return docs.map((d: any) => ({ ...d, _id: d._id.toString() }));
}

export async function updateCreatorStatus(id: string, status: 'approved' | 'rejected') {
  await connectDB();
  await OnlyFansCreator.findByIdAndUpdate(id, { $set: { submissionStatus: status } });
}

export async function deleteCreator(id: string) {
  await connectDB();
  await OnlyFansCreator.findByIdAndDelete(id);
}

export async function editCreator(id: string, data: { name?: string; bio?: string; avatar?: string; categories?: string[] }) {
  await connectDB();
  const update: Record<string, any> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.bio !== undefined) update.bio = data.bio;
  if (data.avatar !== undefined) update.avatar = data.avatar;
  if (data.categories !== undefined) update.categories = data.categories;
  if (Object.keys(update).length > 0) {
    await OnlyFansCreator.findByIdAndUpdate(id, { $set: update });
  }
}
