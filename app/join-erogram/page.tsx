import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import JoinClient from './JoinClient';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';

export const dynamic = 'force-dynamic';

export default async function JoinErogramPage() {
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
    <div className="min-h-screen bg-[#060d17] flex flex-col">
      <Navbar variant="onlyfans" />
      <Suspense fallback={null}>
        <JoinClient avatars={avatars} />
      </Suspense>
      <Footer />
    </div>
  );
}
