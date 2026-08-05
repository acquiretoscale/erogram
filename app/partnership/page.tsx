import { Metadata } from 'next';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { getPartnershipCounts } from '@/lib/partnershipCounts';
import PartnershipClient from './PartnershipClient';

const title = 'EROgram Badge | Erogram.pro';
const description =
  'Display a small Featured on EROGRAM badge on your website and unlock free exposure across one of the fastest-growing adult discovery platforms.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${CANONICAL_BASE}/partnership` },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/partnership`,
    type: 'website',
  }),
};

export const revalidate = 300;

export default async function PartnershipPage() {
  const { aiNsfwCount, groupsAndBotsCount, totalUsers } = await getPartnershipCounts();
  return (
    <PartnershipClient
      aiNsfwCount={aiNsfwCount}
      groupsAndBotsCount={groupsAndBotsCount}
      totalUsers={totalUsers}
    />
  );
}
