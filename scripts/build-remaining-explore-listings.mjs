/**
 * Build remaining explore category listings (TPS desc/thumb, PD desc fallback, og:image fallback).
 * Run: node --env-file=.env.local scripts/build-remaining-explore-listings.mjs
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const tpsHtml = fs.readFileSync(
  path.join(process.env.HOME, 'Downloads', 'Top Porn Sites - List of Best Porn Sites Free Videos 2026.html'),
  'utf8',
);
const pdHtml = fs.readFileSync(
  path.join(process.env.HOME, 'Downloads', 'Porn Dude - Best Porn Sites & Free Porn Tubes List of 2026!.html'),
  'utf8',
);

const R2_BASE = process.env.R2_PUBLIC_URL.replace(/\/$/, '');

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseTpsSites() {
  const itemRe =
    /<li class="individualLiMagnigying" id="([^"]+)"[\s\S]*?data-thumb="([^"]*)" data-desc="([^"]*)"[^>]*>\s*([^<]+?)<\/a>/g;
  const map = new Map();
  let m;
  while ((m = itemRe.exec(tpsHtml))) {
    const name = m[4].trim();
    map.set(name, {
      slug: m[1].replace(/-\d+$/, ''),
      name,
      thumb: m[2].replace(/&amp;/g, '&'),
      desc: m[3].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/—/g, ' - '),
    });
  }
  return map;
}

function parsePdDesc() {
  const itemRe =
    /<li class="category-item"[^>]*>[\s\S]*?<a class="link-analytics[^"]*"[^>]*>([^<]+)<\/a>[\s\S]*?<p class="desc">([\s\S]*?)<\/p>/g;
  const map = new Map();
  let m;
  while ((m = itemRe.exec(pdHtml))) {
    const name = m[1].replace(/\s+/g, ' ').trim();
    const desc = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().replace(/—/g, ' - ');
    if (!map.has(name)) map.set(name, desc);
  }
  return map;
}

async function fetchOgImage(url, pageUrl) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ErogramBot/1.0)' },
      signal: AbortSignal.timeout(12000),
    });
    const html = await res.text();
    const match =
      html.match(/property="og:image" content="([^"]+)"/i) ||
      html.match(/property='og:image' content='([^']+)'/i) ||
      html.match(/name="twitter:image" content="([^"]+)"/i);
    const raw = match?.[1]?.replace(/&amp;/g, '&') ?? null;
    if (!raw) return null;
    if (raw.startsWith('//')) return `https:${raw}`;
    if (raw.startsWith('/')) {
      const base = new URL(pageUrl ?? url);
      return `${base.origin}${raw}`;
    }
    return raw;
  } catch {
    return null;
  }
}

function pdReviewUrl(name) {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `<li class="category-item"[^>]*>[\\s\\S]*?>(?:\\s*)${esc}\\s*<\\/a>[\\s\\S]*?href="(https://theporndude\\.com/\\d+/[^"]+)"`,
    'i',
  );
  const m = pdHtml.match(re);
  return m?.[1] ?? null;
}

async function resolveImage(site, tps) {
  if (tps?.thumb) return tps.thumb;
  const og = await fetchOgImage(site.externalUrl, site.externalUrl);
  if (og) return og;
  const review = pdReviewUrl(site.name);
  if (review) {
    const reviewOg = await fetchOgImage(review, review);
    if (reviewOg) return reviewOg;
  }
  try {
    const domain = new URL(site.externalUrl).hostname.replace(/^www\./, '');
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
  } catch {
    return null;
  }
}

async function toWebpBuffer(sourceUrl) {
  const res = await fetch(sourceUrl, { redirect: 'follow' });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return sharp(buf).resize(800, null, { withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
}

const tpsByName = parseTpsSites();
const pdByName = parsePdDesc();

const CATEGORIES = [
  {
    categorySlug: 'best-premium-amateur-porn-site',
    categoryTitle: 'Best Premium Amateur Porn Site',
    r2Folder: 'premium-amateur-porn',
    sites: [
      { name: 'Wife Bucket', externalUrl: 'https://wifebucket.com/' },
      { name: 'Exploited College Girls', externalUrl: 'https://exploitedcollegegirls.com/' },
      { name: 'NetVideoGirls', externalUrl: 'https://netvideogirls.com/' },
    ],
  },
  {
    categorySlug: 'best-free-cam-girl-video-sites',
    categoryTitle: 'Best Free Cam Girl Video Sites',
    r2Folder: 'free-cam-girl-video',
    sites: [
      { name: 'CamWhores', externalUrl: 'https://camwhores.tv/' },
      { name: 'Recurbate', externalUrl: 'https://recu.me/' },
      { name: 'LiveCamRips', externalUrl: 'https://livecamrips.tv/' },
    ],
  },
  {
    categorySlug: 'best-live-asian-sex-cams',
    categoryTitle: 'Best Live Asian Sex Cams',
    r2Folder: 'live-asian-sex-cams',
    sites: [
      { name: 'StripChat Asian', externalUrl: 'https://stripchat.com/girls/asian', slug: 'stripchat-asian' },
      { name: 'LiveSexAsian', externalUrl: 'https://livesexasian.com/' },
      { name: 'SakuraLive', externalUrl: 'https://sakuralive.com/' },
    ],
  },
  {
    categorySlug: 'best-asian-porn-sites',
    categoryTitle: 'Best Asian Porn Sites',
    r2Folder: 'asian-porn',
    sites: [
      { name: 'Zenra', externalUrl: 'https://www.zenra.net/' },
      { name: 'Vjav', externalUrl: 'https://vjav.com/' },
      { name: 'Jav.Guru', externalUrl: 'https://jav.guru/', slug: 'jav-guru' },
    ],
  },
  {
    categorySlug: 'best-sex-chat',
    categoryTitle: 'Best Sex Chat',
    r2Folder: 'sex-chat',
    sites: [
      { name: 'Flingster', externalUrl: 'https://flingster.com/' },
      { name: 'CooMeet', externalUrl: 'https://coomeet.com/' },
      { name: 'Flirtify', externalUrl: 'https://flirtify.com/' },
    ],
  },
  {
    categorySlug: 'best-ai-porn-sites',
    categoryTitle: 'Best AI Porn Sites',
    r2Folder: 'ai-porn',
    sites: [
      { name: 'PlayBun', externalUrl: 'https://www.playbun.com/' },
      { name: 'GenesisPorn', externalUrl: 'https://genesisporn.net/' },
      { name: 'MakeHerPorn AI', externalUrl: 'https://makeherpornai.com/', slug: 'makeherporn-ai' },
    ],
  },
  {
    categorySlug: 'best-ai-porn-generator-sites',
    categoryTitle: 'Best AI Porn Generator Sites',
    r2Folder: 'ai-porn-generator',
    sites: [
      { name: 'PlayBun', externalUrl: 'https://www.playbun.com/', slug: 'playbun-generator' },
      { name: 'GenesisPorn', externalUrl: 'https://genesisporn.net/', slug: 'genesisporn-generator' },
      { name: 'MakeHerPorn AI', externalUrl: 'https://makeherpornai.com/', slug: 'makeherporn-ai-generator' },
    ],
  },
  {
    categorySlug: 'best-lesbian-porn-sites',
    categoryTitle: 'Best Lesbian Porn Sites',
    r2Folder: 'lesbian-porn',
    sites: [
      { name: 'PornHub Lesbian', externalUrl: 'https://www.pornhub.com/video?c=27', slug: 'pornhub-lesbian' },
      { name: 'XVideos Lesbian', externalUrl: 'https://www.xvideos.com/?k=lesbian', slug: 'xvideos-lesbian' },
      { name: 'xHamster Lesbian', externalUrl: 'https://xhamster.com/categories/lesbian', slug: 'xhamster-lesbian' },
    ],
  },
  {
    categorySlug: 'best-premium-lesbian-porn-site',
    categoryTitle: 'Best Premium Lesbian Porn Site',
    r2Folder: 'premium-lesbian-porn',
    sites: [
      { name: 'AdultTime Lesbian', externalUrl: 'https://www.adulttime.com/', slug: 'adulttime-lesbian' },
      { name: 'GirlsWay', externalUrl: 'https://www.girlsway.com/' },
      { name: 'GirlGirl', externalUrl: 'https://www.girlgirl.com/' },
    ],
  },
  {
    categorySlug: 'best-porn-for-women-sites',
    categoryTitle: 'Best Porn for Women Sites',
    r2Folder: 'porn-for-women',
    sites: [
      { name: 'PornHub PornForWomen', externalUrl: 'https://www.pornhub.com/categories/porn-for-women', slug: 'pornhub-porn-for-women' },
      { name: 'ForHerTube', externalUrl: 'https://forhertube.com/' },
      { name: 'xHamster PornForWomen', externalUrl: 'https://xhamster.com/categories/porn-for-women', slug: 'xhamster-porn-for-women' },
    ],
  },
  {
    categorySlug: 'best-premium-porn-for-women',
    categoryTitle: 'Best Premium Porn For Women',
    r2Folder: 'premium-porn-for-women',
    sites: [
      { name: 'BellesaPlus', externalUrl: 'https://www.bellesaplus.com/' },
      { name: 'SexArt', externalUrl: 'https://www.sexart.com/' },
      { name: 'Hot Guys Fuck', externalUrl: 'https://www.hotguysfuck.com/', slug: 'hot-guys-fuck' },
    ],
  },
  {
    categorySlug: 'best-premium-fetish-porn-sites',
    categoryTitle: 'Best Premium Fetish Porn Sites',
    r2Folder: 'premium-fetish-porn',
    sites: [
      { name: 'Kink', externalUrl: 'https://www.kink.com/' },
      { name: 'Clips4Sale', externalUrl: 'https://www.clips4sale.com/' },
      { name: 'LoveHerFeet', externalUrl: 'https://www.loveherfeet.com/', slug: 'loveherfeet' },
    ],
  },
  {
    categorySlug: 'best-feet-porn-sites',
    categoryTitle: 'Best Feet Porn Sites',
    r2Folder: 'feet-porn',
    sites: [
      { name: 'PornHub Feet', externalUrl: 'https://www.pornhub.com/video?c=93', slug: 'pornhub-feet' },
      { name: 'XVideos Feet', externalUrl: 'https://www.xvideos.com/?k=feet', slug: 'xvideos-feet' },
      { name: 'xHamster Feet', externalUrl: 'https://xhamster.com/categories/feet', slug: 'xhamster-feet' },
    ],
  },
  {
    categorySlug: 'best-pov-porn-sites',
    categoryTitle: 'Best POV Porn Sites',
    r2Folder: 'pov-porn',
    sites: [
      { name: 'PornHub POV', externalUrl: 'https://www.pornhub.com/video?c=41', slug: 'pornhub-pov' },
      { name: 'XVideos POV', externalUrl: 'https://www.xvideos.com/?k=pov', slug: 'xvideos-pov' },
      { name: 'xHamster POV', externalUrl: 'https://xhamster.com/categories/pov', slug: 'xhamster-pov' },
    ],
  },
  {
    categorySlug: 'best-reddit-nsfw',
    categoryTitle: 'Best Reddit NSFW',
    r2Folder: 'reddit-nsfw',
    sites: [
      { name: 'GoneWild', externalUrl: 'https://www.reddit.com/r/gonewild/', slug: 'gonewild' },
      { name: 'NSFW', externalUrl: 'https://www.reddit.com/r/nsfw/', slug: 'reddit-nsfw' },
      { name: 'Reddit NSFW GIF', externalUrl: 'https://www.reddit.com/r/NSFW_GIF/', slug: 'reddit-nsfw-gif' },
    ],
  },
  {
    categorySlug: 'best-sex-toys-websites',
    categoryTitle: 'Best Sex Toys websites',
    r2Folder: 'sex-toys',
    sites: [
      { name: 'RoseToy', externalUrl: 'https://rosetoy.com/' },
      { name: 'RoseToy.net', externalUrl: 'https://rosetoy.net/', slug: 'rosetoy-net' },
      { name: 'AdamEve', externalUrl: 'https://www.adameve.com/' },
    ],
  },
  {
    categorySlug: 'best-sex-dolls-brands',
    categoryTitle: 'Best Sex Dolls brands',
    r2Folder: 'sex-dolls',
    sites: [
      { name: 'JoyLoveDolls', externalUrl: 'https://www.joylovedolls.com/' },
      { name: 'YourDoll', externalUrl: 'https://www.yourdoll.com/' },
      { name: 'RealSexDoll', externalUrl: 'https://realsexdoll.com/' },
      { name: 'SexyRealSexDolls', externalUrl: 'https://sexyrealsexdolls.com/' },
      { name: 'AmericanSexDolls', externalUrl: 'https://americansexdolls.com/' },
    ],
  },
  {
    categorySlug: 'best-buy-used-panties',
    categoryTitle: 'Best Buy Used Panties',
    r2Folder: 'buy-used-panties',
    sites: [
      { name: 'Sofia Gray', externalUrl: 'https://sofiagray.com/', slug: 'sofia-gray' },
      { name: 'AllThingsWorn', externalUrl: 'https://allthingsworn.com/' },
      { name: 'PantyDeal', externalUrl: 'https://pantydeal.com/' },
    ],
  },
  {
    categorySlug: 'best-escorts',
    categoryTitle: 'Best Escorts',
    r2Folder: 'escorts',
    sites: [
      { name: 'SkipTheGames', externalUrl: 'https://skipthegames.com/' },
      { name: 'Euro Girls Escort', externalUrl: 'https://www.eurogirlsescort.com/', slug: 'euro-girls-escort' },
      { name: 'Eros Guide', externalUrl: 'https://www.eros.com/', slug: 'eros-guide' },
    ],
  },
  {
    categorySlug: 'best-hookup',
    categoryTitle: 'Best Hookup',
    r2Folder: 'hookup',
    sites: [
      { name: 'BangStars', externalUrl: 'https://bangstars.com/' },
      { name: 'Fling', externalUrl: 'https://www.fling.com/' },
      { name: 'Flirt', externalUrl: 'https://flirt.com/' },
      { name: 'AdultFriendFinder', externalUrl: 'https://adultfriendfinder.com/' },
      { name: 'FindAFuckBuddy', externalUrl: 'https://www.findafuckbuddy.net/' },
      { name: 'FreeLocalSex', externalUrl: 'https://www.freelocalsex.net/' },
      { name: 'SexMessenger', externalUrl: 'https://sexmessenger.com/' },
      { name: 'HighReply', externalUrl: 'https://www.highreply.com/' },
    ],
  },
  {
    categorySlug: 'best-male-enhancement',
    categoryTitle: 'Best Male Enhancement Pills',
    r2Folder: 'male-enhancement',
    sites: [
      { name: 'VigRX Plus', externalUrl: 'https://www.vigrxplus.com/', slug: 'vigrx-plus' },
      { name: 'Semenax', externalUrl: 'https://www.semenax.com/' },
      { name: 'Best Pill Service', externalUrl: 'https://bestpillservice.com/', slug: 'best-pill-service' },
    ],
  },
];

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const bucket = process.env.R2_BUCKET_NAME || 'erogramimages';

const imageCache = new Map();
const outputGroups = [];

for (const category of CATEGORIES) {
  const listings = [];
  for (const site of category.sites) {
    const slug = site.slug ?? tpsByName.get(site.name)?.slug ?? slugify(site.name);
    const tps = tpsByName.get(site.name);
    const description = tps?.desc ?? pdByName.get(site.name);
    if (!description) {
      console.error('NO DESCRIPTION', category.categorySlug, site.name);
      continue;
    }

    let imageUrl = imageCache.get(slug);
    if (!imageUrl) {
      const source = await resolveImage(site, tps);
      if (!source) {
        console.error('NO IMAGE', site.name);
        continue;
      }
      try {
        const webp = await toWebpBuffer(source);
        const key = `explore/${category.r2Folder}/${slug}.webp`;
        await r2.send(
          new PutObjectCommand({ Bucket: bucket, Key: key, Body: webp, ContentType: 'image/webp' }),
        );
        imageUrl = `${R2_BASE}/${key}`;
        imageCache.set(slug, imageUrl);
        console.log('UP', site.name, imageUrl);
      } catch (err) {
        console.error('UPLOAD FAIL', site.name, err.message);
        continue;
      }
    } else {
      console.log('CACHE', site.name, imageUrl);
    }

    listings.push({
      slug,
      name: site.name,
      description,
      image: imageUrl,
      externalUrl: site.externalUrl,
    });
  }

  outputGroups.push({
    categorySlug: category.categorySlug,
    categoryTitle: category.categoryTitle,
    listings,
  });
}

const outPath = path.join(root, 'lib/explore/remainingCategoryListings.ts');
const file = `/** Auto-generated explore listings for remaining categories. */

import type { ExploreSiteListingBase } from '@/lib/explore/exploreSiteListings';

export type ExploreCategoryListingGroup = {
  categorySlug: string;
  categoryTitle: string;
  listings: ExploreSiteListingBase[];
};

export const REMAINING_CATEGORY_LISTING_GROUPS: ExploreCategoryListingGroup[] = ${JSON.stringify(outputGroups, null, 2)};
`;
fs.writeFileSync(outPath, file);
console.log('Wrote', outPath);
