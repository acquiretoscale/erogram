import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { BotsPageView } from '../../page';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

export const revalidate = 300;

const BASE_URL = CANONICAL_BASE;

type PageParams = { page: string };
type PageProps = { params: Promise<PageParams> };

function parsePageParam(pageParam: string): number {
  if (!/^[1-9]\d*$/.test(pageParam)) return NaN;
  return Number(pageParam);
}

export async function generateMetadata(
  { params }: PageProps
): Promise<Metadata> {
  const { page: pageParam } = await params;
  const page = parsePageParam(pageParam);
  if (!Number.isFinite(page) || page < 1) return {};

  const title = page === 1
    ? 'Discover NSFW Telegram Bots'
    : `Discover NSFW Telegram Bots – Page ${page}`;

  const description = page === 1
    ? 'Browse and discover NSFW Telegram bots. Find AI companions, chat bots, and adult entertainment bots.'
    : `Browse more NSFW Telegram bots (page ${page}). Find AI companions, chat bots, and adult entertainment bots.`;

  const canonical = `${BASE_URL}/bots/page/${page}`;

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

export default async function BotsPaginatedPage(
  { params }: PageProps
) {
  const { page: pageParam } = await params;
  const page = parsePageParam(pageParam);
  if (!Number.isFinite(page) || page < 1) notFound();
  if (page === 1) redirect('/bots');

  return BotsPageView({ page });
}
