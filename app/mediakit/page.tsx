import type { Metadata } from 'next';
import MediaKitClient from '../promo/MediaKitClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { getPartnershipCounts } from '@/lib/partnershipCounts';
import { getMediaKitContent } from '@/lib/actions/mediakitContent';

const title = 'MEDIA KIT';
const description =
  'Advertise on Erogram.pro — the largest NSFW Telegram directory. View live audience stats, ad packages, pricing, and reach thousands of engaged adult users daily.';

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  alternates: { canonical: `${CANONICAL_BASE}/promo` },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/mediakit`,
    type: 'website',
  }),
};

export const revalidate = 300;

export default async function MediaKitPage() {
  const [{ aiNsfwCount, groupsAndBotsCount, totalUsers }, mediaKitContent] = await Promise.all([
    getPartnershipCounts(),
    getMediaKitContent(),
  ]);
  return (
    <MediaKitClient
      aiNsfwCount={aiNsfwCount}
      groupsAndBotsCount={groupsAndBotsCount}
      totalUsers={totalUsers}
      mediaKitContent={mediaKitContent}
    />
  );
}