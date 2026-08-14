import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getCommunityMembers } from '@/lib/actions/communityMembers';
import CommunityClient from '../../CommunityClient';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

export const dynamic = 'force-dynamic';

type PageParams = { page: string };
type PageProps = { params: Promise<PageParams> };

function parsePageParam(pageParam: string): number {
  if (!/^[1-9]\d*$/.test(pageParam)) return NaN;
  return Number(pageParam);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { page: pageParam } = await params;
  const page = parsePageParam(pageParam);
  if (!Number.isFinite(page) || page < 1) return {};

  const title =
    page === 1
      ? 'Community Members | Erogram'
      : `Community Members - Page ${page} | Erogram`;

  const description =
    page === 1
      ? 'Browse the Erogram community. See who recently joined the platform.'
      : `Browse the Erogram community - page ${page}. See who recently joined the platform.`;

  const canonical = `${CANONICAL_BASE}/community/page/${page}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    ...buildSocialMeta({
      title,
      description,
      url: canonical,
      type: 'website',
    }),
  };
}

export default async function CommunityPaginatedPage({ params }: PageProps) {
  const { page: pageParam } = await params;
  const page = parsePageParam(pageParam);
  if (!Number.isFinite(page) || page < 1) notFound();
  if (page === 1) redirect('/community');

  const initial = await getCommunityMembers(page);
  return (
    <>
      <Navbar />
      <CommunityClient initial={initial} />
      <div style={{ background: 'linear-gradient(to bottom, #3d2538 0%, #2B1B28 100%)' }}>
        <Footer />
      </div>
    </>
  );
}
