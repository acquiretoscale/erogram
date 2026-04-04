'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, OnlyFansCreator, TrendingOFCreator, ScrapeRun, SearchQuery, OFMSettings } from '@/lib/models';
import { getApifyCredentials, markKeyBurned } from '@/lib/apify-key';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticateAdmin(token: string) {
  if (!token) return null;
  try {
    const d = jwt.verify(token, JWT_SECRET) as any;
    await connectDB();
    const u = await User.findById(d.id);
    if (u && u.isAdmin) return u;
  } catch {
    return null;
  }
  return null;
}

// ─── Helpers for import ──────────────────────────────────────────────

function parseAbbreviatedNumber(val: any): number {
  if (typeof val === 'number') return val;
  const s = String(val || '0').replace(/,/g, '').trim();
  const match = s.match(/^([0-9.]+)\s*([KkMm]?)$/);
  if (!match) return parseInt(s, 10) || 0;
  const num = parseFloat(match[1]);
  const suffix = match[2].toUpperCase();
  if (suffix === 'M') return Math.round(num * 1_000_000);
  if (suffix === 'K') return Math.round(num * 1_000);
  return Math.round(num);
}

function parseSentryItem(item: any) {
  const username = item.onlyfansUsername || '';
  if (!username) return null;

  return {
    name: item.displayName || username,
    username,
    avatar: item.profileImage || '',
    bio: (item.bio || '').slice(0, 500),
    likesCount: parseAbbreviatedNumber(item.likes),
    photosCount: parseAbbreviatedNumber(item.photos),
    videosCount: parseAbbreviatedNumber(item.videos),
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
    likesCount: parseAbbreviatedNumber(item.likes),
    photosCount: 0,
    videosCount: 0,
    price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price || '0')) || 0,
    isFree: item.price === 0 || item.price === 'Free',
    url: item.link || `https://onlyfans.com/${username}`,
    gender: 'female' as const,
    categories: Array.isArray(item.category) ? item.category.filter((c: string) => c !== 'male') : [],
  };
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

async function createBasicEntryAction(
  username: string,
  slug: string,
  categories?: string[],
  trendingSlot?: number,
) {
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
      adminImported: true,
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

  return {
    creator,
    trending: trendingResult,
    source: 'manual',
    warning: 'Could not auto-fetch profile data. Creator added with basic info — edit details manually.',
  };
}

// ─── Import OFM Creator ─────────────────────────────────────────────

