/**
 * Upload R2 covers (+ XMODE gallery) and seed AI Peep + XMODE on production AINSFW.
 * Run: node --env-file=.env.local scripts/seed-xmode-aipeep-listings.mjs
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const ASSETS = '/Users/themaf/.cursor/projects/Users-themaf-Desktop-ErogramPRO/assets';

const XMODE_SLUG = 'xmode-ai-nsfw-image-generator';
const AIPEEP_SLUG = 'ai-peep-ai-nsfw-chat';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const R2_PUBLIC = (process.env.R2_PUBLIC_URL || 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev').replace(
  /\/$/,
  '',
);
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'erogramimages';

if (!accountId || !accessKeyId || !secretAccessKey || !process.env.MONGODB_URI) {
  console.error('Missing R2 or MONGODB_URI');
  process.exit(1);
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

async function compressAinsfwCover(buf) {
  const MAX = 100 * 1024;
  const attempts = [
    { w: 800, q: 82 },
    { w: 800, q: 70 },
    { w: 700, q: 62 },
    { w: 640, q: 55 },
    { w: 600, q: 48 },
    { w: 520, q: 42 },
    { w: 460, q: 38 },
    { w: 400, q: 34 },
  ];
  let compressed = buf;
  for (const a of attempts) {
    compressed = await sharp(buf)
      .rotate()
      .resize(a.w, a.w, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: a.q })
      .toBuffer();
    if (compressed.length <= MAX) break;
  }
  return compressed;
}

async function compressGallery(buf) {
  let compressed = await sharp(buf)
    .rotate()
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
  if (compressed.length > 280 * 1024) {
    compressed = await sharp(buf)
      .rotate()
      .resize(960, 960, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 62 })
      .toBuffer();
  }
  return compressed;
}

async function putWebp(key, body) {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: 'image/webp',
    }),
  );
  return `${R2_PUBLIC}/${key}`;
}

const uploads = [
  {
    src: 'Screenshot_2026-11-11_at_04.26.49-2453e043-aae2-422e-9384-6a92f92e0073.jpg',
    key: `ainsfw/${XMODE_SLUG}.webp`,
    cover: true,
  },
  {
    src: 'Screenshot_2026-11-11_at_04.27.27-85d58d6b-d87b-4142-b489-38c79c67e07c.jpg',
    key: `ainsfw/gallery/${XMODE_SLUG}-1.webp`,
    cover: false,
  },
  {
    src: 'Screenshot_2026-11-11_at_04.27.10-14fdd41f-1a97-4b87-8fe5-7cd2055393a6.jpg',
    key: `ainsfw/gallery/${XMODE_SLUG}-2.webp`,
    cover: false,
  },
  {
    src: 'Screenshot_2026-11-11_at_04.28.51-cac02246-003d-4d7b-b046-5002b94756ae.jpg',
    key: `ainsfw/${AIPEEP_SLUG}.webp`,
    cover: true,
  },
];

const urls = {};
for (const u of uploads) {
  const raw = fs.readFileSync(path.join(ASSETS, u.src));
  const webp = u.cover ? await compressAinsfwCover(raw) : await compressGallery(raw);
  const url = await putWebp(u.key, webp);
  urls[u.key] = url;
  console.log(`${u.key} ${webp.length}b`);
}

const xmodeCover = urls[`ainsfw/${XMODE_SLUG}.webp`];
const xmodeGallery = [
  urls[`ainsfw/gallery/${XMODE_SLUG}-1.webp`],
  urls[`ainsfw/gallery/${XMODE_SLUG}-2.webp`],
];
const aipeepCover = urls[`ainsfw/${AIPEEP_SLUG}.webp`];

const featuredUntil = new Date();
featuredUntil.setDate(featuredUntil.getDate() + 30);
const now = new Date();

const listings = [
  {
    slug: XMODE_SLUG,
    submission: {
      name: 'XMODE',
      slug: XMODE_SLUG,
      category: 'AI NSFW Image Generator',
      categories: ['AI NSFW Image Generator', 'AI Video Generator'],
      vendor: 'XMODE',
      description:
        'XMODE is an uncensored AI content studio built for creators who want one trained identity and unlimited output. Upload a single reference photo and the platform generates identity-locked stills, short cinematic clips, and gallery-style sets without the usual cap on volume. Image engines cover portrait and body work with full NSFW control; video turns existing AI portraits into short-form clips in a click. Members get Discord access and API hooks for high-volume workflows, and the landing page is upfront about uncensored generation rather than hiding it behind euphemisms.',
      image: xmodeCover,
      websiteUrl: 'https://xmode.ai',
      tags: ['ai nsfw image generator', 'uncensored ai', 'ai video generator', 'identity locked ai', 'ai content creation'],
      subscription: 'Freemium & Paid',
      payment: ['Credit Cards', 'Crypto'],
      tryNowUrl: 'https://xmode.ai',
      status: 'approved',
      submissionTier: 'basic',
      paymentStatus: 'paid',
      paymentId: 'manual__xmode-ai-nsfw-image-generator__paid',
      boosted: false,
      featured: true,
      featuredExpiresAt: featuredUntil,
      unlisted: false,
      awaitingAdminReview: false,
      paidAt: now,
      screenshots: [xmodeCover, ...xmodeGallery],
    },
    stats: {
      featured: true,
      imageOverride: xmodeCover,
      customGallery: [xmodeCover, ...xmodeGallery],
      galleryManaged: true,
      coverManaged: true,
    },
    featured: true,
  },
  {
    slug: AIPEEP_SLUG,
    submission: {
      name: 'AI Peep',
      slug: AIPEEP_SLUG,
      category: 'AI NSFW Chat',
      categories: ['AI NSFW Chat', 'AI Characters'],
      vendor: 'AI Peep',
      description:
        'AI Peep is a browser-based NSFW character hub where each Peep ships with its own voice, gallery, and roleplay hook. Visitors pick a persona from the carousel, switch between SFW and NSFW modes, and jump into free chat, image and video generation, or a custom Peep builder without installing an app. The product leans into character depth: bios, scene text, and gallery tabs that make each listing feel like a mini profile rather than a generic chatbot tile.',
      image: aipeepCover,
      websiteUrl: 'https://aipeeps.com',
      tags: ['ai nsfw chat', 'ai characters', 'uncensored ai chat', 'ai roleplay', 'nsfw ai images'],
      subscription: 'Freemium & Paid',
      payment: ['Credit Cards'],
      tryNowUrl: 'https://aipeeps.com',
      status: 'approved',
      submissionTier: 'basic',
      paymentStatus: 'paid',
      paymentId: 'manual__ai-peep-ai-nsfw-chat__paid',
      boosted: false,
      featured: false,
      featuredExpiresAt: null,
      unlisted: false,
      awaitingAdminReview: false,
      paidAt: now,
      screenshots: [aipeepCover],
    },
    stats: {
      featured: false,
      imageOverride: aipeepCover,
      customGallery: [aipeepCover],
      galleryManaged: true,
      coverManaged: true,
    },
    featured: false,
  },
];

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;
const subCol = db.collection('ainsfwsubmissions');
const statsCol = db.collection('ainsfwtoolstats');
const advertiserCol = db.collection('advertisers');
const campaignCol = db.collection('campaigns');

let advertiserId = null;
const ad = await advertiserCol.findOne({ name: 'AI NSFW Tools' });
if (ad) advertiserId = ad._id;
else {
  const ero = await advertiserCol.findOne({ name: 'EROGRAM' });
  advertiserId = ero?._id;
}

for (const row of listings) {
  await subCol.updateOne(
    { slug: row.slug },
    {
      $set: { ...row.submission, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  const statsSet = {
    upvotes: 0,
    downvotes: 0,
    ...row.stats,
    updatedAt: now,
  };

  if (row.featured && advertiserId) {
    const camp = await campaignCol.findOne({ internalName: row.slug });
    let campaignId = camp?._id;
    if (!camp) {
      const endDate = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
      const insert = await campaignCol.insertOne({
        advertiserId,
        name: `Featured NSFW: ${row.slug}`,
        internalName: row.slug,
        slot: 'ainsfw',
        creative: row.submission.image,
        destinationUrl: `/${row.slug}`,
        startDate: now,
        endDate,
        status: 'active',
        isVisible: true,
        adType: 'featured-nsfw',
        description: `Featured AI NSFW tool: ${row.slug}`,
        buttonText: 'Try Now',
        placements: ['ainsfw-featured'],
        feedTier: 1,
        priority: 'boost',
        createdAt: now,
        updatedAt: now,
      });
      campaignId = insert.insertedId;
      console.log('Campaign created', row.slug, campaignId);
    } else {
      await campaignCol.updateOne(
        { _id: camp._id },
        {
          $set: {
            status: 'active',
            isVisible: true,
            creative: row.submission.image,
            placements: ['ainsfw-featured'],
            feedTier: 1,
            priority: 'boost',
            updatedAt: now,
          },
        },
      );
      campaignId = camp._id;
    }
    statsSet.campaignId = campaignId;
    statsSet.featured = true;
  }

  await statsCol.updateOne(
    { slug: row.slug },
    {
      $set: statsSet,
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  console.log(`https://erogramx.com/ainsfw/${row.slug}`);
}

await mongoose.disconnect();
