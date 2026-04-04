import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator, ScrapeRun, SearchQuery } from '@/lib/models';
import { getApifyCredentials, markKeyBurned } from '@/lib/apify-key';
import { processCreatorImages } from '@/lib/actions/creatorImages';

const MAX_PROFILES_PER_SCRAPE = 15;

export const maxDuration = 300;

/**
 * DELETE /api/onlyfans/scrape
 * Body: { runId: string }
 * Aborts a running Apify actor run.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { runId } = await req.json();
    if (!runId) return NextResponse.json({ error: 'runId required' }, { status: 400 });

    const creds = await getApifyCredentials();
    if (!creds) return NextResponse.json({ error: 'No Apify keys' }, { status: 500 });

    const abortRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/abort?token=${creds.token}`,
      { method: 'POST' },
    );
    if (!abortRes.ok) {
      const body = await abortRes.text();
      return NextResponse.json({ error: 'Failed to abort', details: body }, { status: 502 });
    }
    return NextResponse.json({ success: true, runId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * POST /api/onlyfans/scrape
 * Body: { category: string, maxItems?: number, clean?: boolean, country?: string }
 *
 * Supports multiple Apify actors — auto-detects format based on actor name:
 *   - sentry/onlyfans-discovery-scraper (additionalKeywords, maxProfiles, searchMode)
 *   - igolaizola/onlyfans-scraper       (category/query, maxItems, gender)
 *
 * Uses rotating API keys from OFM Settings.
 */
