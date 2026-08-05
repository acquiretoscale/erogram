import { Metadata } from 'next';
import connectDB from '@/lib/db/mongodb';
import { Group, Bot, User } from '@/lib/models';
import { AI_NSFW_TOOLS } from '@/app/ainsfw/data';
import { getApprovedSubmissions } from '@/lib/actions/ainsfw';
import AINSFWPricingClient from './AINSFWPricingClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const title = 'Add AI NSFW Tool | Erogram';
const description = 'List your AI NSFW tool on Erogram. Get featured placement, instant approval, and reach 180K+ monthly visitors.';

export const metadata: Metadata = {
  title,
  description,
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/add/ainsfw`,
    type: 'website',
  }),
};

export default async function AddAINSFWPage() {
  const staticSlugs = new Set(AI_NSFW_TOOLS.map((t) => t.slug));
  let aiNsfwCount = AI_NSFW_TOOLS.length;
  let groupsAndBotsCount = 0;
  let totalUsers = 110_000;
  try {
    await connectDB();
    const [submissions, groupCount, botCount, userCount] = await Promise.all([
      getApprovedSubmissions(staticSlugs),
      Group.countDocuments({ status: 'approved', isAdvertisement: { $ne: true }, premiumOnly: { $ne: true } }),
      Bot.countDocuments({ status: 'approved', isAdvertisement: { $ne: true } }),
      User.countDocuments({}),
    ]);
    aiNsfwCount = AI_NSFW_TOOLS.length + submissions.length;
    groupsAndBotsCount = groupCount + botCount;
    totalUsers = userCount + 110_000;
  } catch (error) {
    console.error('Add AINSFW stats error:', error);
  }

  return (
    <AINSFWPricingClient
      aiNsfwCount={aiNsfwCount}
      groupsAndBotsCount={groupsAndBotsCount}
      totalUsers={totalUsers}
    />
  );
}
