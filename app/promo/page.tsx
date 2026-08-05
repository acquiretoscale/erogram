import type { Metadata } from 'next';
import MediaKitClient from './MediaKitClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { getPartnershipCounts } from '@/lib/partnershipCounts';

const title = 'Advertise with us | Erogram.pro';
const description = 'Advertise on Erogram.pro — the largest NSFW Telegram directory. View live audience stats, ad packages, pricing, and reach thousands of engaged adult users daily.';

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/promo`,
    type: 'website',
  }),
};

export const revalidate = 300;

export default async function AdvertisePage() {
  const { aiNsfwCount, groupsAndBotsCount, totalUsers } = await getPartnershipCounts();
  return (
    <MediaKitClient
      aiNsfwCount={aiNsfwCount}
      groupsAndBotsCount={groupsAndBotsCount}
      totalUsers={totalUsers}
    />
  );
}
