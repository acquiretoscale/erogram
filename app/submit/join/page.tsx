import { Suspense } from 'react';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator, User } from '@/lib/models';
import { presetAvatarKey } from '@/lib/userAvatars';
import { getR2PublicUrl } from '@/lib/r2';
import SubmitJoinClient from './SubmitJoinClient';

export const dynamic = 'force-dynamic';

export default async function SubmitJoinPage() {
  await connectDB();
  const docs = await OnlyFansCreator.find({
    avatar: { $exists: true, $ne: '' },
    likesCount: { $gt: 0 },
  })
    .sort({ likesCount: -1 })
    .limit(300)
    .select('avatar')
    .lean() as { avatar?: string }[];

  const topAvatars = docs
    .map((d) => d.avatar as string)
    .filter((url): url is string => !!url && url.length > 5);

  const avatars = topAvatars.slice(0, 60);
  const userCount = await User.countDocuments({});
  const totalUsers = userCount + 110000;

  const r2Base = getR2PublicUrl();
  const presetAvatars = r2Base
    ? Array.from({ length: 4 }, (_, i) => `${r2Base}/${presetAvatarKey(i + 1)}`)
    : [];
  const creatorAvatars = topAvatars.slice(0, 5);
  const userAvatars: string[] = [];
  for (let i = 0; i < Math.max(presetAvatars.length, creatorAvatars.length); i++) {
    if (i < creatorAvatars.length) userAvatars.push(creatorAvatars[i]);
    if (i < presetAvatars.length) userAvatars.push(presetAvatars[i]);
  }

  return (
    <Suspense fallback={null}>
      <SubmitJoinClient avatars={avatars} totalUsers={totalUsers} userAvatars={userAvatars} />
    </Suspense>
  );
}