export async function POST(req: NextRequest) {
  const scrapeStart = Date.now();
  try {
    const { category, maxItems: rawMax = 200, clean = false, country, source = 'bulk', usernames, asyncMode = false } = await req.json();
    const maxItems = Math.min(Math.max(1, rawMax), MAX_PROFILES_PER_SCRAPE);
    if (!category && !usernames) {
      return NextResponse.json({ error: 'category or usernames is required' }, { status: 400 });
    }

    const isAdminSource = source === 'bulk' || source === 'admin' || source === 'import';
    const actorOverride = isAdminSource ? 'hello.datawizards/onlyfans-scraper' : undefined;
    const creds = await getApifyCredentials(actorOverride);
    if (!creds) {
      return NextResponse.json({ error: 'No active Apify API keys. Add keys in OFM Settings.' }, { status: 500 });
    }

    const { token: APIFY_TOKEN, actor: APIFY_ACTOR } = creds;
    const actorId = APIFY_ACTOR.replace('/', '~');
    const catLower = (category || 'profile-update').toLowerCase();
    const isTopBrowse = catLower === 'top';
    const isSentry = APIFY_ACTOR.includes('sentry');
    const isDatawizards = APIFY_ACTOR.includes('datawizards');
    const keyHint = APIFY_TOKEN.slice(-4);

    // Username-based scrape: pass usernames directly to the actor
    const isUsernameScrape = Array.isArray(usernames) && usernames.length > 0;
    const input = isUsernameScrape
      ? { search_queries: usernames }
      : isDatawizards
      ? buildDatawizardsInput(category, maxItems, isTopBrowse, country)
      : isSentry
      ? buildSentryInput(category, maxItems, isTopBrowse)
      : buildIgolaInput(category, maxItems, isTopBrowse, country);

    await connectDB();
    const logEntry = await ScrapeRun.create({
      source,
      query: catLower,
      actorId: APIFY_ACTOR,
      status: 'running',
      maxItems,
      clean,
      apiKeyHint: keyHint,
      startedAt: new Date(),
    });

    // Admin bulk import: fire async run, return runId immediately so client can poll
    if (source === 'admin' && isDatawizards && isUsernameScrape && asyncMode) {
      const runRes = await fetch(
        `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
      );
      if (!runRes.ok) {
        const errBody = await runRes.text();
        await ScrapeRun.findByIdAndUpdate(logEntry._id, { status: 'failed', error: errBody.slice(0, 200), completedAt: new Date(), durationMs: Date.now() - scrapeStart });
        return NextResponse.json({ error: 'Apify run failed to start', details: errBody.slice(0, 200) }, { status: 502 });
      }
      const runData = await runRes.json();
      const runId = runData.data?.id;
      await ScrapeRun.findByIdAndUpdate(logEntry._id, { runId });
      return NextResponse.json({ runId, token: APIFY_TOKEN, logId: logEntry._id.toString() });
    }

    // Admin bulk import (non-async): use sync endpoint
    if (source === 'admin' && isDatawizards && isUsernameScrape) {
      const syncRes = await fetch(
        `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
      );

      if (!syncRes.ok) {
        const errBody = await syncRes.text();
        await ScrapeRun.findByIdAndUpdate(logEntry._id, { status: 'failed', error: errBody.slice(0, 200), completedAt: new Date(), durationMs: Date.now() - scrapeStart });
        return NextResponse.json({ error: 'Apify sync run failed', details: errBody.slice(0, 200) }, { status: 502 });
      }

      const items = await syncRes.json();
      if (!Array.isArray(items) || items.length === 0) {
        await ScrapeRun.findByIdAndUpdate(logEntry._id, { status: 'succeeded', saved: 0, totalItems: 0, completedAt: new Date(), durationMs: Date.now() - scrapeStart });
        return NextResponse.json({ success: true, saved: 0, savedCreators: [], totalItems: 0 });
      }

      const savedCreators: any[] = [];
      for (const item of items) {
        const parsed = parseDatawizardsItem(item);
        if (!parsed) continue;
        const slug = parsed.username.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        try {
          const setFields: Record<string, any> = {
            name: parsed.name, username: parsed.username, slug, avatar: parsed.avatar,
            bio: parsed.bio, likesCount: parsed.likesCount, photosCount: parsed.photosCount,
            videosCount: parsed.videosCount, price: parsed.price, isFree: parsed.isFree,
            isVerified: parsed.isVerified || false, gender: parsed.gender, url: parsed.url,
            scrapedAt: new Date(),
          };
          const dwFields = ['header','avatarThumbC50','avatarThumbC144','audiosCount','postsCount','subscriberCount','mediaCount','privateArchivedPostsCount','favoritesCount','location','website','joinDate','firstPublishedPostDate','onlyfansId','hasStories','hasStream','hasScheduledStream','tipsEnabled','tipsTextEnabled','tipsMin','tipsMinInternal','tipsMax','finishedStreamsCount','showMediaCount','isRestricted','canEarn','canChat','subscriptionBundles','promotions'] as const;
          for (const f of dwFields) { if (f in parsed && (parsed as any)[f] !== undefined && (parsed as any)[f] !== '') setFields[f] = (parsed as any)[f]; }

          const doc = await OnlyFansCreator.findOneAndUpdate(
            { slug }, { $set: setFields }, { upsert: true, new: true, strict: false },
          ).select('name username slug avatar likesCount categories price isFree url').lean() as any;
          if (doc) savedCreators.push({ ...doc, _id: doc._id.toString() });
        } catch {}
      }

      await ScrapeRun.findByIdAndUpdate(logEntry._id, { status: 'succeeded', saved: savedCreators.length, totalItems: items.length, completedAt: new Date(), durationMs: Date.now() - scrapeStart });
      return NextResponse.json({ success: true, saved: savedCreators.length, savedCreators, totalItems: items.length });
    }

    // Non-admin: use async /runs endpoint + polling
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
    );

    if (!runRes.ok) {
      const errBody = await runRes.text();
      let errJson: any = {};
      try { errJson = JSON.parse(errBody); } catch {}
      const errType = errJson?.error?.type || '';
      const errMsg = errJson?.error?.message || errBody;

      if (errType === 'actor-is-not-rented' || errType === 'not-enough-usage-to-run-paid-actor') {
        await ScrapeRun.findByIdAndUpdate(logEntry._id, { status: 'failed', error: errMsg, completedAt: new Date(), durationMs: Date.now() - scrapeStart });
        await updateSearchQueryStatus(source, catLower, 'failed', 0);
        return NextResponse.json({ error: errMsg }, { status: 402 });
      }

      if (runRes.status === 401) {
        await markKeyBurned(APIFY_TOKEN);
      }

      await ScrapeRun.findByIdAndUpdate(logEntry._id, { status: 'failed', error: errMsg, completedAt: new Date(), durationMs: Date.now() - scrapeStart });
      await updateSearchQueryStatus(source, catLower, 'failed', 0);
      return NextResponse.json({ error: 'Apify run failed', details: errMsg }, { status: 502 });
    }

    return await processRun(runRes, APIFY_TOKEN, actorId, maxItems, catLower, clean, isSentry, isDatawizards, logEntry._id, scrapeStart, source);
  } catch (error: any) {
    console.error('Scrape error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── Input builders per actor ────────────────────────────────────

function buildSentryInput(category: string, maxProfiles: number, isTop: boolean) {
  return {
    searchMode: 'top',
    additionalKeywords: isTop ? '' : category,
    maxProfiles,
    requireInstagram: false,
    scrapeOtherSocials: false,
    scrollPatience: 15,
    maxPages: 50,
  };
}

function buildIgolaInput(category: string, maxItems: number, isTop: boolean, country?: string) {
  const input: Record<string, any> = {
    maxItems,
    gender: 'female',
    sort: 'popular',
    minPrice: 0,
    maxPrice: 0,
  };
  if (!isTop) input.category = category;
  if (country && country !== 'any') input.country = country;
  return input;
}

function buildDatawizardsInput(category: string, _maxItems: number, isTop: boolean, _country?: string) {
  return {
    search_queries: isTop ? ['top'] : [category],
  };
}

// ── Output parsers per actor ────────────────────────────────────

const BLOCK_KEYWORDS = [
  'gay', 'male model', 'boy/boy', 'guy/guy', 'm4m', 'men only',
  'lgbt', 'lgbtq', 'lgbtq+', 'queer', 'bi male', 'bicurious',
  'trans', 'trans girl', 'transgirl', 'tgirl', 't-girl', 'transgender',
  'shemale', 'she-male', 'tranny', 'ladyboy', 'lady boy',
  'femboy', 'fem boy', 'femboi', 'sissy', 'twink', 'bear',
  'crossdress', 'crossdresser', 'cross dresser', 'drag queen',
  'ftm', 'f2m', 'mtf', 'm2f', 'nonbinary', 'non-binary', 'enby', 'genderfluid',
  'boyfriend', 'husband', 'him', 'his', 'he/him', 'he / him',
  'king', 'daddy', 'daddydom', 'alpha male',
  'cock', 'dick', 'bbc', 'bwc', 'hung',
  'male stripper', 'male escort', 'gay porn', 'gay for pay',
  'manly', 'muscleman', 'muscle man', 'jock', 'fratboy', 'frat boy',
  'boy next door', 'college boy', 'college guy', 'male content',
  'man on man', 'guy on guy', 'men on men', 'boy on boy',
  'for the ladies', 'for women', 'for her',
  'bodybuilder male', 'male fitness', 'men fitness',
  'cuckold', 'bull', 'hotwife husband',
  'bi couple', 'gay couple', 'male couple',
  'prince', 'zaddy', 'sugar daddy',
];

const BLOCK_USERNAME_KEYWORDS = [
  'gay', 'trans', 'femboy', 'sissy', 'twink', 'daddy',
  'king', 'prince', 'boy', 'guy', 'man', 'male', 'dude', 'bro',
];

function containsBlockedContent(bio: string, name: string, username: string): boolean {
  const bioLower = bio.toLowerCase();
  const nameLower = name.toLowerCase();
  const userLower = username.toLowerCase();

  if (BLOCK_KEYWORDS.some(k => bioLower.includes(k))) return true;
  if (BLOCK_USERNAME_KEYWORDS.some(k => userLower === k || userLower.startsWith(k + '_') || userLower.endsWith('_' + k))) return true;
  if (BLOCK_KEYWORDS.some(k => nameLower.includes(k))) return true;

  return false;
}

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

  const name = item.displayName || username;
  const bio = item.bio || '';

  if (containsBlockedContent(bio, name, username)) return null;

  const firstLink = (arr: any[]) => (Array.isArray(arr) && arr[0]?.url) ? arr[0].url : '';

  return {
    name,
    username,
    avatar: item.profileImage || '',
    bio: bio.slice(0, 500),
    likesCount: parseAbbreviatedNumber(item.likes),
    subscriberCount: 0,
    mediaCount: 0,
    photosCount: parseAbbreviatedNumber(item.photos),
    videosCount: parseAbbreviatedNumber(item.videos),
    price: parseFloat(String(item.price || '0').replace(/[^0-9.]/g, '')) || 0,
    isFree: String(item.price || '').toLowerCase() === 'free' || item.price === '0' || item.price === '0.00' || item.price === 0,
    isVerified: false,
    url: item.onlyfansLink || `https://onlyfans.com/${username}`,
    gender: 'female' as const,
    lastSeen: item.lastSeen || '',
    instagramUrl: item.primaryInstagram || firstLink(item.instagramLinks),
    instagramUsername: item.primaryInstagramUsername || '',
    twitterUrl: firstLink(item.twitterLinks),
    tiktokUrl: firstLink(item.tiktokLinks),
    fanslyUrl: firstLink(item.fanslyLinks),
    pornhubUrl: firstLink(item.pornhubLinks),
  };
}

function parseIgolaItem(item: any) {
  const username = item.username || '';
  if (!username) return null;
  const tags: string[] = item.category || [];

  if (tags.includes('male') || tags.includes('trans') || tags.includes('gay') || tags.includes('couple')) return null;

  const name = item.name || username;
  const bio = item.description || '';

  if (containsBlockedContent(bio, name, username)) return null;

  return {
    name,
    username,
    avatar: item.image || (item.images?.[0]?.url) || '',
    bio: bio.slice(0, 500),
    likesCount: parseAbbreviatedNumber(item.likes),
    subscriberCount: 0,
    mediaCount: 0,
    photosCount: 0,
    videosCount: 0,
    price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price || '0')) || 0,
    isFree: item.price === 0 || item.price === 'Free',
    isVerified: false,
    url: item.link || `https://onlyfans.com/${username}`,
    gender: 'female' as const,
  };
}

