import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { AINsfwPageView } from '../../page';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n';

// Pre-rendered server HTML, refreshed in the background every 5 minutes (ISR).
export const revalidate = 300;

const BASE_URL = CANONICAL_BASE;

type PageParams = { page: string };
type PageProps = { params: Promise<PageParams> };

function parsePageParam(pageParam: string): number {
  if (!/^[1-9]\d*$/.test(pageParam)) return NaN;
  return Number(pageParam);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { page: pageParam } = await params;
  const page = parsePageParam(pageParam);
  if (!Number.isFinite(page) || page < 1) {
    return {};
  }

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const baseTitle = dict.meta.ainsfwTitle;
  const baseDesc = dict.meta.ainsfwDesc;

  const title = page === 1 ? baseTitle : `${baseTitle} - Page ${page}`;
  const description =
    page === 1
      ? baseDesc
      : `${baseDesc} Page ${page}.`;

  const canonical = page <= 1 ? `${BASE_URL}/ainsfw` : `${BASE_URL}/ainsfw/page/${page}`;

  return {
    title,
    description,
    alternates: { canonical },
    ...buildSocialMeta({
      title,
      description,
      url: canonical,
      type: 'website',
      imageAlt: 'Erogram - AI NSFW Tools',
    }),
  };
}

export default async function AINsfwPaginatedPage({ params }: PageProps) {
  const { page: pageParam } = await params;
  const page = parsePageParam(pageParam);
  if (!Number.isFinite(page) || page < 1) notFound();
  if (page === 1) redirect('/ainsfw');

  return AINsfwPageView({ page });
}
