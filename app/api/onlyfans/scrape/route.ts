import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator, ScrapeRun, SearchQuery } from '@/lib/models';
import { getApifyCredentials, markKeyBurned } from '@/lib/apify-key';

const MAX_PROFILES_PER_SCRAPE = 2000;

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
    const { category, maxItems: rawMax = 200, clean = false, country, source = 'bulk' } = await req.json();
    const maxItems = Math.min(Math.max(1, rawMax), MAX_PROFILES_PER_SCRAPE);
    if (!category) {
      return NextResponse.json({ error: 'category is required' }, { status: 400 });
    }

    const creds = await getApifyCredentials();
    if (!creds) {
      return NextResponse.json({ error: 'No active Apify API keys. Add keys in OFM Settings.' }, { status: 500 });
    }

    const { token: APIFY_TOKEN, actor: APIFY_ACTOR } = creds;
    const actorId = APIFY_ACTOR.replace('/', '~');
    const catLower = category.toLowerCase();
    const isTopBrowse = catLower === 'top';
    const isSentry = APIFY_ACTOR.includes('sentry');
    const keyHint = APIFY_TOKEN.slice(-4);

    const input = isSentry
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

      if (errType === 'actor-is-not-rented') {
        await ScrapeRun.findByIdAndUpdate(logEntry._id, { status: 'failed', error: errMsg, completedAt: new Date(), durationMs: Date.now() - scrapeStart });
        await updateSearchQueryStatus(source, catLower, 'failed', 0);
        return NextResponse.json({
          error: `Actor "${APIFY_ACTOR}" requires rental. Rent it on Apify or switch to a different actor in OFM Settings.`,
          details: errMsg,
        }, { status: 402 });
      }

      if (errType === 'not-enough-usage-to-run-paid-actor') {
        await ScrapeRun.findByIdAndUpdate(logEntry._id, { status: 'failed', error: errMsg, completedAt: new Date(), durationMs: Date.now() - scrapeStart });
        await updateSearchQueryStatus(source, catLower, 'failed', 0);
        return NextResponse.json({
          error: 'Apify account out of credits. Top up at https://console.apify.com/billing/subscription',
          details: errMsg,
        }, { status: 402 });
      }

      if (runRes.status === 401 && errType !== 'actor-is-not-rented' && errType !== 'not-enough-usage-to-run-paid-actor') {
        await markKeyBurned(APIFY_TOKEN);
        const creds2 = await getApifyCredentials();
        if (!creds2) {
          await ScrapeRun.findByIdAndUpdate(logEntry._id, { status: 'failed', error: 'All API keys burned', completedAt: new Date(), durationMs: Date.now() - scrapeStart });
          await updateSearchQueryStatus(source, catLower, 'failed', 0);
          return NextResponse.json({ error: 'API key burned (payment/auth issue). No more active keys — add new keys in OFM Settings.' }, { status: 402 });
        }
        await ScrapeRun.findByIdAndUpdate(logEntry._id, { apiKeyHint: creds2.token.slice(-4) });
        const retryRes = await fetch(
          `https://api.apify.com/v2/acts/${actorId}/runs?token=${creds2.token}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
        );
        if (!retryRes.ok) {
          const retryBody = await retryRes.text();
          if (retryRes.status === 401 || retryRes.status === 402) await markKeyBurned(creds2.token);
          await ScrapeRun.findByIdAndUpdate(logEntry._id, { status: 'failed', error: retryBody, completedAt: new Date(), durationMs: Date.now() - scrapeStart });
          await updateSearchQueryStatus(source, catLower, 'failed', 0);
          return NextResponse.json({ error: 'Apify run failed after key rotation', details: retryBody }, { status: 502 });
        }
        return await processRun(retryRes, creds2.token, actorId, maxItems, catLower, clean, isSentry, logEntry._id, scrapeStart, source);
      }

      await updateSearchQueryStatus(source, catLower, 'failed', 0);
      await ScrapeRun.findByIdAndUpdate(logEntry._id, { status: 'failed', error: errMsg, completedAt: new Date(), durationMs: Date.now() - scrapeStart });
      return NextResponse.json({ error: 'Apify run failed to start', details: errMsg }, { status: 502 });
    }

    return await processRun(runRes, APIFY_TOKEN, actorId, maxItems, catLower, clean, isSentry, logEntry._id, scrapeStart, source);
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

function parseSentryItem(item: any) {
  const username = item.onlyfansUsername || '';
  if (!username) return null;

  const name = item.displayName || username;
  const bio = item.bio || '';

  if (containsBlockedContent(bio, name, username)) return null;

  return {
    name,
    username,
    avatar: item.profileImage || '',
    bio: bio.slice(0, 500),
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
    likesCount: typeof item.likes === 'number' ? item.likes : parseInt(String(item.likes || '0').replace(/,/g, ''), 10) || 0,
    photosCount: 0,
    videosCount: 0,
    price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price || '0')) || 0,
    isFree: item.price === 0 || item.price === 'Free',
    url: item.link || `https://onlyfans.com/${username}`,
    gender: 'female' as const,
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
  const maxWait = 10 * 60 * 1000;
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

  for (const item of items) {
    const parsed = isSentry ? parseSentryItem(item) : parseIgolaItem(item);
    if (!parsed) { skipped++; continue; }

    const slug = parsed.username.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    try {
      await OnlyFansCreator.findOneAndUpdate(
        { slug },
        {
          $set: {
            name: parsed.name,
            username: parsed.username,
            slug,
            avatar: parsed.avatar,
            header: '',
            bio: parsed.bio,
            subscriberCount: 0,
            likesCount: parsed.likesCount,
            mediaCount: parsed.photosCount + parsed.videosCount,
            photosCount: parsed.photosCount,
            videosCount: parsed.videosCount,
            price: parsed.price,
            isFree: parsed.isFree,
            isVerified: false,
            gender: parsed.gender,
            url: parsed.url,
            scrapedAt: new Date(),
          },
          $addToSet: { categories: catLower },
        },
        { upsert: true },
      );
      saved++;
    } catch (e: any) {
      if (e.code !== 11000) console.error(`Failed ${parsed.username}:`, e.message);
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

  return NextResponse.json({ success: true, runId, totalItems: items.length, saved, skipped, category: catLower });
}
