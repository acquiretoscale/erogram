import { Suspense } from 'react';
import JoinClient from './JoinClient';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';

export const dynamic = 'force-dynamic';

export default async function JoinErogramPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: initialRedirect } = await searchParams;
  await connectDB();
  const docs = await OnlyFansCreator.find({
    avatar: { $exists: true, $ne: '' },
    likesCount: { $gt: 0 },
  })
    .sort({ likesCount: -1 })
    .limit(60)
    .select('avatar')
    .lean() as any[];

  const avatars = docs
    .map((d: any) => d.avatar as string)
    .filter((url): url is string => !!url && url.length > 5);

  return (
    <Suspense fallback={null}>
      <JoinClient avatars={avatars} initialRedirect={initialRedirect ?? null} />
    </Suspense>
  );
}
