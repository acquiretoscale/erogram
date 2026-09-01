import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import { getCreatorByUsername } from '@/lib/actions/ofCreatorProfile';
import { onlyFansExternalUrl } from '@/lib/ofsearch/creatorUrls';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ username: string }>;
}

/** Hop page: never index. robots.txt also Disallows /go/. */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Redirecting…',
    robots: { index: false, follow: false },
  };
}

export default async function GoCreatorPage({ params }: PageProps) {
  const { username } = await params;

  const creator = await getCreatorByUsername(username);
  if (!creator) notFound();

  // Fire-and-forget organic click count (separate from paid campaign tracking).
  connectDB()
    .then(() => OnlyFansCreator.findByIdAndUpdate(creator._id, { $inc: { clicks: 1 } }))
    .catch(() => {});

  redirect(onlyFansExternalUrl(creator.username, creator.url));
}
