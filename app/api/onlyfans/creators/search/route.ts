import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator, SearchQuery } from '@/lib/models';

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
  // common aliases — resolved to canonical category via SYNONYMS map
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

// Maps user search terms to canonical category names stored in the DB
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

/**
 * GET /api/onlyfans/creators/search?q=query&limit=40&skip=0
 *
 * Paginated DB search. Returns a batch of creators + real total count.
 * First page (skip=0) also returns `shouldScrape` flag for background scraping.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '40', 10)), MAX_TOTAL);
    const skip = Math.max(0, parseInt(searchParams.get('skip') || '0', 10));

    if (!q) {
      return NextResponse.json({ creators: [], total: 0, shouldScrape: false });
    }

    await connectDB();

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const normalized = q.toLowerCase().trim().replace(/\s+/g, ' ');

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

    // Single $in with regexes for all category terms (much faster than N separate $or)
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
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          name: 1, username: 1, slug: 1, avatar: 1,
          bio: { $substrCP: [{ $ifNull: ['$bio', ''] }, 0, 200] },
          likesCount: 1, photosCount: 1, videosCount: 1,
          price: 1, isFree: 1, url: 1, clicks: 1, categories: 1,
        },
      },
    ]);

    const total = creators.length;

    // Only compute shouldScrape on the first page
    let shouldScrape = false;
    if (skip === 0) {
      const allWordsKnown = KNOWN_TERMS.has(normalized) ||
        (words.length > 1 && words.every((w) => KNOWN_TERMS.has(w)));
      const skipScrape = total > 0 && allWordsKnown;
      if (!skipScrape) {
        shouldScrape = await logAndCheckScrapeNeeded(normalized, q);
      }
    }

    return NextResponse.json({
      creators: creators.map((c: any) => ({ ...c, _id: c._id.toString() })),
      total,
      shouldScrape,
      scrapeQuery: shouldScrape ? normalized : undefined,
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({ error: error.message, shouldScrape: false }, { status: 500 });
  }
}

/**
 * Logs the search query and checks whether a scrape is needed.
 * Does NOT fire the scrape — the client handles that.
 */
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

    // Only skip if last successful scrape was recent
    if (existing.scrapeStatus === 'done' && existing.scrapedAt) {
      const age = Date.now() - new Date(existing.scrapedAt).getTime();
      if (age < SCRAPE_COOLDOWN_MS) return false;
    }

    // Mark as scraping so concurrent requests don't double-fire
    await SearchQuery.updateOne({ _id: existing._id }, { $set: { scrapeStatus: 'scraping' } });
    return true;
  } catch (e) {
    console.error('logAndCheckScrapeNeeded error:', e);
    return false;
  }
}
