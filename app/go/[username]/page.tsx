import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import { getCreatorByUsername } from '@/lib/actions/ofCreatorProfile';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const creator = await getCreatorByUsername(username);
  if (!creator) return { title: 'Not Found', robots: { index: false, follow: false } };
  const title = `${creator.name} OnlyFans — Erogram`;
  return {
    title,
    robots: { index: false, follow: false },
    ...buildSocialMeta({
      title,
      description: `${creator.name} OnlyFans on Erogram.`,
      url: `${CANONICAL_BASE}/go/${username}`,
      type: 'profile',
      image: creator.avatar || creator.header,
      imageAlt: `${creator.name} OnlyFans`,
    }),
  };
}

export default async function GoCreatorPage({ params }: PageProps) {
  const { username } = await params;
  const creator = await getCreatorByUsername(username);
  if (!creator?.url) notFound();

  // Fire-and-forget organic click count (separate from paid campaign tracking).
  connectDB()
    .then(() => OnlyFansCreator.findByIdAndUpdate(creator._id, { $inc: { clicks: 1 } }))
    .catch(() => {});

  const sep = creator.url.includes('?') ? '&' : '?';
  redirect(`${creator.url}${sep}utm_source=erogram.pro&utm_medium=referral`);
}
