/**
 * Fix script: adjust upvotes for specific tools.
 * - Honeybot → 10
 * - AI Chat / AI Image / AI Roleplay (last 30 tools) → random 0–22
 * Force-overwrites regardless of current value.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

function slugify(category, name) {
  const prefix = category.toLowerCase().replace(/\s+/g, '-');
  const n = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${prefix}-${n}`;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const OVERRIDES = {
  [slugify('AI Girlfriend', 'Honeybot')]: 10,
};

const LOW_TOOLS = [
  // AI Chat (10)
  { cat: 'AI Chat', name: 'SpicyChat' },
  { cat: 'AI Chat', name: 'JuicyChat AI' },
  { cat: 'AI Chat', name: 'PepHop' },
  { cat: 'AI Chat', name: 'Joyland' },
  { cat: 'AI Chat', name: 'DreamGen' },
  { cat: 'AI Chat', name: 'Nextpart AI' },
  { cat: 'AI Chat', name: 'JOI AI' },
  { cat: 'AI Chat', name: 'aiAllure' },
  { cat: 'AI Chat', name: 'Wemate' },
  { cat: 'AI Chat', name: 'Lollipop' },
  // AI Image (10)
  { cat: 'AI Image', name: 'Playbox' },
  { cat: 'AI Image', name: 'NudeFab' },
  { cat: 'AI Image', name: 'CelebMakerAI' },
  { cat: 'AI Image', name: 'CreatePorn' },
  { cat: 'AI Image', name: 'Seduced' },
  { cat: 'AI Image', name: 'VibeNude' },
  { cat: 'AI Image', name: 'SoulGen' },
  { cat: 'AI Image', name: 'Facy AI' },
  { cat: 'AI Image', name: 'Swapzy' },
  { cat: 'AI Image', name: 'FaceSwapLab' },
  // AI Roleplay (10)
  { cat: 'AI Roleplay', name: 'Hyperdreams' },
  { cat: 'AI Roleplay', name: 'StoryChan' },
  { cat: 'AI Roleplay', name: 'RedQuill' },
  { cat: 'AI Roleplay', name: 'Luvy AI' },
  { cat: 'AI Roleplay', name: 'Kink AI' },
  { cat: 'AI Roleplay', name: 'My Dream Boy' },
  { cat: 'AI Roleplay', name: 'Juicy AI' },
  { cat: 'AI Roleplay', name: 'Avtaar AI' },
  { cat: 'AI Roleplay', name: 'Nextpart AI' },
  { cat: 'AI Roleplay', name: 'Secrets AI' },
];

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB\n');

  const col = mongoose.connection.collection('ainsfwtoolstats');
  const now = new Date();

  // Fix Honeybot
  const honeySlug = slugify('AI Girlfriend', 'Honeybot');
  const honeyDoc = await col.findOne({ slug: honeySlug });
  const honeyCurrent = honeyDoc?.upvotes ?? 0;
  await col.updateOne({ slug: honeySlug }, { $set: { upvotes: 10, updatedAt: now } }, { upsert: true });
  console.log(`SET   ${honeySlug.padEnd(40)} ${honeyCurrent} → 10`);

  // Fix last 30 tools to 0–22
  for (const t of LOW_TOOLS) {
    const slug = slugify(t.cat, t.name);
    const target = rand(0, 22);
    const existing = await col.findOne({ slug });
    const current = existing?.upvotes ?? 0;
    await col.updateOne(
      { slug },
      {
        $set: { upvotes: target, updatedAt: now },
        $setOnInsert: { downvotes: 0, reviews: [], featured: false, createdAt: now },
      },
      { upsert: true },
    );
    console.log(`SET   ${slug.padEnd(40)} ${current} → ${target}`);
  }

  console.log('\nDone.');
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
