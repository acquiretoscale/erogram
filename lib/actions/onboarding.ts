'use server';

import connectDB from '@/lib/db/mongodb';
import { User, OnlyFansCreator, Group, BookmarkFolder, Bookmark } from '@/lib/models';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

// Maps OF category slugs (lowercase, hyphenated) → Group category strings (Title Case)
// Groups and OF use different naming; this bridges them for unified querying.
const OF_SLUG_TO_GROUP_CATEGORIES: Record<string, string[]> = {
  'asian':      ['Asian'],
  'blonde':     ['Blonde'],
  'brunette':   ['Brunette'],
  'redhead':    ['Red Hair'],
  'big-ass':    ['Big Ass'],
  'big-boobs':  ['Big Tits'],
  'petite':     ['Petite'],
  'amateur':    ['Amateur'],
  'curvy':      [],                    // no matching group category
  'latina':     ['Latina'],
  'ebony':      ['Ebony', 'Black'],
  'milf':       ['MILF'],
  'teen':       [],
  'goth':       ['Fantasy'],
  'cosplay':    ['Cosplay'],
  'feet':       ['Feet'],
  'lesbian':    ['Lesbian'],
  'tattoo':     ['Fetish'],
  'fitness':    [],
  'alt':        ['Fantasy'],
  'ahegao':     [],
  'streamer':   ['AI NSFW'],
  'joi':        [],
  'thick':      ['Big Ass', 'Big Tits'],
  'twerk':      [],
  'squirt':     ['Squirting'],
  'piercing':   ['Fetish'],
  'lingerie':   ['Fetish'],
};

function toGroupCategories(ofSlugs: string[]): string[] {
  const result = new Set<string>();
  for (const slug of ofSlugs) {
    const mapped = OF_SLUG_TO_GROUP_CATEGORIES[slug];
    if (mapped) {
      for (const g of mapped) result.add(g);
    }
  }
  return Array.from(result);
}

async function getUserIdFromToken(token: string): Promise<string | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded?.id || null;
  } catch {
    return null;
  }
}

export async function getTopCreatorsForCategories(categories: string[], limit = 6) {
  if (!categories.length) return [];
  await connectDB();

  const creators = await OnlyFansCreator.find({
    categories: { $in: categories },
    avatar: { $ne: '' },
    gender: 'female',
    deleted: { $ne: true },
  })
    .sort({ clicks: -1 })
    .limit(limit)
    .select('_id name username slug avatar header subscriberCount categories')
    .lean();

  return creators.map((c: any) => ({
    _id: c._id.toString(),
    name: c.name,
    username: c.username,
    slug: c.slug,
    avatar: c.avatar,
    header: c.header || '',
    subscriberCount: c.subscriberCount || 0,
    categories: c.categories || [],
    type: 'creator' as const,
  }));
}

export async function getTopGroupsForCategories(ofSlugs: string[], limit = 6) {
  if (!ofSlugs.length) return [];
  await connectDB();

  const groupCats = toGroupCategories(ofSlugs);
  if (!groupCats.length) return [];

  const groups = await Group.find({
    $or: [
      { categories: { $in: groupCats } },
      { category: { $in: groupCats } },
    ],
    status: 'approved',
    deletedAt: null,
    premiumOnly: { $ne: true },
    image: { $nin: ['', null] },
  })
    .sort({ memberCount: -1, views: -1 })
    .limit(limit)
    .select('_id name slug image category categories country memberCount')
    .lean();

  return groups.map((g: any) => ({
    _id: g._id.toString(),
    name: g.name,
    slug: g.slug,
    image: g.image || '/assets/placeholder-no-image.png',
    category: g.category,
    categories: g.categories || [],
    country: g.country || '',
    memberCount: g.memberCount || 0,
    type: 'group' as const,
  }));
}

// Returns a single interleaved feed: creators + groups mixed together,
// sorted so groups appear roughly every 2-3 creators for a natural feel.
export async function getMixedFeed(ofSlugs: string[], options: {
  creatorLimit?: number;
  groupLimit?: number;
} = {}) {
  const { creatorLimit = 6, groupLimit = 6 } = options;

  const [creators, groups] = await Promise.all([
    getTopCreatorsForCategories(ofSlugs, creatorLimit),
    getTopGroupsForCategories(ofSlugs, groupLimit),
  ]);

  // Interleave: 2 creators, 1 group, 2 creators, 1 group…
  const feed: Array<typeof creators[0] | typeof groups[0]> = [];
  let ci = 0;
  let gi = 0;
  let slot = 0;

  while (ci < creators.length || gi < groups.length) {
    if (slot % 3 === 2 && gi < groups.length) {
      feed.push(groups[gi++]);
    } else if (ci < creators.length) {
      feed.push(creators[ci++]);
    } else if (gi < groups.length) {
      feed.push(groups[gi++]);
    }
    slot++;
  }

  return { feed, creators, groups };
}

export async function getVaultPreviewGroups(ofSlugs: string[], limit = 15) {
  await connectDB();

  // Only featured vault teaser groups, with images
  const baseFilter: Record<string, unknown> = {
    premiumOnly: true,
    showOnVaultTeaser: true,
    status: 'approved',
    image: { $nin: ['', null] },
  };

  const groups = await Group.find(baseFilter)
    .sort({ vaultTeaserOrder: 1, memberCount: -1 })
    .limit(limit)
    .select('_id image category')
    .lean();

  return groups.map((g: any) => ({
    _id: g._id.toString(),
    image: g.image || '/assets/placeholder-no-image.png',
    category: g.category || '',
  }));
}

export async function saveOnboardingPreferences(
  token: string,
  data: {
    interests: string[];
    preferredPlatforms: string[];
    interestedInAI: boolean;
  }
) {
  const userId = await getUserIdFromToken(token);
  if (!userId) return { ok: false };

  await connectDB();

  await User.findByIdAndUpdate(userId, {
    $set: {
      interests: data.interests,
      preferredPlatforms: data.preferredPlatforms,
      interestedInAI: data.interestedInAI,
    },
  });

  return { ok: true };
}

export async function completeOnboarding(
  token: string,
  data: {
    creatorIds: string[];
    groupIds: string[];
  }
) {
  const userId = await getUserIdFromToken(token);
  if (!userId) return { ok: false };

  await connectDB();

  const ops: Promise<any>[] = [];

  if (data.creatorIds.length > 0) {
    ops.push(
      User.findByIdAndUpdate(userId, {
        $addToSet: { savedCreators: { $each: data.creatorIds } },
      })
    );
  }

  if (data.groupIds.length > 0) {
    for (const gId of data.groupIds) {
      ops.push(
        Bookmark.findOneAndUpdate(
          { userId, itemType: 'group', itemId: gId },
          { $setOnInsert: { userId, itemType: 'group', itemId: gId } },
          { upsert: true }
        )
      );
    }
  }

  ops.push(
    User.findByIdAndUpdate(userId, {
      $set: { onboardingCompleted: true },
    })
  );

  await Promise.all(ops);

  return { ok: true };
}

export async function checkOnboardingStatus(token: string) {
  const userId = await getUserIdFromToken(token);
  if (!userId) return { completed: true };

  await connectDB();
  const user = await User.findById(userId).select('onboardingCompleted').lean() as any;
  if (!user) return { completed: true };

  return { completed: !!user.onboardingCompleted };
}