export async function importOFMCreator(
  token: string,
  data: { username: string; categories?: string[]; trendingSlot?: number },
) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');

  const { username, categories, trendingSlot } = data;
  if (!username) throw new Error('username is required');

  const cleanUsername = username
    .trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?onlyfans\.com\//i, '')
    .replace(/[/?#].*$/, '')
    .trim();
  if (!cleanUsername) throw new Error('Invalid username');

  const slug = cleanUsername
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  await connectDB();

  const existing = await OnlyFansCreator.findOne({ slug }).lean() as any;
  if (existing && existing.avatar) {
    const creator = { ...existing, _id: existing._id.toString() };

    let trendingResult = null;
    if (trendingSlot && trendingSlot >= 1 && trendingSlot <= 4) {
      trendingResult = await addToTrendingSlot(creator, trendingSlot);
    }

    return JSON.parse(JSON.stringify({ creator, trending: trendingResult, source: 'database' }));
  }

  const creds = await getApifyCredentials('hello.datawizards/onlyfans-scraper');
  if (!creds) {
    const result = await createBasicEntryAction(cleanUsername, slug, categories, trendingSlot);
    return JSON.parse(JSON.stringify(result));
  }

  const { token: APIFY_TOKEN, actor: APIFY_ACTOR } = creds;
  const isSentry = APIFY_ACTOR.includes('sentry');
  const isDatawizards = APIFY_ACTOR.includes('datawizards');
  const actorId = APIFY_ACTOR.replace('/', '~');

  const input = isDatawizards
    ? { search_queries: [cleanUsername] }
    : isSentry
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
        if (!creds2) {
          const result = await createBasicEntryAction(cleanUsername, slug, categories, trendingSlot);
          return JSON.parse(JSON.stringify(result));
        }

        runRes = await fetch(
          `https://api.apify.com/v2/acts/${actorId}/runs?token=${creds2.token}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
        );
        if (!runRes.ok) {
          const result = await createBasicEntryAction(cleanUsername, slug, categories, trendingSlot);
          return JSON.parse(JSON.stringify(result));
        }
      } else {
        const result = await createBasicEntryAction(cleanUsername, slug, categories, trendingSlot);
        return JSON.parse(JSON.stringify(result));
      }
    }

    const runData = await runRes.json();
    const runId = runData.data?.id;
    if (!runId) {
      const result = await createBasicEntryAction(cleanUsername, slug, categories, trendingSlot);
      return JSON.parse(JSON.stringify(result));
    }

    let status = runData.data?.status;
    const maxWait = 3 * 60 * 1000;
    const start = Date.now();
    const finalToken = creds.token;

    while (!['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
      if (Date.now() - start > maxWait) {
        const result = await createBasicEntryAction(cleanUsername, slug, categories, trendingSlot);
        return JSON.parse(JSON.stringify(result));
      }
      await new Promise((r) => setTimeout(r, 4000));
      const poll = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${finalToken}`);
      status = (await poll.json()).data?.status;
    }

    if (status !== 'SUCCEEDED') {
      const result = await createBasicEntryAction(cleanUsername, slug, categories, trendingSlot);
      return JSON.parse(JSON.stringify(result));
    }

    const datasetRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${finalToken}&limit=10`,
    );
    const items = await datasetRes.json();

    if (!Array.isArray(items) || items.length === 0) {
      const result = await createBasicEntryAction(cleanUsername, slug, categories, trendingSlot);
      return JSON.parse(JSON.stringify(result));
    }

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

    if (!matched) {
      const result = await createBasicEntryAction(cleanUsername, slug, categories, trendingSlot);
      return JSON.parse(JSON.stringify(result));
    }

    const catList = Array.isArray(categories) && categories.length > 0
      ? categories.map((c: string) => c.toLowerCase().trim()).filter(Boolean)
      : [];
    const allCats = [...new Set([...catList, ...(matched.scrapedCategories || [])])];

    const existingDoc = await OnlyFansCreator.findOne({ slug }).select('likesCount subscriberCount photosCount videosCount mediaCount').lean() as any;
    const existingLikes = existingDoc?.likesCount || 0;
    const existingSubs = existingDoc?.subscriberCount || 0;
    const existingPhotos = existingDoc?.photosCount || 0;
    const existingVideos = existingDoc?.videosCount || 0;
    const existingMedia = existingDoc?.mediaCount || 0;

    const updateOp: any = {
      $set: {
        name: matched.name,
        username: matched.username,
        slug,
        avatar: matched.avatar,
        header: '',
        bio: matched.bio,
        likesCount: matched.likesCount >= existingLikes ? matched.likesCount : existingLikes,
        subscriberCount: matched.subscriberCount >= existingSubs ? (matched.subscriberCount || 0) : existingSubs,
        mediaCount: (matched.photosCount + matched.videosCount) >= existingMedia ? (matched.photosCount + matched.videosCount) : existingMedia,
        photosCount: matched.photosCount >= existingPhotos ? matched.photosCount : existingPhotos,
        videosCount: matched.videosCount >= existingVideos ? matched.videosCount : existingVideos,
        price: matched.price,
        isFree: matched.isFree,
        isVerified: false,
        gender: matched.gender,
        url: matched.url,
        scrapedAt: new Date(),
        adminImported: true,
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

    return JSON.parse(JSON.stringify({ creator, trending: trendingResult, source: 'apify' }));

  } catch (error: any) {
    console.error('Import scrape error:', error);
    const result = await createBasicEntryAction(cleanUsername, slug, categories, trendingSlot);
    return JSON.parse(JSON.stringify(result));
  }
}

// ─── Bulk Import (single Apify run) ──────────────────────────────────

export async function bulkImportCreators(
  token: string,
  usernames: string[],
): Promise<{ results: Array<{ input: string; status: string; creator?: any; source?: string; error?: string }> }> {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');
  await connectDB();

  const cleaned = usernames
    .map((u) => u.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?onlyfans\.com\//i, '').replace(/[/?#].*$/, '').trim().toLowerCase())
    .filter(Boolean);
  const unique = [...new Set(cleaned)];
  if (unique.length === 0) throw new Error('No valid usernames');

  const existingDocs = await OnlyFansCreator.find({ username: { $in: unique }, deleted: { $ne: true }, avatar: { $ne: '' } })
    .select('name username slug avatar bio likesCount photosCount videosCount price isFree url categories')
    .lean() as any[];
  const existingMap = new Map(existingDocs.map((d: any) => [d.username.toLowerCase(), { ...d, _id: d._id.toString() }]));

  const toScrape = unique.filter((u) => !existingMap.has(u));
  const results: Array<{ input: string; status: string; creator?: any; source?: string; error?: string }> = [];

  for (const u of unique) {
    if (existingMap.has(u)) {
      results.push({ input: u, status: 'success', creator: existingMap.get(u), source: 'database' });
    } else {
      results.push({ input: u, status: 'pending' });
    }
  }

  if (toScrape.length === 0) {
    return { results };
  }

  const creds = await getApifyCredentials('hello.datawizards/onlyfans-scraper');
  if (!creds) {
    for (const r of results) { if (r.status === 'pending') { r.status = 'failed'; r.error = 'No Apify keys'; } }
    return { results };
  }

  const actorId = creds.actor.replace('/', '~');

  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${creds.token}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ search_queries: toScrape }) },
    );

    if (!runRes.ok) {
      for (const r of results) { if (r.status === 'pending') { r.status = 'failed'; r.error = 'Apify run failed to start'; } }
      return { results };
    }

    const runData = await runRes.json();
    const runId = runData.data?.id;
    if (!runId) {
      for (const r of results) { if (r.status === 'pending') { r.status = 'failed'; r.error = 'No run ID'; } }
      return { results };
    }

    let status = runData.data?.status;
    const maxWait = 5 * 60 * 1000;
    const start = Date.now();
    while (!['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
      if (Date.now() - start > maxWait) break;
      await new Promise((r) => setTimeout(r, 5000));
      const poll = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${creds.token}`);
      status = (await poll.json()).data?.status;
    }

    if (status !== 'SUCCEEDED') {
      for (const r of results) { if (r.status === 'pending') { r.status = 'failed'; r.error = `Apify run ${status}`; } }
      return { results };
    }

    const datasetRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${creds.token}&limit=500`,
    );
    const items = await datasetRes.json();

    if (!Array.isArray(items)) {
      for (const r of results) { if (r.status === 'pending') { r.status = 'failed'; r.error = 'No data returned'; } }
      return { results };
    }

    const parsedMap = new Map<string, any>();
    for (const item of items) {
      const username = (item.username || '').toLowerCase();
      if (!username) continue;
      parsedMap.set(username, item);
    }

    for (const r of results) {
      if (r.status !== 'pending') continue;
      const raw = parsedMap.get(r.input);
      if (!raw) { r.status = 'failed'; r.error = 'Not found on OnlyFans'; continue; }

      try {
        const parsed = {
          name: raw.name || raw.username || r.input,
          username: raw.username || r.input,
          avatar: raw.avatar || '',
          header: raw.header || '',
          bio: (raw.about || '').slice(0, 500),
          likesCount: raw.favoritedCount || 0,
          photosCount: raw.photosCount || 0,
          videosCount: raw.videosCount || 0,
          mediaCount: raw.mediasCount || 0,
          postsCount: raw.postsCount || 0,
          subscriberCount: raw.subscribersCount || 0,
          price: typeof raw.subscribePrice === 'number' ? raw.subscribePrice : parseFloat(String(raw.subscribePrice || '0')) || 0,
          isFree: (raw.subscribePrice || 0) === 0,
          isVerified: raw.isVerified || false,
          url: `https://onlyfans.com/${raw.username || r.input}`,
          gender: 'female' as const,
          location: raw.location || '',
          website: raw.website || '',
          joinDate: raw.joinDate || '',
          onlyfansId: raw.id || 0,
        };

        const slug = parsed.username.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

        const doc = await OnlyFansCreator.findOneAndUpdate(
          { slug },
          {
            $set: {
              name: parsed.name, username: parsed.username, slug, avatar: parsed.avatar,
              header: parsed.header, bio: parsed.bio, subscriberCount: parsed.subscriberCount,
              likesCount: parsed.likesCount, mediaCount: parsed.mediaCount,
              photosCount: parsed.photosCount, videosCount: parsed.videosCount,
              postsCount: parsed.postsCount, price: parsed.price, isFree: parsed.isFree,
              isVerified: parsed.isVerified, gender: parsed.gender, url: parsed.url,
              location: parsed.location, website: parsed.website, joinDate: parsed.joinDate,
              onlyfansId: parsed.onlyfansId, scrapedAt: new Date(),
            },
          },
          { upsert: true, new: true },
        );

        const saved = await OnlyFansCreator.findById(doc._id).lean() as any;
        r.status = 'success';
        r.creator = { ...saved, _id: saved._id.toString() };
        r.source = 'apify';
      } catch (e: any) {
        r.status = 'failed';
        r.error = e.message || 'DB save failed';
      }
    }
  } catch (e: any) {
    for (const r of results) { if (r.status === 'pending') { r.status = 'failed'; r.error = e.message || 'Unknown error'; } }
  }

  return { results };
}

