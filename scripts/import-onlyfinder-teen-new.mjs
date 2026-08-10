/**
 * Import OnlyFinder saved HTML — NEW teen profiles only, likes < 4K.
 * Default: HTML + local _files images only (no Apify).
 * --fetch-of: pull avatar + likes from onlyfans.com/{username}, R2 process.
 * --apify: legacy Apify scrape (avoid unless quota OK).
 */
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const HTML_FILE =
  process.env.ONLYFINDER_HTML ||
  '/Users/themaf/Downloads/🥇 50 Best Teen OnlyFans To Follow in 2026 - OnlyFinder.html';
const ACTOR = 'hello.datawizards/onlyfans-scraper';
const BATCH_SIZE = 25;
const LIKES_MAX = 4000;
const LIKES_MIN_KEEP = 1000;
const CATEGORY = 'teen';

function slugify(username) {
  return username.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function firstLink(arr) {
  if (!Array.isArray(arr) || !arr.length) return '';
  if (typeof arr[0] === 'string') return arr[0];
  return arr[0]?.url || '';
}

function buildSetFields(exact, htmlMeta = {}) {
  const subPrice =
    typeof exact.subscribePrice === 'number'
      ? exact.subscribePrice
      : parseFloat(String(exact.subscribePrice || '0')) || 0;
  const bio = (exact.about || htmlMeta.bio || '').slice(0, 500);
  const totalMedia = (exact.photosCount || htmlMeta.photos || 0) + (exact.videosCount || htmlMeta.videos || 0);
  const websiteRaw = exact.website || '';

  let igUrl = exact.instagramUrl || exact.primaryInstagram || firstLink(exact.instagramLinks) || htmlMeta.social?.instagram || '';
  let twUrl = exact.twitterUrl || firstLink(exact.twitterLinks) || htmlMeta.social?.twitter || htmlMeta.social?.x || '';
  let tkUrl = exact.tiktokUrl || firstLink(exact.tiktokLinks) || htmlMeta.social?.tiktok || '';
  const tgUrl = exact.telegramUrl || htmlMeta.social?.telegram || '';
  let finalWebsite = websiteRaw;

  if (websiteRaw && !igUrl && /instagram\.com/i.test(websiteRaw)) igUrl = websiteRaw;
  if (websiteRaw && !twUrl && /(twitter\.com|x\.com)/i.test(websiteRaw)) {
    twUrl = websiteRaw;
    finalWebsite = '';
  }
  if (websiteRaw && !tkUrl && /tiktok\.com/i.test(websiteRaw)) {
    tkUrl = websiteRaw;
    finalWebsite = '';
  }

  const price = subPrice || (htmlMeta.isFree ? 0 : htmlMeta.price || 0);

  return {
    name: exact.name || htmlMeta.name || exact.username,
    username: exact.username,
    avatar: exact.avatar || '',
    avatarThumbC50: exact.avatarThumbs?.c50 || '',
    avatarThumbC144: exact.avatarThumbs?.c144 || '',
    header: exact.header || '',
    bio,
    gender: 'female',
    price,
    isFree: price === 0,
    isVerified: exact.isVerified || false,
    likesCount: exact.favoritedCount || 0,
    subscriberCount: exact.subscribersCount || 0,
    mediaCount: exact.mediasCount || totalMedia,
    photosCount: exact.photosCount || htmlMeta.photos || 0,
    videosCount: exact.videosCount || htmlMeta.videos || 0,
    audiosCount: exact.audiosCount || 0,
    postsCount: exact.postsCount || 0,
    location: exact.location || '',
    website: finalWebsite,
    joinDate: exact.joinDate || exact.joinedDate || '',
    lastSeen: exact.lastSeen || '',
    onlyfansId: exact.id || 0,
    firstPublishedPostDate: exact.firstPublishedPostDate || '',
    hasStories: exact.hasStories || false,
    hasStream: exact.hasStream || false,
    hasScheduledStream: exact.hasScheduledStream || false,
    tipsEnabled: exact.tipsEnabled || false,
    tipsTextEnabled: exact.tipsTextEnabled || false,
    tipsMin: exact.tipsMin || 0,
    tipsMinInternal: exact.tipsMinInternal || 0,
    tipsMax: exact.tipsMax || 0,
    finishedStreamsCount: exact.finishedStreamsCount || 0,
    showMediaCount: exact.showMediaCount || false,
    isRestricted: exact.isRestricted || false,
    canEarn: exact.canEarn || false,
    canChat: exact.canChat || false,
    privateArchivedPostsCount: exact.privateArchivedPostsCount || 0,
    favoritesCount: exact.favoritesCount || 0,
    subscriptionBundles: exact.subscription_bundles || null,
    promotions: Array.isArray(exact.promotions) ? exact.promotions.filter(Boolean) : [],
    instagramUrl: igUrl,
    instagramUsername: exact.instagramUsername || exact.primaryInstagramUsername || '',
    twitterUrl: twUrl,
    tiktokUrl: tkUrl,
    telegramUrl: tgUrl,
    fanslyUrl: exact.fanslyUrl || firstLink(exact.fanslyLinks) || '',
    fanvueUrl: exact.fanvueUrl || firstLink(exact.fanvueLinks) || '',
    pornhubUrl: exact.pornhubUrl || firstLink(exact.pornhubLinks) || '',
    redditUrl: exact.redditUrl || firstLink(exact.redditLinks) || '',
    linktreeUrl: exact.linktreeUrl || htmlMeta.social?.linktree || '',
    allmylinksUrl: exact.allmylinksUrl || '',
    beaconsUrl: exact.beaconsUrl || '',
    patreonUrl: exact.patreonUrl || firstLink(exact.patreonLinks) || '',
    scrapedAt: new Date(),
    adminImported: true,
  };
}

function parseOnlyFinderHtml(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const htmlDir = path.dirname(htmlPath);
  const blocks = html.split(/(?=<div class="row my-5 mx-2 user-profile profile-container)/).slice(1);
  const byUser = new Map();

  for (const block of blocks) {
    const userM = block.match(/data-username="([^"]+)"/);
    if (!userM) continue;
    const username = userM[1].toLowerCase();
    const isNew = /up-chart\.svg[\s\S]{0,120}?\bNEW\b/.test(block);
    if (!isNew) continue;

    const nameM = block.match(/<h3 class="fs-6 m-0">([^<]+)<\/h3>/);
    const bioM = block.match(/<p class="mb-1 mb-sm-0 profile-about">\s*([\s\S]*?)\s*<\/p>/);
    const likesM = block.match(/heart\.svg[\s\S]{0,80}?>\s*([\d,]+)/);
    const photosM = block.match(/photo-count\.svg[\s\S]{0,80}?>\s*([\d,]+)/);
    const videosM = block.match(/video-count\.svg[\s\S]{0,80}?>\s*([\d,]+)/);
    const imgM = block.match(/<img src="(\.\/[^"]+)"/);
    const isFree = /<strong>FREE<\/strong>/.test(block);
    const likes = likesM ? parseInt(likesM[1].replace(/,/g, ''), 10) : 0;
    if (likes >= LIKES_MAX) continue;

    const social = {};
    for (const m of block.matchAll(/data-type="([^"]+)"[^>]*href="([^"]+)"/g)) {
      social[m[1]] = m[2];
    }

    let localAvatar = '';
    if (imgM?.[1]) {
      const rel = imgM[1].replace(/^\.\//, '');
      const abs = path.join(htmlDir, rel);
      if (fs.existsSync(abs)) localAvatar = abs;
    }

    byUser.set(username, {
      username,
      name: nameM?.[1]?.trim() || username,
      bio: bioM?.[1]?.replace(/\s+/g, ' ').trim() || '',
      likes,
      photos: photosM ? parseInt(photosM[1].replace(/,/g, ''), 10) : 0,
      videos: videosM ? parseInt(videosM[1].replace(/,/g, ''), 10) : 0,
      isFree,
      price: isFree ? 0 : 0,
      social,
      localAvatar,
    });
  }

  return byUser;
}

function socialFields(social = {}) {
  return {
    instagramUrl: social.instagram || '',
    twitterUrl: social.twitter || social.x || '',
    tiktokUrl: social.tiktok || '',
    telegramUrl: social.telegram || '',
    linktreeUrl: social.linktree || '',
    redditUrl: social.reddit || '',
  };
}

async function importFromHtmlOnly(candidates, metaByUser) {
  const connectDB = (await import('../lib/db/mongodb.js')).default;
  const { OnlyFansCreator, ScrapeRun } = await import('../lib/models/index.js');
  const { uploadToR2, isR2Configured } = await import('../lib/r2.js');
  const { optimizeCreatorPhoto } = await import('../lib/creatorMedia.js');

  if (!isR2Configured()) throw new Error('R2 not configured');

  await connectDB();

  let saved = 0;
  let skippedExisting = 0;
  let imgFail = 0;

  for (const { username, meta } of candidates) {
    const slug = slugify(username);
    const existing = await OnlyFansCreator.findOne({ slug }).select('avatar likesCount').lean();
    if (existing?.avatar?.includes(process.env.R2_PUBLIC_URL || '___')) {
      await OnlyFansCreator.updateOne({ slug }, { $addToSet: { categories: CATEGORY } });
      skippedExisting++;
      continue;
    }

    let avatarR2 = existing?.avatar || '';
    if (meta.localAvatar) {
      try {
        const buf = fs.readFileSync(meta.localAvatar);
        const optimized = await optimizeCreatorPhoto(buf);
        avatarR2 = await uploadToR2(optimized, `onlyfanssearch/${slug}-onlyfans.jpg`, 'image/jpeg');
      } catch (e) {
        console.log(`  img fail @${username}: ${e.message}`);
        imgFail++;
        if (!avatarR2) continue;
      }
    } else if (!avatarR2) {
      console.log(`  no local image @${username} (saving bio/socials anyway)`);
      imgFail++;
    }

    const social = socialFields(meta.social);
    await OnlyFansCreator.findOneAndUpdate(
      { slug },
      {
        $set: {
          name: meta.name,
          username,
          slug,
          avatar: avatarR2,
          bio: meta.bio.slice(0, 500),
          gender: 'female',
          price: meta.isFree ? 0 : meta.price || 0,
          isFree: !!meta.isFree,
          photosCount: meta.photos || 0,
          videosCount: meta.videos || 0,
          mediaCount: (meta.photos || 0) + (meta.videos || 0),
          likesCount: meta.likes || existing?.likesCount || 0,
          scrapedAt: new Date(),
          adminImported: true,
          ...social,
        },
        $addToSet: { categories: CATEGORY },
        $setOnInsert: { url: `https://onlyfans.com/${username}` },
      },
      { upsert: true, strict: false },
    );

    saved++;
    console.log(`  [${saved}] @${username} teen tagged`);
  }

  await ScrapeRun.create({
    source: 'import',
    query: 'onlyfinder-teen-new-html-local',
    status: 'succeeded',
    maxItems: candidates.length,
    totalItems: candidates.length,
    saved,
    skipped: skippedExisting + imgFail,
    startedAt: new Date(),
    completedAt: new Date(),
  });

  console.log('\n=== DONE (html-only) ===');
  console.log(`Saved: ${saved}, already on R2: ${skippedExisting}, img fail: ${imgFail}`);
  await mongoose.disconnect();
}

async function fetchProfileFromOf(page, username) {
  let profile = null;
  const onResponse = async (res) => {
    const url = res.url();
    if (!url.includes(`/api2/v2/users/${username}`) || !res.ok()) return;
    try {
      profile = await res.json();
    } catch {}
  };
  page.on('response', onResponse);
  try {
    await page.goto(`https://onlyfans.com/${username}`, {
      waitUntil: 'networkidle',
      timeout: 120000,
    });
    try {
      const accept = page.getByRole('button', { name: /accept all/i });
      if (await accept.isVisible({ timeout: 2500 })) await accept.click();
    } catch {}
    await page.waitForTimeout(8000);
    if (profile?.avatar || profile?.favoritedCount != null) return profile;
    return null;
  } finally {
    page.off('response', onResponse);
  }
}

function ofSocialFromProfile(p) {
  if (!p || typeof p !== 'object') return {};
  const ig = p.instagram || p.instagramUrl || '';
  const tw = p.twitter || p.twitterUrl || '';
  const tk = p.tiktok || p.tiktokUrl || '';
  return {
    instagramUrl: typeof ig === 'string' ? ig : '',
    twitterUrl: typeof tw === 'string' ? tw : '',
    tiktokUrl: typeof tk === 'string' ? tk : '',
  };
}

async function fetchOfForCandidates(candidates) {
  const { chromium } = await import('playwright');
  const connectDB = (await import('../lib/db/mongodb.js')).default;
  const { OnlyFansCreator } = await import('../lib/models/index.js');
  const { processCreatorImages } = await import('../lib/actions/creatorImages.js');
  const { isR2Configured } = await import('../lib/r2.js');
  const r2Host = process.env.R2_PUBLIC_URL || '___';

  if (!isR2Configured()) throw new Error('R2 not configured');
  await connectDB();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });

  let ok = 0;
  let skipLikes = 0;
  let skipNoImg = 0;
  let fail = 0;

  for (const { username } of candidates) {
    const slug = slugify(username);
    process.stdout.write(`@${username} `);
    try {
      const p = await fetchProfileFromOf(page, username);
      const likes = p?.favoritedCount ?? 0;
      if (likes >= LIKES_MAX) {
        console.log(`SKIP likes ${likes}`);
        skipLikes++;
        continue;
      }

      const existing = await OnlyFansCreator.findOne({ slug }).select('avatar').lean();
      const wasOnR2 = !!existing?.avatar?.includes(r2Host);

      const avatar = p?.avatar || p?.avatarThumbs?.c144 || p?.avatarThumbs?.c50 || '';
      const header = p?.header || p?.headerThumbs?.w760 || '';

      if (!wasOnR2 && !avatar && !header) {
        console.log('SKIP no OF image');
        skipNoImg++;
        continue;
      }

      const set = {
        likesCount: likes,
        scrapedAt: new Date(),
        ...ofSocialFromProfile(p),
      };
      if (!wasOnR2) {
        if (avatar) set.avatar = avatar;
        if (header) set.header = header;
      }
      if (p?.photosCount != null) set.photosCount = p.photosCount;
      if (p?.videosCount != null) set.videosCount = p.videosCount;
      if (p?.mediasCount != null) set.mediaCount = p.mediasCount;
      if (p?.about) set.bio = String(p.about).slice(0, 500);
      if (p?.name) set.name = p.name;

      await OnlyFansCreator.updateOne({ slug }, { $set: set, $addToSet: { categories: CATEGORY } });

      let r = { avatarR2: wasOnR2 ? existing.avatar : null };
      if (!wasOnR2) {
        try {
          r = await processCreatorImages(slug);
        } catch (e) {
          const doc = await OnlyFansCreator.findOne({ slug }).select('avatar').lean();
          r = {
            avatarR2: doc?.avatar?.includes(r2Host) ? doc.avatar : null,
            error: e.message,
          };
        }
      }

      if (r.avatarR2) {
        ok++;
        console.log(`OK likes=${likes}${wasOnR2 ? ' (likes refresh)' : ''}`);
      } else {
        fail++;
        console.log(`FAIL ${r.error || 'no r2'}`);
      }
    } catch (e) {
      fail++;
      console.log(`ERR ${e.message}`);
    }
  }

  await browser.close();
  console.log(`\n=== DONE (fetch-of) === ok=${ok} skipLikes=${skipLikes} noImg=${skipNoImg} fail=${fail}`);
  await mongoose.disconnect();
}

