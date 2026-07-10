import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTagDetail } from '@/lib/actions/tags';
import TagDetailClient from '../TagDetailClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { getLocale } from '@/lib/i18n/server';
import { localePath } from '@/lib/i18n';

export const revalidate = 3600;

const BASE = CANONICAL_BASE;

interface PageProps {
  params: Promise<{ tag: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await getLocale();
  const { tag } = await params;
  const detail = await getTagDetail(tag, locale);
  if (!detail) return { title: 'Tag Not Found | Erogram' };

  const title = `${detail.label} — Groups & Creators | Erogram`;
  const description = `Browse ${detail.total} ${detail.label} Telegram groups and OnlyFans creators on Erogram.`;
  const canonical = `${BASE}${localePath(`/tags/${detail.slug}`, locale)}`;

  return {
    title,
    description,
    alternates: { canonical },
    ...buildSocialMeta({
      title,
      description,
      url: canonical,
      type: 'website',
    }),
  };
}

export default async function TagDetailPage({ params }: PageProps) {
  const locale = await getLocale();
  const { tag } = await params;
  const detail = await getTagDetail(tag, locale);
  if (!detail) notFound();

  return (
    <TagDetailClient
      label={detail.label}
      slug={detail.slug}
      groupCount={detail.groupCount}
      creatorCount={detail.creatorCount}
      total={detail.total}
      groups={detail.groups}
      rankingPages={detail.rankingPages}
      top10={detail.top10}
      categoryBrowseHref={detail.categoryBrowseHref}
      creators={detail.creators}
    />
  );
}
