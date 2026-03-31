'use server';

import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import sharp from 'sharp';
import { uploadToR2, isR2Configured } from '@/lib/r2';
import { getApifyCredentials } from '@/lib/apify-key';

export interface CreatorLookupResult {
  source: 'db' | 'apify';
  name: string;
  username: string;
  avatar: string;
  header: string;
  bio: string;
  website: string;
  location: string;
  price: number;
  isFree: boolean;
  isVerified: boolean;
  likesCount: number;
  subscriberCount: number;
  mediaCount: number;
  photosCount: number;
  videosCount: number;
  postsCount: number;
  joinDate: string;
  categories: string[];
  instagramUrl: string;
  twitterUrl: string;
  tiktokUrl: string;
  telegramUrl: string;
}

export async function searchCreatorByUsername(query: string): Promise<CreatorLookupResult[]> {
  if (!query || query.trim().length < 2) return [];

  const cleaned = query.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  if (!cleaned) return [];

  await connectDB();

  const results = await OnlyFansCreator.find({
    deleted: { $ne: true },
    $or: [
      { username: { $regex: cleaned, $options: 'i' } },
      { name: { $regex: cleaned, $options: 'i' } },
    ],
  })
    .select('name username avatar header bio website location price isFree isVerified likesCount subscriberCount mediaCount photosCount videosCount postsCount joinDate categories instagramUrl twitterUrl tiktokUrl telegramUrl')
    .limit(8)
    .lean();

  return results.map((r: any) => ({
    source: 'db' as const,
    name: r.name || '',
    username: r.username || '',
    avatar: r.avatar || '',
    header: r.header || '',
    bio: r.bio || '',
    website: r.website || '',
    location: r.location || '',
    price: r.price || 0,
    isFree: r.isFree || false,
    isVerified: r.isVerified || false,
    likesCount: r.likesCount || 0,
    subscriberCount: r.subscriberCount || 0,
    mediaCount: r.mediaCount || 0,
    photosCount: r.photosCount || 0,
    videosCount: r.videosCount || 0,
    postsCount: r.postsCount || 0,
    joinDate: r.joinDate || '',
    categories: r.categories || [],
    instagramUrl: r.instagramUrl || '',
    twitterUrl: r.twitterUrl || '',
    tiktokUrl: r.tiktokUrl || '',
    telegramUrl: r.telegramUrl || '',
  }));
}

