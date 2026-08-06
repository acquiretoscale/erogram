'use server';

import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import type { BestOfPage } from '@/app/best-onlyfans-accounts/bestOfPages';
import { buildBestOfCreatorMatch } from '@/lib/tags/creatorMatch';

export async function getBestOfTopByClicks(page: BestOfPage, limit = 10) {
  await connectDB();
  const baseMatch = buildBestOfCreatorMatch(page);
  return OnlyFansCreator.find({ ...baseMatch, clicks: { $gt: 0 } })
    .sort({ clicks: -1 })
    .limit(limit)
    .select('_id name username slug avatar bio location likesCount mediaCount photosCount videosCount postsCount price isFree url clicks')
    .lean();
}

export async function getBestOfPreviewAvatars(pages: BestOfPage[], per = 4): Promise<Record<string, string[]>> {
  await connectDB();
  const entries = await Promise.all(
    pages.map(async (page) => {
      const baseMatch = buildBestOfCreatorMatch(page);
      const rows = await OnlyFansCreator.find(baseMatch)
        .sort({ likesCount: -1 })
        .limit(per)
        .select('avatar')
        .lean();
      const avatars = (rows as { avatar?: string }[]).map((r) => r.avatar || '').filter(Boolean);
      return [page.slug, avatars] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export async function getBestOfFillCreators(page: BestOfPage, excludeUsernames: string[], limit: number) {
  if (limit <= 0) return [];
  await connectDB();
  const baseMatch = buildBestOfCreatorMatch(page);
  return OnlyFansCreator.find({
    ...baseMatch,
    username: { $nin: excludeUsernames },
  })
    .sort({ likesCount: -1 })
    .limit(limit)
    .select('_id name username slug avatar bio location likesCount mediaCount photosCount videosCount postsCount price isFree url clicks')
    .lean();
}
