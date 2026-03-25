import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator, TrendingOFCreator } from '@/lib/models';
import { getApifyCredentials, markKeyBurned } from '@/lib/apify-key';
import jwt from 'jsonwebtoken';

function getAdmin(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret') as any;
    return decoded.isAdmin ? decoded : null;
  } catch {
    return null;
  }
}

function parseSentryItem(item: any) {
  const username = item.onlyfansUsername || '';
  if (!username) return null;

  return {
    name: item.displayName || username,
    username,
    avatar: item.profileImage || '',
    bio: (item.bio || '').slice(0, 500),
    likesCount: parseInt(String(item.likes || '0').replace(/,/g, ''), 10) || 0,
    photosCount: parseInt(String(item.photos || '0').replace(/,/g, ''), 10) || 0,
    videosCount: parseInt(String(item.videos || '0').replace(/,/g, ''), 10) || 0,
    price: parseFloat(String(item.price || '0').replace(/[^0-9.]/g, '')) || 0,
    isFree: String(item.price || '').toLowerCase() === 'free' || item.price === '0' || item.price === '0.00' || item.price === 0,
    url: item.onlyfansLink || `https://onlyfans.com/${username}`,
    gender: 'female' as const,
  };
}

function parseIgolaItem(item: any) {
  const username = item.username || '';
  if (!username) return null;

  return {
    name: item.name || username,
    username,
    avatar: item.image || (item.images?.[0]?.url) || '',
    bio: (item.description || '').slice(0, 500),
    likesCount: typeof item.likes === 'number' ? item.likes : parseInt(String(item.likes || '0').replace(/,/g, ''), 10) || 0,
    photosCount: 0,
    videosCount: 0,
    price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price || '0')) || 0,
    isFree: item.price === 0 || item.price === 'Free',
    url: item.link || `https://onlyfans.com/${username}`,
    gender: 'female' as const,
    categories: Array.isArray(item.category) ? item.category.filter((c: string) => c !== 'male') : [],
  };
}

