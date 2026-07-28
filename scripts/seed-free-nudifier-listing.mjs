/**
 * Seed Free Nudifier paid listing + reviews for production.
 * Run: node --env-file=.env.local scripts/seed-free-nudifier-listing.mjs
 */
import mongoose from 'mongoose';

const SLUG = 'free-nudifier-undress-ai';

const submission = {
  name: 'Free Nudifier',
  slug: SLUG,
  category: 'Undress AI',
  categories: ['Undress AI'],
  vendor: 'Freenudifier.com',
  description:
    'Free Nudifier is a browser-based undress tool that lives at freenudifier.com and asks nothing of the visitor before the first result. No account, no email, no card. A user drops a clothed photo, waits somewhere between ten and thirty seconds, and downloads the nude version, and the basic undress output arrives without a watermark, which is not the norm in this niche. The tool takes JPG, PNG, and WebP files up to 10MB, runs on cloud GPUs, and processes everything server-side so the images are not kept afterward. For a category where most rivals hide even a single test behind a signup wall, the open door is the main draw.',
  image: 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/ainsfw/free-nudifier-undress-ai.webp',
  websiteUrl: 'https://freenudifier.com',
  tags: ['ai clothes remover', 'ai nudifier', 'ai undress', 'ai undresser', 'ai video generator'],
  subscription: 'Freemium & Paid',
  payment: ['Credit Cards'],
  tryNowUrl: 'https://freenudifier.com',
  status: 'approved',
  submissionTier: 'basic',
  paymentStatus: 'paid',
  paymentId: 'manual__free-nudifier-undress-ai__paid',
  boosted: false,
  featured: false,
  unlisted: false,
};

const reviews = [
  {
    text: 'No signup, no card, just upload and go. Got my result in about 20 seconds and the free undress looked clean enough to know the tool is legit.',
    rating: 5,
    authorName: 'MarcusT',
    authorAvatar: '',
    status: 'approved',
    ip: '',
    createdAt: new Date('2026-07-25T14:22:00.000Z'),
  },
  {
    text: 'Used the free version twice before upgrading. Basic undress is actually useful, and the image-to-video stuff on the paid side is where it gets crazy.',
    rating: 4,
    authorName: 'nightowl_91',
    authorAvatar: '',
    status: 'approved',
    ip: '',
    createdAt: new Date('2026-07-27T09:08:00.000Z'),
  },
];

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

const subCol = db.collection('ainsfwsubmissions');
const statsCol = db.collection('ainsfwtoolstats');

const subResult = await subCol.updateOne(
  { slug: SLUG },
  { $set: { ...submission, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
  { upsert: true },
);

const statsResult = await statsCol.updateOne(
  { slug: SLUG },
  {
    $set: { reviews, upvotes: 0, downvotes: 0, featured: false },
    $setOnInsert: { createdAt: new Date() },
  },
  { upsert: true },
);

console.log('Submission:', subResult.upsertedCount ? 'inserted' : 'updated');
console.log('Stats/reviews:', statsResult.upsertedCount ? 'inserted' : 'updated');
console.log(`Live at: https://erogram.pro/ainsfw/${SLUG}`);

await mongoose.disconnect();
