'use server';

import connectDB from '@/lib/db/mongodb';
import { countryCodeToFlag } from '@/lib/utils/geo';
import {
  User,
  Bookmark,
  CreatorReview,
  Post,
  ArticleComment,
  AINsfwToolStats,
  Vote,
} from '@/lib/models';

const MAX_CREATOR_SAVE_PTS = 20;
const BOT_CREATOR_SAVE_THRESHOLD = 50;

export type LeaderboardPeriod = 'all' | '30d' | '7d';

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  photoUrl: string | null;
  countryFlag: string;
  lastLogin: string | null;
  score: number;
  isCurrentUser: boolean;
};

function bump(
  map: Map<string, number>,
  id: string | null | undefined,
  points: number,
) {
  if (!id || points <= 0) return;
  const key = String(id);
  map.set(key, (map.get(key) || 0) + points);
}

function sinceDate(period: LeaderboardPeriod): Date | null {
  if (period === 'all') return null;
  const d = new Date();
  d.setDate(d.getDate() - (period === '7d' ? 7 : 30));
  return d;
}

function createdSince(since: Date | null): Record<string, unknown> {
  return since ? { createdAt: { $gte: since } } : {};
}

export async function getActiveUserLeaderboard(
  currentUserId?: string | null,
  limit = 100,
  period: LeaderboardPeriod = 'all',
): Promise<LeaderboardEntry[]> {
  await connectDB();

  const since = sinceDate(period);
  const dateFilter = createdSince(since);

  const aiReviewMatch: Record<string, unknown> = {
    'reviews.status': 'approved',
    'reviews.author': { $exists: true, $ne: null },
  };
  if (since) aiReviewMatch['reviews.createdAt'] = { $gte: since };

  const [bookmarkAgg, reviewAgg, postAgg, commentAgg, aiReviewAgg, voteAgg, userSignals] = await Promise.all([
    Bookmark.aggregate<{ _id: unknown; n: number }>([
      ...(since ? [{ $match: dateFilter }] : []),
      { $group: { _id: '$userId', n: { $sum: 1 } } },
    ]),
    CreatorReview.aggregate<{ _id: unknown; n: number }>([
      { $match: { status: 'approved', author: { $exists: true, $ne: null }, ...dateFilter } },
      { $group: { _id: '$author', n: { $sum: 1 } } },
    ]),
    Post.aggregate<{ _id: unknown; n: number }>([
      { $match: { author: { $exists: true, $ne: null }, ...dateFilter } },
      { $group: { _id: '$author', n: { $sum: 1 } } },
    ]),
    ArticleComment.aggregate<{ _id: unknown; n: number }>([
      { $match: { status: 'approved', author: { $exists: true, $ne: null }, ...dateFilter } },
      { $group: { _id: '$author', n: { $sum: 1 } } },
    ]),
    AINsfwToolStats.aggregate<{ _id: unknown; n: number }>([
      { $unwind: '$reviews' },
      { $match: aiReviewMatch },
      { $group: { _id: '$reviews.author', n: { $sum: 1 } } },
    ]),
    Vote.aggregate<{ _id: unknown; n: number }>([
      { $match: { vote: 'like', ...dateFilter } },
      { $group: { _id: '$userId', n: { $sum: 1 } } },
    ]),
    period === 'all'
      ? User.aggregate<{ _id: unknown; saveCount: number; onboardingCompleted: boolean; loginCount: number }>([
          { $match: { isAdmin: { $ne: true } } },
          {
            $project: {
              saveCount: { $size: { $ifNull: ['$savedCreators', []] } },
              onboardingCompleted: { $ifNull: ['$onboardingCompleted', false] },
              loginCount: { $ifNull: ['$loginCount', 0] },
            },
          },
        ])
      : Promise.resolve([]),
  ]);

  const scores = new Map<string, number>();
  const bookmarkByUser = new Map<string, number>();

  for (const row of bookmarkAgg) {
    const id = String(row._id);
    bookmarkByUser.set(id, row.n);
    bump(scores, id, row.n * 2);
  }
  for (const row of reviewAgg) bump(scores, String(row._id), row.n * 10);
  for (const row of postAgg) bump(scores, String(row._id), row.n * 10);
  for (const row of commentAgg) bump(scores, String(row._id), row.n * 5);
  for (const row of aiReviewAgg) bump(scores, String(row._id), row.n * 10);
  for (const row of voteAgg) bump(scores, String(row._id), row.n * 3);

  if (period === 'all') {
    for (const row of userSignals) {
      const id = String(row._id);
      const creatorSaves = row.saveCount || 0;
      const bookmarks = bookmarkByUser.get(id) || 0;
      const existing = scores.get(id) || 0;

      if (creatorSaves > BOT_CREATOR_SAVE_THRESHOLD && bookmarks === 0 && existing === 0) {
        scores.delete(id);
        continue;
      }

      if (creatorSaves > 0) {
        bump(scores, id, Math.min(creatorSaves, MAX_CREATOR_SAVE_PTS));
      }
      if (row.onboardingCompleted) bump(scores, id, 5);
      if (row.loginCount > 0) {
        bump(scores, id, Math.min(row.loginCount, 10));
      }
    }
  }

  const ranked = [...scores.entries()]
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (ranked.length === 0) return [];

  const topIds = ranked.map(([userId]) => userId);
  const users = await User.find({ _id: { $in: topIds } })
    .select('username firstName photoUrl isProfileVisible country lastLogin')
    .lean();

  const userById = new Map(
    (users as Array<{
      _id: unknown;
      username?: string;
      firstName?: string | null;
      photoUrl?: string | null;
      isProfileVisible?: boolean;
      country?: string | null;
      lastLogin?: Date | string | null;
    }>).map((u) => [String(u._id), u]),
  );

  return ranked.map(([userId, score], index) => {
    const u = userById.get(userId);
    const visible = u?.isProfileVisible !== false;
    const displayName = visible
      ? (u?.firstName?.trim() || u?.username || 'Member')
      : 'Anonymous';
    const lastLoginRaw = u?.lastLogin;
    const lastLogin =
      visible && lastLoginRaw
        ? new Date(lastLoginRaw).toISOString()
        : null;

    return {
      rank: index + 1,
      userId,
      displayName,
      photoUrl: visible ? (u?.photoUrl || null) : null,
      countryFlag: visible ? countryCodeToFlag(u?.country) : '',
      lastLogin,
      score,
      isCurrentUser: !!currentUserId && userId === currentUserId,
    };
  });
}