// ─── Bulk helpers ────────────────────────────────────────────────────

export async function saveBulkApifyResults(items: any[]) {
  await connectDB();
  const savedCreators: any[] = [];
  for (const item of items) {
    const username = item.username;
    if (!username) continue;
    const slug = username.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    try {
      const doc = await OnlyFansCreator.findOneAndUpdate(
        { slug },
        {
          $set: {
            name: item.name || username, username, slug,
            avatar: item.avatar || '', header: item.header || '',
            bio: (item.about || '').slice(0, 500),
            likesCount: item.favoritedCount || 0,
            photosCount: item.photosCount || 0, videosCount: item.videosCount || 0,
            mediaCount: item.mediasCount || 0, postsCount: item.postsCount || 0,
            subscriberCount: item.subscribersCount || 0,
            price: typeof item.subscribePrice === 'number' ? item.subscribePrice : parseFloat(String(item.subscribePrice || '0')) || 0,
            isFree: (item.subscribePrice || 0) === 0,
            isVerified: item.isVerified || false,
            gender: 'female', url: `https://onlyfans.com/${username}`,
            location: item.location || '', website: item.website || '',
            joinDate: item.joinDate || '', onlyfansId: item.id || 0,
            scrapedAt: new Date(),
          },
        },
        { upsert: true, new: true, strict: false },
      ).select('name username slug avatar likesCount categories price isFree url').lean() as any;
      if (doc) savedCreators.push({ ...doc, _id: doc._id.toString() });
    } catch {}
  }
  return savedCreators;
}