export async function fetchCreatorFromApify(username: string): Promise<CreatorLookupResult | null> {
  if (!username?.trim()) return null;

  const cleaned = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  if (!cleaned) return null;

  const creds = await getApifyCredentials();
  if (!creds) return null;

  const { token, actor } = creds;
  const actorId = actor.replace('/', '~');

  const isDatawizards = actor.includes('datawizards');
  const input = isDatawizards
    ? { search_queries: [cleaned] }
    : { category: cleaned, maxItems: 1 };

  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
  );

  if (!runRes.ok) return null;

  const runData = await runRes.json();
  const runId = runData.data?.id;
  if (!runId) return null;

  let status = runData.data?.status;
  const maxWait = 90_000;
  const start = Date.now();

  while (!['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
    if (Date.now() - start > maxWait) return null;
    await new Promise((r) => setTimeout(r, 4000));
    const poll = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
    status = (await poll.json()).data?.status;
  }

  if (status !== 'SUCCEEDED') return null;

  const dataRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&limit=5`,
  );
  if (!dataRes.ok) return null;

  const items = await dataRes.json();
  if (!Array.isArray(items) || items.length === 0) return null;

  const exact = items.find((i: any) => (i.username || '').toLowerCase() === cleaned) || items[0];
  if (!exact?.username) return null;

  const subPrice = typeof exact.subscribePrice === 'number'
    ? exact.subscribePrice
    : parseFloat(String(exact.subscribePrice || '0')) || 0;

  const bio = (exact.about || '').slice(0, 500);
  const inferredCategories = inferCategories(bio, exact.name || '', exact.location || '');

  const totalMedia = (exact.photosCount || 0) + (exact.videosCount || 0);
  const joinRaw = exact.joinDate || exact.joinedDate || '';

  const firstLink = (arr: any) => (Array.isArray(arr) && arr[0]?.url) ? arr[0].url : (Array.isArray(arr) && typeof arr[0] === 'string') ? arr[0] : '';
  const websiteRaw = exact.website || '';

  let igUrl = exact.instagramUrl || exact.primaryInstagram || firstLink(exact.instagramLinks) || '';
  let twUrl = exact.twitterUrl || firstLink(exact.twitterLinks) || '';
  let tkUrl = exact.tiktokUrl || firstLink(exact.tiktokLinks) || '';
  const tgUrl = exact.telegramUrl || '';
  let finalWebsite = websiteRaw;

  if (websiteRaw && !igUrl && /instagram\.com/i.test(websiteRaw)) igUrl = websiteRaw;
  if (websiteRaw && !twUrl && /(twitter\.com|x\.com)/i.test(websiteRaw)) { twUrl = websiteRaw; finalWebsite = ''; }
  if (websiteRaw && !tkUrl && /tiktok\.com/i.test(websiteRaw)) { tkUrl = websiteRaw; finalWebsite = ''; }

  const slug = exact.username.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  // Save ALL Apify data to DB immediately — same as the scrape route
  await connectDB();
  await OnlyFansCreator.findOneAndUpdate(
    { slug },
    {
      $set: {
        name: exact.name || exact.username,
        username: exact.username,
        slug,
        avatar: exact.avatar || '',
        avatarThumbC50: exact.avatarThumbs?.c50 || '',
        avatarThumbC144: exact.avatarThumbs?.c144 || '',
        header: exact.header || '',
        bio,
        url: `https://onlyfans.com/${exact.username}`,
        gender: 'female',
        price: subPrice,
        isFree: subPrice === 0,
        isVerified: exact.isVerified || false,
        likesCount: exact.favoritedCount || 0,
        subscriberCount: exact.subscribersCount || 0,
        mediaCount: exact.mediasCount || totalMedia,
        photosCount: exact.photosCount || 0,
        videosCount: exact.videosCount || 0,
        audiosCount: exact.audiosCount || 0,
        postsCount: exact.postsCount || 0,
        location: exact.location || '',
        website: finalWebsite,
        joinDate: joinRaw,
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
        twitterUrl: twUrl,
        tiktokUrl: tkUrl,
        telegramUrl: tgUrl,
        fanslyUrl: exact.fanslyUrl || firstLink(exact.fanslyLinks) || '',
        pornhubUrl: exact.pornhubUrl || firstLink(exact.pornhubLinks) || '',
        categories: inferredCategories,
        scrapedAt: new Date(),
      },
    },
    { upsert: true, strict: false },
  );

  return {
    source: 'apify',
    name: exact.name || exact.username,
    username: exact.username,
    avatar: exact.avatar || '',
    header: exact.header || '',
    bio,
    website: finalWebsite,
    location: exact.location || '',
    price: subPrice,
    isFree: subPrice === 0,
    isVerified: exact.isVerified || false,
    likesCount: exact.favoritedCount || 0,
    subscriberCount: exact.subscribersCount || 0,
    mediaCount: exact.mediasCount || totalMedia,
    photosCount: exact.photosCount || 0,
    videosCount: exact.videosCount || 0,
    postsCount: exact.postsCount || 0,
    joinDate: joinRaw,
    categories: inferredCategories,
    instagramUrl: igUrl,
    twitterUrl: twUrl,
    tiktokUrl: tkUrl,
    telegramUrl: tgUrl,
  };
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'asian': ['asian', 'japanese', 'korean', 'chinese', 'filipina', 'thai', 'vietnamese', 'pinay', 'desi', 'indian'],
  'blonde': ['blonde', 'blond'],
  'teen': ['teen', '18+', '19', 'barely legal', 'young'],
  'milf': ['milf', 'mommy', 'mom', 'mature', 'cougar'],
  'amateur': ['amateur', 'girl next door', 'homemade', 'real girl'],
  'redhead': ['redhead', 'red hair', 'ginger'],
  'goth': ['goth', 'gothic', 'dark', 'emo'],
  'petite': ['petite', 'tiny', 'small', 'spinner'],
  'big-ass': ['big ass', 'big butt', 'booty', 'pawg', 'thick ass', 'phat ass'],
  'big-boobs': ['big boobs', 'big tits', 'busty', 'huge tits', 'big breasts', 'dd', 'ddd'],
  'brunette': ['brunette', 'brown hair'],
  'latina': ['latina', 'latin', 'colombian', 'mexican', 'brazilian', 'puerto rican', 'dominican'],
  'ahegao': ['ahegao'],
  'alt': ['alt', 'alternative', 'punk', 'grunge', 'edgy'],
  'cosplay': ['cosplay', 'cosplayer', 'anime', 'costume'],
  'fitness': ['fitness', 'fit', 'gym', 'muscle', 'athletic', 'abs', 'workout'],
  'tattoo': ['tattoo', 'tattooed', 'tatted', 'inked'],
  'curvy': ['curvy', 'curves', 'thick', 'voluptuous', 'bbw'],
  'ebony': ['ebony', 'black', 'melanin', 'chocolate'],
  'feet': ['feet', 'foot', 'toes', 'soles'],
  'lingerie': ['lingerie', 'lace', 'stockings', 'boudoir'],
  'thick': ['thick', 'thicc'],
  'streamer': ['streamer', 'twitch', 'gamer', 'gaming'],
  'piercing': ['piercing', 'pierced'],
};