function parseDatawizardsItem(item: any) {
  const username = item.username || '';
  if (!username) return null;

  const name = item.name || username;
  const bio = item.about || '';

  const subPrice = typeof item.subscribePrice === 'number' ? item.subscribePrice : parseFloat(String(item.subscribePrice || '0')) || 0;

  return {
    name,
    username,
    avatar: item.avatar || '',
    avatarThumbC50: item.avatarThumbs?.c50 || '',
    avatarThumbC144: item.avatarThumbs?.c144 || '',
    header: item.header || '',
    bio: bio.slice(0, 500),
    likesCount: item.favoritedCount || 0,
    photosCount: item.photosCount || 0,
    videosCount: item.videosCount || 0,
    audiosCount: item.audiosCount || 0,
    mediaCount: item.mediasCount || 0,
    postsCount: item.postsCount || 0,
    privateArchivedPostsCount: item.privateArchivedPostsCount || 0,
    subscriberCount: item.subscribersCount || 0,
    favoritesCount: item.favoritesCount || 0,
    price: subPrice,
    isFree: subPrice === 0,
    isVerified: item.isVerified || false,
    isRestricted: item.isRestricted || false,
    canEarn: item.canEarn || false,
    canChat: item.canChat || false,
    url: `https://onlyfans.com/${username}`,
    gender: 'female' as const,
    lastSeen: item.lastSeen || '',
    location: item.location || '',
    website: item.website || '',
    joinDate: item.joinDate || '',
    firstPublishedPostDate: item.firstPublishedPostDate || '',
    onlyfansId: item.id || 0,
    hasStories: item.hasStories || false,
    hasStream: item.hasStream || false,
    hasScheduledStream: item.hasScheduledStream || false,
    tipsEnabled: item.tipsEnabled || false,
    tipsTextEnabled: item.tipsTextEnabled || false,
    tipsMin: item.tipsMin || 0,
    tipsMinInternal: item.tipsMinInternal || 0,
    tipsMax: item.tipsMax || 0,
    finishedStreamsCount: item.finishedStreamsCount || 0,
    showMediaCount: item.showMediaCount || false,
    subscriptionBundles: item.subscription_bundles || null,
    promotions: Array.isArray(item.promotions) ? item.promotions.filter(Boolean) : [],
  };
}