export async function checkExistingCreators(usernames: string[]) {
  await connectDB();
  const cleaned = usernames.map((u) => u.toLowerCase().trim()).filter(Boolean);
  const docs = await OnlyFansCreator.find({
    username: { $in: cleaned },
    deleted: { $ne: true },
    avatar: { $ne: '' },
  })
    .select('name username slug avatar likesCount categories price isFree url')
    .lean() as any[];
  return docs.map((d: any) => ({ ...d, _id: d._id.toString() }));
}

export async function getRecentImports(limit = 50) {
  await connectDB();
  const docs = await OnlyFansCreator.find({
    scrapedAt: { $exists: true },
    avatar: { $ne: '' },
    deleted: { $ne: true },
  })
    .sort({ scrapedAt: -1 })
    .limit(limit)
    .select('name username slug avatar likesCount categories scrapedAt')
    .lean() as any[];
  return docs.map((d: any) => ({ ...d, _id: d._id.toString(), scrapedAt: d.scrapedAt?.toISOString?.() || '' }));
}

// ─── Scrape Logs ─────────────────────────────────────────────────────

export async function getScrapeLogs(
  token: string,
  params: { page?: number; limit?: number; source?: string; status?: string } = {},
) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');

  await connectDB();

  const page = Math.max(1, params.page || 1);
  const limit = Math.min(params.limit || 50, 200);
  const source = params.source || 'all';
  const status = params.status || 'all';

  const match: Record<string, any> = {};
  if (source !== 'all') match.source = source;
  if (status !== 'all') match.status = status;

  const skip = (page - 1) * limit;

  const [logs, total, stats] = await Promise.all([
    ScrapeRun.find(match)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ScrapeRun.countDocuments(match),
    ScrapeRun.aggregate([
      {
        $group: {
          _id: null,
          totalRuns: { $sum: 1 },
          totalSaved: { $sum: '$saved' },
          totalItems: { $sum: '$totalItems' },
          avgDuration: { $avg: '$durationMs' },
          succeeded: { $sum: { $cond: [{ $eq: ['$status', 'succeeded'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          searchTriggered: { $sum: { $cond: [{ $eq: ['$source', 'search'] }, 1, 0] } },
          bulkTriggered: { $sum: { $cond: [{ $eq: ['$source', 'bulk'] }, 1, 0] } },
        },
      },
    ]),
  ]);

  return JSON.parse(JSON.stringify({
    logs: logs.map((l: any) => ({ ...l, _id: l._id.toString() })),
    total,
    page,
    pages: Math.ceil(total / limit),
    stats: stats[0] || { totalRuns: 0, totalSaved: 0, totalItems: 0, avgDuration: 0, succeeded: 0, failed: 0, searchTriggered: 0, bulkTriggered: 0 },
  }));
}

export async function deleteScrapeLog(token: string, id?: string, clearAll?: boolean) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');

  await connectDB();

  if (clearAll) {
    const result = await ScrapeRun.deleteMany({});
    return JSON.parse(JSON.stringify({ success: true, deleted: result.deletedCount }));
  }

  if (!id) throw new Error('id required');
  await ScrapeRun.findByIdAndDelete(id);
  return JSON.parse(JSON.stringify({ success: true }));
}

// ─── Backfill Scrape Logs ────────────────────────────────────────────

export async function backfillScrapeLogs(token: string) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');

  await connectDB();

  const existingCount = await ScrapeRun.countDocuments();
  let searchCreated = 0;
  let bulkCreated = 0;

  const queries = await SearchQuery.find({
    scrapeStatus: 'done',
  }).lean();

  for (const q of queries as any[]) {
    const alreadyExists = await ScrapeRun.findOne({
      source: 'search',
      query: q.queryNormalized || q.query?.toLowerCase(),
      startedAt: q.scrapedAt || q.lastSearchedAt || q.createdAt,
    });
    if (alreadyExists) continue;

    await ScrapeRun.create({
      source: 'search',
      query: q.queryNormalized || q.query?.toLowerCase(),
      runId: '',
      actorId: 'unknown (backfilled)',
      status: 'succeeded',
      maxItems: 200,
      totalItems: q.resultsCount || 0,
      saved: q.resultsCount || 0,
      skipped: 0,
      clean: false,
      error: '',
      apiKeyHint: '????',
      startedAt: q.scrapedAt || q.lastSearchedAt || q.createdAt,
      completedAt: q.scrapedAt || null,
      durationMs: 0,
    });
    searchCreated++;
  }

  const bulkRuns: any[] = await OnlyFansCreator.aggregate([
    { $match: { scrapedAt: { $exists: true, $ne: null }, categories: { $exists: true, $ne: [] } } },
    { $unwind: '$categories' },
    {
      $group: {
        _id: {
          category: '$categories',
          date: { $dateToString: { format: '%Y-%m-%d', date: '$scrapedAt' } },
        },
        count: { $sum: 1 },
        earliest: { $min: '$scrapedAt' },
        latest: { $max: '$scrapedAt' },
      },
    },
    { $sort: { earliest: -1 } },
  ]);

  const searchQuerySet = new Set(
    (queries as any[]).map((q) => (q.queryNormalized || q.query?.toLowerCase() || '').trim()),
  );

  for (const run of bulkRuns) {
    const cat = run._id.category;
    if (searchQuerySet.has(cat)) continue;

    const alreadyExists = await ScrapeRun.findOne({
      source: 'bulk',
      query: cat,
      startedAt: { $gte: run.earliest, $lte: run.latest },
    });
    if (alreadyExists) continue;

    await ScrapeRun.create({
      source: 'bulk',
      query: cat,
      runId: '',
      actorId: 'unknown (backfilled)',
      status: 'succeeded',
      maxItems: run.count,
      totalItems: run.count,
      saved: run.count,
      skipped: 0,
      clean: false,
      error: '',
      apiKeyHint: '????',
      startedAt: run.earliest,
      completedAt: run.latest,
      durationMs: run.latest && run.earliest
        ? new Date(run.latest).getTime() - new Date(run.earliest).getTime()
        : 0,
    });
    bulkCreated++;
  }

  const failedSearchQueries = await SearchQuery.countDocuments({ scrapeStatus: 'failed' });
  const newTotal = await ScrapeRun.countDocuments();

  return JSON.parse(JSON.stringify({
    success: true,
    previousCount: existingCount,
    searchCreated,
    bulkCreated,
    failedSearchQueries,
    totalNow: newTotal,
  }));
}

// ─── Search Queries ──────────────────────────────────────────────────

export async function getSearchQueries(
  token: string,
  params: { page?: number; limit?: number; sort?: string; order?: string; filter?: string } = {},
) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');

  await connectDB();

  const page = Math.max(1, params.page || 1);
  const limit = Math.min(params.limit || 50, 200);
  const sort = params.sort || 'searchCount';
  const order = params.order === 'asc' ? 1 : -1;
  const filter = params.filter || 'all';

  const match: Record<string, any> = {};
  if (filter === 'scraped') match.scrapeStatus = 'done';
  else if (filter === 'pending') match.scrapeStatus = 'pending';
  else if (filter === 'failed') match.scrapeStatus = 'failed';
  else if (filter === 'scraping') match.scrapeStatus = 'scraping';

  const skip = (page - 1) * limit;

  const [queries, total] = await Promise.all([
    SearchQuery.find(match)
      .sort({ [sort]: order })
      .skip(skip)
      .limit(limit)
      .lean(),
    SearchQuery.countDocuments(match),
  ]);

  return JSON.parse(JSON.stringify({
    queries: queries.map((q: any) => ({ ...q, _id: q._id.toString() })),
    total,
    page,
    pages: Math.ceil(total / limit),
  }));
}

export async function deleteSearchQuery(token: string, id: string) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');

  if (!id) throw new Error('id required');
  await connectDB();
  await SearchQuery.findByIdAndDelete(id);
  return JSON.parse(JSON.stringify({ success: true }));
}

