'use server';

import connectDB from '@/lib/db/mongodb';
import { Types } from 'mongoose';
import { OnlyFansCreator, SearchQuery } from '@/lib/models';

const CREATOR_PROJECT = {
  $project: {
    name: 1, username: 1, slug: 1, avatar: 1, header: 1,
    categories: 1, subscriberCount: 1,
    likesCount: 1, photosCount: 1, videosCount: 1,
    price: 1, isFree: 1, url: 1, clicks: 1,
  },
};

// ---------------------------------------------------------------------------
// Browse — random creators excluding already-loaded IDs
// ---------------------------------------------------------------------------

export async function browseCreators(excludeIds: string[] = [], limit = 80) {
  await connectDB();

  const match: Record<string, any> = {
    avatar: { $ne: '' },
    gender: 'female',
    categories: { $exists: true, $ne: [] },
    deleted: { $ne: true },
  };

  if (excludeIds.length > 0) {
    match._id = { $nin: excludeIds.map((id) => new Types.ObjectId(id)) };
  }

  const [creators, total] = await Promise.all([
    OnlyFansCreator.aggregate([
      { $match: match },
      { $sample: { size: Math.min(limit, 200) } },
      CREATOR_PROJECT,
    ]),
    OnlyFansCreator.estimatedDocumentCount(),
  ]);

  const hasMore = excludeIds.length + creators.length < total;

  return {
    creators: creators.map((c: any) => ({ ...c, _id: c._id.toString() })),
    hasMore,
    total,
  };
}

// ---------------------------------------------------------------------------
// Search — synonym-aware full-text search
// ---------------------------------------------------------------------------

const MAX_TOTAL = 1000;
const SCRAPE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const KNOWN_TERMS = new Set([
  'asian', 'blonde', 'teen', 'milf', 'amateur', 'redhead', 'goth',
  'petite', 'big ass', 'big-ass', 'big boobs', 'big-boobs',
  'brunette', 'latina', 'ahegao', 'alt',
  'cosplay', 'fitness', 'tattoo', 'curvy', 'ebony',
  'feet', 'lingerie', 'thick', 'twerk', 'squirt',
  'streamer', 'piercing',
  'france', 'germany', 'spain', 'italy', 'uk', 'usa', 'brazil',
  'colombia', 'mexico', 'argentina', 'japan', 'philippines', 'australia',
  'canada', 'russia', 'ukraine', 'poland', 'romania', 'czech', 'netherlands',
  'big booty', 'big-booty', 'booty', 'ass', 'butt',
  'big tits', 'big-tits', 'busty', 'boobs', 'tits',
  'thicc', 'pawg', 'babe', 'hot', 'sexy',
  'inked', 'tattooed', 'tattoos',
  'fit', 'gym', 'athletic',
  'gamer', 'gaming', 'e-girl', 'egirl',
  'emo', 'punk', 'grunge', 'alternative',
  'red hair', 'ginger',
  'small', 'tiny', 'skinny', 'slim',
  'chubby', 'bbw', 'plus size', 'plus-size',
]);

const SYNONYMS: Record<string, string[]> = {
  'big booty':  ['big ass', 'big-ass', 'booty', 'ass', 'butt', 'big booty', 'big-booty', 'pawg'],
  'big-booty':  ['big ass', 'big-ass', 'booty', 'ass', 'butt', 'big booty', 'big-booty', 'pawg'],
  'booty':      ['big ass', 'big-ass', 'booty', 'ass', 'butt', 'pawg'],
  'ass':        ['big ass', 'big-ass', 'booty', 'ass', 'butt'],
  'butt':       ['big ass', 'big-ass', 'booty', 'ass', 'butt'],
  'pawg':       ['big ass', 'big-ass', 'booty', 'pawg', 'thick', 'curvy'],
  'big tits':   ['big boobs', 'big-boobs', 'busty', 'big tits', 'big-tits', 'tits', 'boobs'],
  'big-tits':   ['big boobs', 'big-boobs', 'busty', 'big tits', 'big-tits', 'tits', 'boobs'],
  'busty':      ['big boobs', 'big-boobs', 'busty', 'big tits', 'big-tits'],
  'boobs':      ['big boobs', 'big-boobs', 'busty', 'boobs', 'tits'],
  'tits':       ['big boobs', 'big-boobs', 'busty', 'boobs', 'tits'],
  'thicc':      ['thick', 'curvy', 'thicc'],
  'inked':      ['tattoo', 'inked', 'tattooed', 'tattoos'],
  'tattooed':   ['tattoo', 'inked', 'tattooed', 'tattoos'],
  'tattoos':    ['tattoo', 'inked', 'tattooed', 'tattoos'],
  'fit':        ['fitness', 'fit', 'gym', 'athletic'],
  'gym':        ['fitness', 'fit', 'gym', 'athletic'],
  'athletic':   ['fitness', 'fit', 'gym', 'athletic'],
  'gamer':      ['streamer', 'gamer', 'gaming', 'e-girl', 'egirl'],
  'gaming':     ['streamer', 'gamer', 'gaming'],
  'e-girl':     ['streamer', 'gamer', 'e-girl', 'egirl', 'alt'],
  'egirl':      ['streamer', 'gamer', 'e-girl', 'egirl', 'alt'],
  'emo':        ['goth', 'emo', 'alt', 'punk', 'grunge', 'alternative'],
  'punk':       ['goth', 'emo', 'alt', 'punk', 'alternative'],
  'grunge':     ['goth', 'emo', 'alt', 'grunge', 'alternative'],
  'alternative':['goth', 'emo', 'alt', 'alternative'],
  'red hair':   ['redhead', 'red hair', 'ginger'],
  'ginger':     ['redhead', 'red hair', 'ginger'],
  'small':      ['petite', 'small', 'tiny', 'skinny', 'slim'],
  'tiny':       ['petite', 'small', 'tiny'],
  'skinny':     ['petite', 'skinny', 'slim', 'small'],
  'slim':       ['petite', 'skinny', 'slim', 'small'],
  'chubby':     ['curvy', 'thick', 'chubby', 'plus size', 'plus-size'],
  'bbw':        ['curvy', 'thick', 'chubby', 'bbw', 'plus size', 'plus-size'],
  'plus size':  ['curvy', 'thick', 'chubby', 'plus size', 'plus-size'],
  'plus-size':  ['curvy', 'thick', 'chubby', 'plus size', 'plus-size'],
  'babe':       ['amateur', 'babe', 'hot', 'sexy'],
  'hot':        ['amateur', 'babe', 'hot', 'sexy'],
  'sexy':       ['amateur', 'babe', 'hot', 'sexy'],
};

