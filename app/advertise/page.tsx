import type { Metadata } from 'next';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { getPartnershipCounts } from '@/lib/partnershipCounts';
import AINSFWPricingClient from '@/app/add/ainsfw/AINSFWPricingClient';

const title = 'Advertise on Erogram';
const description = 'Advertise on Erogram. Reach high-intent visitors across AI NSFW, Telegram bots, and OnlyFans discovery.';

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/advertise`,
    type: 'website',
  }),
};

export const revalidate = 300;

export default async function AdvertisePage() {
  const { aiNsfwCount, groupsAndBotsCount, totalUsers } = await getPartnershipCounts();
  return (
    <AINSFWPricingClient
      pageVariant="advertise"
      aiNsfwCount={aiNsfwCount}
      groupsAndBotsCount={groupsAndBotsCount}
      totalUsers={totalUsers}
    />
  );
}