export async function resetStuckQueries(token: string) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');

  await connectDB();

  const result = await SearchQuery.updateMany(
    { scrapeStatus: { $in: ['scraping', 'failed'] } },
    { $set: { scrapeStatus: 'pending', scraped: false } },
  );

  return JSON.parse(JSON.stringify({ success: true, reset: result.modifiedCount }));
}

// ─── OFM Settings ────────────────────────────────────────────────────

async function getOrCreateSettings() {
  let settings = await OFMSettings.findOne({ key: 'default' });
  if (!settings) {
    const envKey = process.env.APIFY_API_TOKEN;
    settings = await OFMSettings.create({
      key: 'default',
      apifyKeys: envKey
        ? [{ label: 'Default (env)', apiKey: envKey, active: true, burned: false, usageCount: 0 }]
        : [],
      apifyActor: process.env.APIFY_ONLYFANS_ACTOR || 'igolaizola/onlyfans-scraper',
    });
  }
  return settings;
}

export async function getOFMSettings(token: string) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');

  await connectDB();
  const settings = await getOrCreateSettings();
  const doc = settings.toObject();

  doc.apifyKeys = doc.apifyKeys.map((k: any) => ({
    ...k,
    apiKey: k.apiKey.length > 16
      ? k.apiKey.slice(0, 10) + '···' + k.apiKey.slice(-4)
      : '···',
  }));

  return JSON.parse(JSON.stringify(doc));
}