// ── SearchQuery status helper ───────────────────────────────────

async function updateSearchQueryStatus(source: string, query: string, status: 'done' | 'failed', savedCount: number) {
  if (source !== 'search') return;
  try {
    await SearchQuery.updateOne(
      { queryNormalized: query },
      {
        $set: {
          scraped: status === 'done',
          scrapeStatus: status,
          scrapedAt: new Date(),
          resultsCount: savedCount,
        },
      },
    );
  } catch (e) {
    console.error('Failed to update SearchQuery status:', e);
  }
}

// ── Run processor ───────────────────────────────────────────────

async function processRun(
  runRes: Response,
  token: string,
  actorId: string,
  maxItems: number,
  catLower: string,
  clean: boolean,
  isSentry: boolean,
  isDatawizards: boolean,
  logId: any,
  scrapeStart: number,
  source: string,
) {
  const runData = await runRes.json();
  const runId = runData.data?.id;
  if (!runId) {
    await ScrapeRun.findByIdAndUpdate(logId, { status: 'failed', error: 'No run ID returned', completedAt: new Date(), durationMs: Date.now() - scrapeStart });
    await updateSearchQueryStatus(source, catLower, 'failed', 0);
    return NextResponse.json({ error: 'No run ID returned', details: runData }, { status: 502 });
  }

  await ScrapeRun.findByIdAndUpdate(logId, { runId });

  let status = runData.data?.status;
  const maxWait = 2 * 60 * 1000;
  const start = Date.now();

  while (!['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
    if (Date.now() - start > maxWait) {
      await ScrapeRun.findByIdAndUpdate(logId, { status: 'timed-out', runId, completedAt: new Date(), durationMs: Date.now() - scrapeStart });
      await updateSearchQueryStatus(source, catLower, 'failed', 0);
      return NextResponse.json({ error: 'Apify run timed out', runId }, { status: 504 });
    }
    await new Promise((r) => setTimeout(r, 5000));
    const poll = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
    status = (await poll.json()).data?.status;
  }

  if (status === 'ABORTED') {
    await ScrapeRun.findByIdAndUpdate(logId, { status: 'aborted', runId, completedAt: new Date(), durationMs: Date.now() - scrapeStart });
    await updateSearchQueryStatus(source, catLower, 'failed', 0);
    return NextResponse.json({ error: 'Run was aborted', runId }, { status: 499 });
  }

  if (status !== 'SUCCEEDED') {
    await ScrapeRun.findByIdAndUpdate(logId, { status: 'failed', runId, error: `Apify run ${status}`, completedAt: new Date(), durationMs: Date.now() - scrapeStart });
    await updateSearchQueryStatus(source, catLower, 'failed', 0);
    return NextResponse.json({ error: `Apify run ${status}`, runId }, { status: 502 });
  }

  const datasetRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&limit=${maxItems}`,
  );
  const items = await datasetRes.json();

  if (!Array.isArray(items) || items.length === 0) {
    await ScrapeRun.findByIdAndUpdate(logId, { status: 'succeeded', runId, totalItems: 0, saved: 0, completedAt: new Date(), durationMs: Date.now() - scrapeStart });
    await updateSearchQueryStatus(source, catLower, 'done', 0);
    return NextResponse.json({ success: true, runId, totalItems: 0, saved: 0, skipped: 0, category: catLower });
  }

  await connectDB();

  if (clean) {
    const deleted = await OnlyFansCreator.deleteMany({ categories: catLower });
    console.log(`Cleaned ${deleted.deletedCount} old "${catLower}" creators`);
  }

  let saved = 0;
  let skipped = 0;
  const savedCreators: any[] = [];

  for (const item of items) {
    const parsed = isDatawizards
      ? parseDatawizardsItem(item)
      : isSentry
      ? parseSentryItem(item)
      : parseIgolaItem(item);
    if (!parsed) { skipped++; continue; }

    const slug = parsed.username.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    try {
      const setFields: Record<string, any> = {
        name: parsed.name,
        username: parsed.username,
        slug,
        avatar: parsed.avatar,
        bio: parsed.bio,
        likesCount: parsed.likesCount,
        mediaCount: parsed.mediaCount || (parsed.photosCount + parsed.videosCount),
        photosCount: parsed.photosCount,
        videosCount: parsed.videosCount,
        price: parsed.price,
        isFree: parsed.isFree,
        isVerified: parsed.isVerified || false,
        gender: parsed.gender,
        url: parsed.url,
        scrapedAt: new Date(),
      };

      if (parsed.subscriberCount) setFields.subscriberCount = parsed.subscriberCount;

      // Datawizards-rich fields — save every field that exists in parsed
      const dwFields = [
        'header','avatarThumbC50','avatarThumbC144',
        'audiosCount','postsCount','privateArchivedPostsCount','favoritesCount',
        'location','website','joinDate','firstPublishedPostDate',
        'onlyfansId','hasStories','hasStream','hasScheduledStream',
        'tipsEnabled','tipsTextEnabled','tipsMin','tipsMinInternal','tipsMax',
        'finishedStreamsCount','showMediaCount','isRestricted','canEarn','canChat',
        'subscriptionBundles','promotions',
      ] as const;
      for (const f of dwFields) {
        if (f in parsed && (parsed as any)[f] !== undefined && (parsed as any)[f] !== '') {
          setFields[f] = (parsed as any)[f];
        }
      }

      // Sentry social fields
      if ('lastSeen' in parsed && parsed.lastSeen) setFields.lastSeen = parsed.lastSeen;
      if ('instagramUrl' in parsed && parsed.instagramUrl) setFields.instagramUrl = parsed.instagramUrl;
      if ('instagramUsername' in parsed && parsed.instagramUsername) setFields.instagramUsername = parsed.instagramUsername;
      if ('twitterUrl' in parsed && parsed.twitterUrl) setFields.twitterUrl = parsed.twitterUrl;
      if ('tiktokUrl' in parsed && parsed.tiktokUrl) setFields.tiktokUrl = parsed.tiktokUrl;
      if ('fanslyUrl' in parsed && parsed.fanslyUrl) setFields.fanslyUrl = parsed.fanslyUrl;
      if ('pornhubUrl' in parsed && parsed.pornhubUrl) setFields.pornhubUrl = parsed.pornhubUrl;

      const savedDoc = await OnlyFansCreator.findOneAndUpdate(
        { slug },
        {
          $set: setFields,
          $addToSet: { categories: catLower },
        },
        { upsert: true, strict: false, new: true },
      ).select('name username slug avatar likesCount categories price isFree url').lean() as any;
      saved++;
      if (savedDoc) savedCreators.push({ ...savedDoc, _id: savedDoc._id.toString() });
    } catch (e: any) {
      if (e.code !== 11000) console.error(`Failed ${parsed.username}:`, e.message);
    }
  }

  // Process images: download from OF CDN → optimize → EXIF brand → R2
  const slugsToProcess: string[] = [];
  for (const item of items) {
    const parsed = isDatawizards
      ? parseDatawizardsItem(item)
      : isSentry ? parseSentryItem(item) : parseIgolaItem(item);
    if (!parsed) continue;
    const s = parsed.username.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    slugsToProcess.push(s);
  }
  let imagesProcessed = 0;
  for (const s of slugsToProcess) {
    try {
      const r = await processCreatorImages(s);
      if (r.avatarR2 || r.headerR2) imagesProcessed++;
    } catch (e: any) {
      console.error(`Image processing failed for ${s}:`, e.message);
    }
  }

  await ScrapeRun.findByIdAndUpdate(logId, {
    status: 'succeeded',
    runId,
    totalItems: items.length,
    saved,
    skipped,
    completedAt: new Date(),
    durationMs: Date.now() - scrapeStart,
  });

  await updateSearchQueryStatus(source, catLower, 'done', saved);

  return NextResponse.json({ success: true, runId, totalItems: items.length, saved, skipped, imagesProcessed, category: catLower, savedCreators });
}
