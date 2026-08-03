import { Metadata } from 'next';
import connectDB from '@/lib/db/mongodb';
import { Group, Bot } from '@/lib/models';
import { AI_NSFW_TOOLS } from '@/app/ainsfw/data';
import { getApprovedSubmissions } from '@/lib/actions/ainsfw';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
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

async function getPartnershipCounts() {
  const staticSlugs = new Set(AI_NSFW_TOOLS.map((t) => t.slug));
  try {
    await connectDB();
    const [submissions, groupCount, botCount] = await Promise.all([
      getApprovedSubmissions(staticSlugs),
      Group.countDocuments({ status: 'approved', isAdvertisement: { $ne: true }, premiumOnly: { $ne: true } }),
      Bot.countDocuments({ status: 'approved', isAdvertisement: { $ne: true } }),
    ]);
    return {
      aiNsfwCount: AI_NSFW_TOOLS.length + submissions.length,
      groupsAndBotsCount: groupCount + botCount,
    };
  } catch (error) {
    console.error('Partnership stats error:', error);
    return {
      aiNsfwCount: AI_NSFW_TOOLS.length,
      groupsAndBotsCount: 0,
    };
  }
}

export default async function PartnershipPage() {
  const { aiNsfwCount, groupsAndBotsCount } = await getPartnershipCounts();
  return <PartnershipClient aiNsfwCount={aiNsfwCount} groupsAndBotsCount={groupsAndBotsCount} />;
}