function inferCategories(bio: string, name: string, location: string): string[] {
  const text = `${bio} ${name} ${location}`.toLowerCase();
  const matched: string[] = [];
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      matched.push(cat);
    }
  }
  return matched;
}

interface SubmitCreatorInput {
  name: string;
  onlyfansUrl: string;
  website?: string;
  description: string;
  photoUrls: string[];
  instagram?: string;
  twitter?: string;
  telegram?: string;
  tiktok?: string;
  location?: string;
  categories?: string[];
  price?: string;
  subscriberCount?: number;
  likesCount?: number;
  photosCount?: number;
  videosCount?: number;
  postsCount?: number;
}

async function optimizeAndUploadToR2(sourceUrl: string, key: string): Promise<string | null> {
  try {
    const resp = await fetch(sourceUrl);
    if (!resp.ok) return null;
    const buf = Buffer.from(await resp.arrayBuffer());
    const optimized = await sharp(buf)
      .jpeg({ quality: 95, mozjpeg: true })
      .withMetadata({
        exif: {
          IFD0: {
            Copyright: '© Erogram.pro',
            Artist: 'Erogram.pro',
            ImageDescription: 'Erogram.pro - OnlyFans Creator Directory',
          },
        },
      })
      .toBuffer();
    return await uploadToR2(optimized, key, 'image/jpeg');
  } catch {
    return null;
  }
}