async function verifyUnder1kAndDelete(candidates, dryRun) {
  const { chromium } = await import('playwright');
  const connectDB = (await import('../lib/db/mongodb.js')).default;
  const { OnlyFansCreator } = await import('../lib/models/index.js');
  const { deleteFromR2 } = await import('../lib/r2.js');
  await connectDB();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });

  const kept = [];
  const deleted = [];
  const failed = [];

  for (const { username } of candidates) {
    const slug = slugify(username);
    process.stdout.write(`@${username} `);
    try {
      const p = await fetchProfileFromOf(page, username);
      const likes = p?.favoritedCount;
      if (likes == null) {
        console.log('FAIL no likes');
        failed.push(username);
        continue;
      }

      if (likes < LIKES_MIN_KEEP) {
        console.log(`DELETE likes=${likes}`);
        deleted.push({ username, likes });
        if (!dryRun) {
          const creator = await OnlyFansCreator.findOne({ slug }).lean();
          if (creator) {
            if (creator.avatar) await deleteFromR2(creator.avatar).catch(() => {});
            if (creator.header) await deleteFromR2(creator.header).catch(() => {});
            for (const url of creator.extraPhotos || []) {
              if (url) await deleteFromR2(url).catch(() => {});
            }
            await OnlyFansCreator.updateOne(
              { slug },
              { $set: { deleted: true, deletedAt: new Date() } },
            );
          }
        }
      } else {
        console.log(`KEEP likes=${likes}`);
        kept.push({ username, likes });
        if (!dryRun) {
          await OnlyFansCreator.updateOne(
            { slug, deleted: { $ne: true } },
            { $set: { likesCount: likes, scrapedAt: new Date() } },
          );
        }
      }
    } catch (e) {
      console.log(`ERR ${e.message}`);
      failed.push(username);
    }
  }

  await browser.close();
  console.log(`\n=== VERIFY UNDER ${LIKES_MIN_KEEP} ===`);
  console.log(`Keep: ${kept.length}, Delete: ${deleted.length}, Fail: ${failed.length}${dryRun ? ' (dry-run)' : ''}`);
  if (deleted.length) {
    console.log('\nDeleted (<1K):');
    for (const d of deleted) console.log(`  @${d.username} ${d.likes}`);
  }
  if (kept.length) {
    console.log('\nKept (>=1K):');
    for (const k of kept) console.log(`  @${k.username} ${k.likes}`);
  }
  await mongoose.disconnect();
}

