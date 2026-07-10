import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { GroupsPageView } from '../../page';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

export const dynamic = 'force-dynamic';

const BASE_URL = CANONICAL_BASE;

type PageParams = { page: string };
type PageProps = { params: Promise<PageParams> };

function parsePageParam(pageParam: string): number {
  // Strictly accept positive integers only ("1", "2", ...). Reject "02", "1.5", "1a", etc.
  if (!/^[1-9]\d*$/.test(pageParam)) return NaN;
  return Number(pageParam);
}

export async function generateMetadata(
  { params }: PageProps
): Promise<Metadata> {
  const { page: pageParam } = await params;
  const page = parsePageParam(pageParam);
  if (!Number.isFinite(page) || page < 1) {
    // For invalid params, Next will hit `notFound()` in the page component.
    return {};
  }

  const title = page === 1
    ? 'Discover NSFW Telegram Groups'
    : `Discover NSFW Telegram Groups – Page ${page}`;

  const description = page === 1
    ? 'Browse and discover the best NSFW Telegram groups on Erogram.pro. Find verified adult communities by category, country, and interests. Updated daily with new groups.'
    : `Browse NSFW Telegram groups — page ${page}. Discover thousands of verified adult communities sorted by popularity. Find groups by category, country, and interests on Erogram.pro.`;

  const canonical = `${BASE_URL}/groups/page/${page}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: {
      index: true,
      follow: true,
    },
    ...buildSocialMeta({
      title,
      description,
      url: canonical,
      type: 'website',
    }),
  };
}

export default async function GroupsPaginatedPage(
  { params }: PageProps
) {
  const { page: pageParam } = await params;
  const page = parsePageParam(pageParam);
  if (!Number.isFinite(page) || page < 1) notFound();
  if (page === 1) redirect('/groups');

  return GroupsPageView({ page });
}