export async function submitCreator(input: SubmitCreatorInput) {
  const { name, onlyfansUrl, photoUrls } = input;

  if (!name?.trim() || !onlyfansUrl?.trim() || !photoUrls?.length) {
    return { success: false, error: 'Name, OnlyFans URL, and at least one photo are required.' };
  }

  if (!input.description?.trim() || input.description.trim().length < 20) {
    return { success: false, error: 'Description must be at least 20 characters.' };
  }

  const usernameMatch = onlyfansUrl.match(/onlyfans\.com\/([a-zA-Z0-9._-]+)/);
  if (!usernameMatch) {
    return { success: false, error: 'Invalid OnlyFans URL. Use format: https://onlyfans.com/username' };
  }

  const username = usernameMatch[1].toLowerCase();
  const slug = username.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  await connectDB();

  const existing = await OnlyFansCreator.findOne({ slug }).lean() as any;
  if (existing) {
    const merged = [...new Set([...(existing.categories || []), ...(input.categories || [])])];
    const updateFields: Record<string, any> = { categories: merged };
    if (input.description?.trim()) updateFields.bio = input.description.trim();
    if (input.telegram?.trim()) updateFields.telegramUrl = input.telegram.trim();
    if (input.instagram?.trim()) updateFields.instagramUrl = input.instagram.trim();
    if (input.twitter?.trim()) updateFields.twitterUrl = input.twitter.trim();
    if (input.tiktok?.trim()) updateFields.tiktokUrl = input.tiktok.trim();
    if (input.location?.trim()) updateFields.location = input.location.trim();
    if (input.website?.trim()) updateFields.website = input.website.trim();
    if (input.subscriberCount) updateFields.subscriberCount = input.subscriberCount;
    if (input.likesCount) updateFields.likesCount = input.likesCount;
    if (input.photosCount) updateFields.photosCount = input.photosCount;
    if (input.videosCount) updateFields.videosCount = input.videosCount;
    if (input.postsCount) updateFields.postsCount = input.postsCount;

    if (photoUrls?.length && isR2Configured()) {
      const r2Urls: string[] = [];
      for (let i = 0; i < photoUrls.length && i < 8; i++) {
        const suffix = i === 0 ? '' : String(i + 1);
        const key = `onlyfanssearch/${slug}-onlyfans${suffix}.jpg`;
        const r2Url = await optimizeAndUploadToR2(photoUrls[i], key);
        r2Urls.push(r2Url || photoUrls[i]);
      }
      if (r2Urls[0]) updateFields.avatar = r2Urls[0];
      if (r2Urls[1]) updateFields.header = r2Urls[1];
      if (r2Urls.length > 2) updateFields.extraPhotos = r2Urls.slice(2);
    }

    await OnlyFansCreator.updateOne({ slug }, { $set: updateFields }, { strict: false });
    return { success: true, slug, id: existing._id.toString() };
  }

  const r2Ready = isR2Configured();
  const r2Urls: string[] = [];

  for (let i = 0; i < photoUrls.length && i < 8; i++) {
    if (r2Ready) {
      const suffix = i === 0 ? '' : String(i + 1);
      const key = `onlyfanssearch/${slug}-onlyfans${suffix}.jpg`;
      const r2Url = await optimizeAndUploadToR2(photoUrls[i], key);
      r2Urls.push(r2Url || photoUrls[i]);
    } else {
      r2Urls.push(photoUrls[i]);
    }
  }

  const avatar = r2Urls[0] || '';
  const header = r2Urls[1] || '';

  const priceNum = input.price
    ? input.price.toLowerCase() === 'free' ? 0 : parseFloat(input.price) || 0
    : 0;

  const doc = await OnlyFansCreator.findOneAndUpdate(
    { slug },
    {
      $set: {
        name: name.trim(),
        username,
        slug,
        avatar,
        header,
        url: `https://onlyfans.com/${username}`,
        website: input.website?.trim() || '',
        gender: 'female',
        categories: input.categories?.length ? input.categories : [],
        isFree: priceNum === 0,
        isVerified: false,
        price: priceNum,
        likesCount: input.likesCount || 0,
        subscriberCount: input.subscriberCount || 0,
        mediaCount: (input.photosCount || 0) + (input.videosCount || 0),
        photosCount: input.photosCount || 0,
        videosCount: input.videosCount || 0,
        postsCount: input.postsCount || 0,
        scrapedAt: null,
        location: input.location?.trim() || '',
        instagramUrl: input.instagram?.trim() || '',
        twitterUrl: input.twitter?.trim() || '',
        tiktokUrl: input.tiktok?.trim() || '',
        telegramUrl: input.telegram?.trim() || '',
        bio: input.description.trim(),
        submittedByUser: true,
        extraPhotos: r2Urls.slice(2),
      },
    },
    { upsert: true, new: true, strict: false },
  );

  return { success: true, slug, id: doc._id.toString() };
}

const NP_BASE = 'https://api.nowpayments.io/v1';

export async function createFeaturedCreatorInvoice(creatorId: string) {
  const API_KEY = process.env.NOWPAYMENTS_API_KEY || '';
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';

  if (!API_KEY) return { error: 'Crypto payments are not configured.' };

  await connectDB();
  const creator = await OnlyFansCreator.findById(creatorId).lean() as any;
  if (!creator) return { error: 'Creator not found.' };

  const orderId = `featured__${creatorId}__${Date.now()}`;

  try {
    const res = await fetch(`${NP_BASE}/invoice`, {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price_amount: 97,
        price_currency: 'usd',
        pay_currency: 'usdttrc20',
        order_id: orderId,
        order_description: `Featured listing for ${creator.name} on Erogram`,
        ipn_callback_url: `${SITE_URL}/api/payments/nowpayments/webhook`,
        success_url: `${SITE_URL}/${creator.slug}?featured=success`,
        cancel_url: `${SITE_URL}/submit?featured=cancelled`,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.invoice_url) {
      console.error('NowPayments featured invoice error:', data);
      return { error: 'Failed to create payment invoice.' };
    }

    return { url: data.invoice_url };
  } catch (err) {
    console.error('NowPayments featured error:', err);
    return { error: 'Server error creating payment.' };
  }
}
