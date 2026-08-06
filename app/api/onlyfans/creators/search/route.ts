import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';

const MAX_TOTAL = 1000;

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
 * Paginated DB search. Returns a batch of creators + total count.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '40', 10)), MAX_TOTAL);
    const skip = Math.max(0, parseInt(searchParams.get('skip') || '0', 10));

    if (!q) {
      return NextResponse.json({ creators: [], total: 0 });
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

    return NextResponse.json({
      creators: creators.map((c: any) => ({ ...c, _id: c._id.toString() })),
      total,
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
