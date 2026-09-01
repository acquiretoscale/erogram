import connectDB from '@/lib/db/mongodb';
import { Group, Bot, User } from '@/lib/models';
import { AI_NSFW_TOOLS } from '@/app/ainsfw/data';
import { getApprovedSubmissions } from '@/lib/actions/ainsfw';

export async function getErogramReachStats() {
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
    console.error('Erogram reach stats error:', error);
  }

  return { aiNsfwCount, groupsAndBotsCount, totalUsers };
}