export async function searchCreators(q: string, limit = 1000, skip = 0) {
  const trimmed = q.trim();
  if (!trimmed) return { creators: [], total: 0, shouldScrape: false };

  await connectDB();

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');
  const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');

  const categoryTerms = new Set<string>([normalized]);
  if (SYNONYMS[normalized]) {
    for (const s of SYNONYMS[normalized]) categoryTerms.add(s);
  }
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    for (const word of words) {
      categoryTerms.add(word);
      if (SYNONYMS[word]) {
        for (const s of SYNONYMS[word]) categoryTerms.add(s);
      }
    }
  }

  const categoryRegexes = [...categoryTerms].map((term) => {
    const termEscaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(termEscaped, 'i');
  });

  const match = {
    avatar: { $ne: '' },
    gender: 'female',
    categories: { $exists: true, $ne: [] },
    deleted: { $ne: true },
    $or: [
      { name: regex },
      { username: regex },
      { bio: regex },
      { categories: { $in: categoryRegexes } },
    ],
  };

  const creators = await OnlyFansCreator.aggregate([
    { $match: match },
    { $sort: { likesCount: -1, _id: 1 } },
    { $skip: Math.max(0, skip) },
    { $limit: Math.min(Math.max(1, limit), MAX_TOTAL) },
    CREATOR_PROJECT,
  ]);

  const total = creators.length;

  let shouldScrape = false;
  if (skip === 0) {
    const allWordsKnown = KNOWN_TERMS.has(normalized) ||
      (words.length > 1 && words.every((w) => KNOWN_TERMS.has(w)));
    if (!(total > 0 && allWordsKnown)) {
      shouldScrape = await logAndCheckScrapeNeeded(normalized, trimmed);
    }
  }

  return {
    creators: creators.map((c: any) => ({ ...c, _id: c._id.toString() })),
    total,
    shouldScrape,
    scrapeQuery: shouldScrape ? normalized : undefined,
  };
}

export async function deleteCreatorBySlug(token: string, slug: string) {
  const jwt = (await import('jsonwebtoken')).default;
  const { User } = await import('@/lib/models');
  const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
  try {
    const d = jwt.verify(token, JWT_SECRET) as any;
    await connectDB();
    const u = await User.findById(d.id);
    if (!u || !u.isAdmin) throw new Error('Unauthorized');
  } catch {
    throw new Error('Unauthorized');
  }
  const result = await OnlyFansCreator.findOneAndUpdate(
    { slug },
    { $set: { deleted: true, deletedAt: new Date() } },
  );
  if (!result) throw new Error('Not found');
  return { success: true };
}

async function logAndCheckScrapeNeeded(normalized: string, originalQuery: string): Promise<boolean> {
  try {
    const existing = await SearchQuery.findOneAndUpdate(
      { queryNormalized: normalized },
      {
        $inc: { searchCount: 1 },
        $set: { lastSearchedAt: new Date(), query: originalQuery },
        $setOnInsert: { queryNormalized: normalized, scraped: false, scrapeStatus: 'pending', resultsCount: 0 },
      },
      { upsert: true, new: true },
    );

    if (existing.scrapeStatus === 'scraping') return false;
    if (existing.scrapeStatus === 'done' && existing.scrapedAt) {
      if (Date.now() - new Date(existing.scrapedAt).getTime() < SCRAPE_COOLDOWN_MS) return false;
    }

    await SearchQuery.updateOne({ _id: existing._id }, { $set: { scrapeStatus: 'scraping' } });
    return true;
  } catch {
    return false;
  }
}