export async function POST(req: NextRequest) {
  if (!getAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { username, categories, trendingSlot } = await req.json();
  if (!username) return NextResponse.json({ error: 'username is required' }, { status: 400 });

  const cleanUsername = username.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?onlyfans\.com\//i, '').replace(/[/?#].*$/, '').trim();
  if (!cleanUsername) return NextResponse.json({ error: 'Invalid username' }, { status: 400 });

  const slug = cleanUsername.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  await connectDB();

  // Check if already in DB with good data
  const existing = await OnlyFansCreator.findOne({ slug }).lean() as any;
  if (existing && existing.avatar) {
    const creator = { ...existing, _id: existing._id.toString() };

    let trendingResult = null;
    if (trendingSlot && trendingSlot >= 1 && trendingSlot <= 4) {
      trendingResult = await addToTrendingSlot(creator, trendingSlot);
    }

    return NextResponse.json({ creator, trending: trendingResult, source: 'database' });
  }

  // Scrape via Apify — same mechanism as /api/onlyfans/scrape
  const creds = await getApifyCredentials();
  if (!creds) {
    // No Apify keys — create a basic entry from what we know
    return await createBasicEntry(cleanUsername, slug, categories, trendingSlot);
  }

  const { token: APIFY_TOKEN, actor: APIFY_ACTOR } = creds;
  const isSentry = APIFY_ACTOR.includes('sentry');
  const actorId = APIFY_ACTOR.replace('/', '~');

  const input = isSentry
    ? { searchMode: 'top', additionalKeywords: cleanUsername, maxProfiles: 5, requireInstagram: false, scrapeOtherSocials: false, scrollPatience: 10, maxPages: 3 }
    : { maxItems: 5, query: cleanUsername, gender: 'female', sort: 'popular', minPrice: 0, maxPrice: 0 };

  try {
    let runRes = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
    );

    if (!runRes.ok) {
      if (runRes.status === 401) {
        await markKeyBurned(APIFY_TOKEN);
        const creds2 = await getApifyCredentials();
        if (!creds2) return await createBasicEntry(cleanUsername, slug, categories, trendingSlot);

        runRes = await fetch(
          `https://api.apify.com/v2/acts/${actorId}/runs?token=${creds2.token}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
        );
        if (!runRes.ok) return await createBasicEntry(cleanUsername, slug, categories, trendingSlot);
      } else {
        return await createBasicEntry(cleanUsername, slug, categories, trendingSlot);
      }
    }

    const runData = await runRes.json();
    const runId = runData.data?.id;
    if (!runId) return await createBasicEntry(cleanUsername, slug, categories, trendingSlot);

    // Poll for completion (3 min max for single profile)
    let status = runData.data?.status;
    const maxWait = 3 * 60 * 1000;
    const start = Date.now();
    const finalToken = creds.token;

    while (!['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
      if (Date.now() - start > maxWait) return await createBasicEntry(cleanUsername, slug, categories, trendingSlot);
      await new Promise((r) => setTimeout(r, 4000));
      const poll = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${finalToken}`);
      status = (await poll.json()).data?.status;
    }

    if (status !== 'SUCCEEDED') return await createBasicEntry(cleanUsername, slug, categories, trendingSlot);

    const datasetRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${finalToken}&limit=10`,
    );
    const items = await datasetRes.json();

    if (!Array.isArray(items) || items.length === 0) {
      return await createBasicEntry(cleanUsername, slug, categories, trendingSlot);
    }

    // Find the matching profile from results
    const targetLower = cleanUsername.toLowerCase();
    let matched = null;
    for (const item of items) {
      const parsed = isSentry ? parseSentryItem(item) : parseIgolaItem(item);
      if (!parsed) continue;
      if (parsed.username.toLowerCase() === targetLower) {
        matched = { ...parsed, scrapedCategories: isSentry ? [] : (parseIgolaItem(item)?.categories || []) };
        break;
      }
    }

    // If no exact match, try partial match or take first result
    if (!matched) {
      for (const item of items) {
        const parsed = isSentry ? parseSentryItem(item) : parseIgolaItem(item);
        if (!parsed) continue;
        if (parsed.username.toLowerCase().includes(targetLower) || targetLower.includes(parsed.username.toLowerCase())) {
          matched = { ...parsed, scrapedCategories: isSentry ? [] : (parseIgolaItem(item)?.categories || []) };
          break;
        }
      }
    }

    if (!matched) return await createBasicEntry(cleanUsername, slug, categories, trendingSlot);

    // Save to DB using same logic as /api/onlyfans/scrape
    const catList = Array.isArray(categories) && categories.length > 0
      ? categories.map((c: string) => c.toLowerCase().trim()).filter(Boolean)
      : [];
    const allCats = [...new Set([...catList, ...(matched.scrapedCategories || [])])];

    const updateOp: any = {
      $set: {
        name: matched.name,
        username: matched.username,
        slug,
        avatar: matched.avatar,
        header: '',
        bio: matched.bio,
        subscriberCount: 0,
        likesCount: matched.likesCount,
        mediaCount: matched.photosCount + matched.videosCount,
        photosCount: matched.photosCount,
        videosCount: matched.videosCount,
        price: matched.price,
        isFree: matched.isFree,
        isVerified: false,
        gender: matched.gender,
        url: matched.url,
        scrapedAt: new Date(),
      },
    };
    if (allCats.length > 0) updateOp.$addToSet = { categories: { $each: allCats } };

    const creatorDoc = await OnlyFansCreator.findOneAndUpdate(
      { slug },
      updateOp,
      { upsert: true, new: true },
    );

    const finalDoc = await OnlyFansCreator.findById(creatorDoc._id).lean() as any;
    const creator = { ...finalDoc, _id: finalDoc._id.toString() };

    let trendingResult = null;
    if (trendingSlot && trendingSlot >= 1 && trendingSlot <= 4) {
      trendingResult = await addToTrendingSlot(creator, trendingSlot);
    }

    return NextResponse.json({ creator, trending: trendingResult, source: 'apify' });

  } catch (error: any) {
    console.error('Import scrape error:', error);
    return await createBasicEntry(cleanUsername, slug, categories, trendingSlot);
  }
}

async function addToTrendingSlot(creator: any, position: number) {
  await TrendingOFCreator.findOneAndDelete({ position });
  const trending = await TrendingOFCreator.create({
    name: creator.name,
    username: creator.username,
    avatar: creator.avatar,
    url: creator.url,
    bio: creator.bio || '',
    categories: creator.categories || [],
    position,
    active: true,
    clicks: 0,
  });
  return { position, id: trending._id.toString() };
}

async function createBasicEntry(username: string, slug: string, categories?: string[], trendingSlot?: number) {
  await connectDB();

  const catList = Array.isArray(categories) && categories.length > 0
    ? categories.map((c: string) => c.toLowerCase().trim()).filter(Boolean)
    : [];

  const updateOp: any = {
    $set: {
      name: username,
      username,
      slug,
      url: `https://onlyfans.com/${username}`,
      scrapedAt: new Date(),
    },
    $setOnInsert: {
      avatar: '',
      header: '',
      bio: '',
      subscriberCount: 0,
      likesCount: 0,
      mediaCount: 0,
      photosCount: 0,
      videosCount: 0,
      price: 0,
      isFree: true,
      isVerified: false,
      gender: 'female',
    },
  };
  if (catList.length > 0) updateOp.$addToSet = { categories: { $each: catList } };

  const creatorDoc = await OnlyFansCreator.findOneAndUpdate(
    { slug },
    updateOp,
    { upsert: true, new: true },
  );

  const finalDoc = await OnlyFansCreator.findById(creatorDoc._id).lean() as any;
  const creator = { ...finalDoc, _id: finalDoc._id.toString() };

  let trendingResult = null;
  if (trendingSlot && trendingSlot >= 1 && trendingSlot <= 4) {
    trendingResult = await addToTrendingSlot(creator, trendingSlot);
  }

  return NextResponse.json({
    creator,
    trending: trendingResult,
    source: 'manual',
    warning: 'Could not auto-fetch profile data. Creator added with basic info — edit details manually.',
  });
}