async function runApify(apiKey, actorId, usernames) {
  const runRes = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ search_queries: usernames }),
  });
  if (!runRes.ok) throw new Error(`Apify start failed: ${runRes.status} ${(await runRes.text()).slice(0, 200)}`);
  const runId = (await runRes.json()).data?.id;
  if (!runId) throw new Error('No run ID');

  let status = 'RUNNING';
  while (!['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
    await new Promise((r) => setTimeout(r, 5000));
    const poll = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`);
    status = (await poll.json()).data?.status;
  }
  if (status !== 'SUCCEEDED') throw new Error(`Run ${status}`);

  const dsRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}&limit=200`,
  );
  return dsRes.json();
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const useApify = process.argv.includes('--apify');
  const fetchOf = process.argv.includes('--fetch-of');
  const verifyUnder1k = process.argv.includes('--verify-under-1k');
  const htmlMeta = parseOnlyFinderHtml(HTML_FILE);
  console.log(`HTML: ${path.basename(HTML_FILE)}`);
  console.log(`NEW + under ${LIKES_MAX} likes in HTML: ${htmlMeta.size} usernames\n`);

  const connectDB = (await import('../lib/db/mongodb.js')).default;
  const { processCreatorImages } = await import('../lib/actions/creatorImages.js');
  const { OnlyFansCreator, ScrapeRun } = await import('../lib/models/index.js');
  const { isCreatorBlacklisted } = await import('../lib/onlyfanssearch/creatorBlacklist.js');

  const candidates = [];
  let blocked = 0;
  for (const [username, meta] of htmlMeta) {
    const slug = slugify(username);
    if (isCreatorBlacklisted(username) || isCreatorBlacklisted(slug)) {
      blocked++;
      continue;
    }
    candidates.push({ username, meta });
  }

  console.log(`After blacklist: ${candidates.length} (blocked ${blocked})`);
  if (dryRun) {
    for (const c of candidates) console.log(`  @${c.username}`);
    process.exit(0);
  }

  if (verifyUnder1k) {
    await verifyUnder1kAndDelete(candidates, dryRun);
    process.exit(0);
  }

  if (fetchOf) {
    const connectDB = (await import('../lib/db/mongodb.js')).default;
    const { OnlyFansCreator } = await import('../lib/models/index.js');
    await connectDB();
    const r2Host = process.env.R2_PUBLIC_URL || '___';
    const needOf = [];
    const refreshLikes = [];
    for (const c of candidates) {
      const doc = await OnlyFansCreator.findOne({ slug: slugify(c.username) })
        .select('avatar likesCount')
        .lean();
      const onR2 = doc?.avatar?.includes(r2Host);
      if (!onR2) needOf.push(c);
      else refreshLikes.push(c);
    }
    console.log(`Missing R2 photo: ${needOf.length}`);
    console.log(`Refresh likes on R2 profiles: ${refreshLikes.length}\n`);
    await fetchOfForCandidates([...needOf, ...refreshLikes]);
    process.exit(0);
  }

  if (!useApify) {
    await importFromHtmlOnly(candidates, new Map(candidates.map((c) => [c.username, c.meta])));
    process.exit(0);
  }

  await connectDB();
  const db = mongoose.connection.db;
  const settings = await db.collection('ofmsettings').findOne({ key: 'default' });
  const apiKey =
    (settings?.apifyKeys || []).find((k) => k.active && !k.burned)?.apiKey || process.env.APIFY_API_TOKEN;
  if (!apiKey) throw new Error('No Apify key');

  const actorId = ACTOR.replace('/', '~');
  const allUsers = candidates.map((c) => c.username);
  const metaByUser = new Map(candidates.map((c) => [c.username, c.meta]));

  let saved = 0;
  let skippedLikes = 0;
  let failed = 0;
  let apifyMiss = 0;

  for (let i = 0; i < allUsers.length; i += BATCH_SIZE) {
    const batch = allUsers.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allUsers.length / BATCH_SIZE);
    console.log(`Batch ${batchNum}/${totalBatches} (${batch.length} users)...`);

    let items;
    try {
      items = await runApify(apiKey, actorId, batch);
    } catch (e) {
      console.log(`  batch fail: ${e.message}`);
      failed += batch.length;
      continue;
    }

    console.log(`  got ${items.length} results`);
    const returned = new Set();

    for (const item of items) {
      const username = (item.username || '').toLowerCase();
      if (!username) continue;
      returned.add(username);

      const likes = item.favoritedCount || 0;
      if (likes >= LIKES_MAX) {
        console.log(`  SKIP likes ${likes} @${username}`);
        skippedLikes++;
        continue;
      }

      const slug = slugify(username);
      const htmlRow = metaByUser.get(username) || {};
      const setFields = buildSetFields(item, htmlRow);
      setFields.slug = slug;

      await OnlyFansCreator.findOneAndUpdate(
        { slug },
        {
          $set: setFields,
          $addToSet: { categories: CATEGORY },
          $setOnInsert: { url: `https://onlyfans.com/${item.username}` },
        },
        { upsert: true, strict: false },
      );

      try {
        await processCreatorImages(slug);
      } catch (e) {
        console.log(`  img fail ${slug}: ${e.message}`);
      }

      saved++;
      console.log(`  [${saved}] @${item.username} likes=${likes} cat=${CATEGORY}`);
    }

    for (const u of batch) {
      if (!returned.has(u)) {
        apifyMiss++;
        console.log(`  MISS apify @${u}`);
      }
    }
  }

  await ScrapeRun.create({
    source: 'import',
    query: 'onlyfinder-teen-new-html',
    actorId: ACTOR,
    status: 'succeeded',
    maxItems: allUsers.length,
    totalItems: allUsers.length,
    saved,
    skipped: skippedLikes + failed + apifyMiss,
    startedAt: new Date(),
    completedAt: new Date(),
  });

  console.log('\n=== DONE ===');
  console.log(`Saved: ${saved}, skipped likes>=${LIKES_MAX}: ${skippedLikes}, apify miss: ${apifyMiss}, batch fail: ${failed}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
