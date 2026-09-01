import connectDB from '@/lib/db/mongodb';
import { TrendingOFCreator } from '@/lib/models';

/** Doc fields checked before the promoted-username lookup. */
export type CreatorProfileEligibilityDoc = {
  username?: string;
  featured?: boolean;
};

let promotedCache: { usernames: Set<string>; at: number } | null = null;
const PROMOTED_CACHE_MS = 60_000;

/** Paid TrendingOFCreator slot usernames (lowercase). */
export async function getPromotedCreatorUsernames(): Promise<Set<string>> {
  if (promotedCache && Date.now() - promotedCache.at < PROMOTED_CACHE_MS) {
    return promotedCache.usernames;
  }
  await connectDB();
  const rows = await TrendingOFCreator.find({}, 'username').lean();
  const usernames = new Set(
    (rows as Array<{ username?: string }>)
      .map((r) => (r.username || '').trim().toLowerCase())
      .filter(Boolean),
  );
  promotedCache = { usernames, at: Date.now() };
  return usernames;
}

/** Sync check when promoted set is already loaded. Featured/promoted only — no adminImported. */
export function isCreatorEligibleForProfilePage(
  doc: CreatorProfileEligibilityDoc,
  promotedUsernames?: ReadonlySet<string>,
): boolean {
  if (doc.featured) return true;
  const username = (doc.username || '').trim().toLowerCase();
  if (username && promotedUsernames?.has(username)) return true;
  return false;
}

export async function isCreatorEligibleForProfilePageAsync(doc: CreatorProfileEligibilityDoc): Promise<boolean> {
  if (doc.featured) return true;
  const username = (doc.username || '').trim().toLowerCase();
  if (!username) return false;
  const promoted = await getPromotedCreatorUsernames();
  return promoted.has(username);
}

/** Mongo filter for related-creator queries — promoted usernames merged in at query time. */
export function buildCreatorProfilePageFilter(promotedUsernames: ReadonlySet<string>) {
  const promotedList = [...promotedUsernames];
  const or: Record<string, unknown>[] = [{ featured: true }];
  if (promotedList.length > 0) {
    or.push({ username: { $in: promotedList } });
  }
  return { $or: or };
}