export async function updateOFMSettings(
  token: string,
  action: string,
  data?: Record<string, any>,
) {
  if (!(await authenticateAdmin(token))) throw new Error('Unauthorized');

  await connectDB();
  const settings = await getOrCreateSettings();

  if (action === 'add_key') {
    const { label, apiKey } = data || {};
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
      throw new Error('Invalid API key');
    }
    const exists = settings.apifyKeys.some((k: any) => k.apiKey === apiKey);
    if (exists) throw new Error('This API key already exists');

    settings.apifyKeys.push({
      label: label || `Key #${settings.apifyKeys.length + 1}`,
      apiKey,
      active: true,
      burned: false,
      usageCount: 0,
      lastUsedAt: null,
      addedAt: new Date(),
    });
    await settings.save();
    return JSON.parse(JSON.stringify({ success: true, total: settings.apifyKeys.length }));
  }

  if (action === 'toggle_key') {
    const { keyId, field } = data || {};
    const key = settings.apifyKeys.id(keyId);
    if (!key) throw new Error('Key not found');
    if (field === 'active') key.active = !key.active;
    else if (field === 'burned') { key.burned = !key.burned; if (key.burned) key.active = false; }
    await settings.save();
    return JSON.parse(JSON.stringify({ success: true }));
  }

  if (action === 'remove_key') {
    const { keyId } = data || {};
    settings.apifyKeys.pull({ _id: keyId });
    await settings.save();
    return JSON.parse(JSON.stringify({ success: true, total: settings.apifyKeys.length }));
  }

  if (action === 'update_actor') {
    const { actor } = data || {};
    if (!actor || typeof actor !== 'string') throw new Error('Invalid actor');
    settings.apifyActor = actor;
    await settings.save();
    return JSON.parse(JSON.stringify({ success: true }));
  }

  throw new Error('Unknown action');
}
