import connectDB from '@/lib/db/mongodb';
import { Group, Bot, User } from '@/lib/models';
import { AI_NSFW_TOOLS } from '@/app/ainsfw/data';
import { getApprovedSubmissions } from '@/lib/actions/ainsfw';

export async function getPartnershipCounts() {
  const staticSlugs = new Set(AI_NSFW_TOOLS.map((t) => t.slug));
  try {
    await connectDB();
    const [submissions, groupCount, botCount, userCount] = await Promise.all([
      getApprovedSubmissions(staticSlugs),
      Group.countDocuments({ status: 'approved', isAdvertisement: { $ne: true }, premiumOnly: { $ne: true } }),
      Bot.countDocuments({ status: 'approved', isAdvertisement: { $ne: true } }),
      User.countDocuments({}),
    ]);
    return {
      aiNsfwCount: AI_NSFW_TOOLS.length + submissions.length,
      groupsAndBotsCount: groupCount + botCount,
      totalUsers: userCount + 110_000,
    };
  } catch (error) {
    console.error('Partnership stats error:', error);
    return {
      aiNsfwCount: AI_NSFW_TOOLS.length,
      groupsAndBotsCount: 0,
      totalUsers: 110_000,
    };
  }
}
