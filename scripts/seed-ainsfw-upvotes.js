/**
 * One-time script: seed base upvotes for all AI NSFW tools.
 *
 * - Lovescape  → 162
 * - Honeybot   → 89
 * - AI Girlfriend & Undress AI categories → random 55-80
 * - All other categories → random 40-80
 *
 * Idempotent: only sets upvotes if current value is below target.
 *
 * Usage: node scripts/seed-ainsfw-upvotes.js
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
  [slugify('AI Girlfriend', 'Lovescape')]: 162,
  [slugify('AI Girlfriend', 'Honeybot')]: 89,
};

const HIGH_CATS = new Set(['AI Girlfriend', 'Undress AI']);

const TOOLS = [
  // AI Girlfriend (21)
  { cat: 'AI Girlfriend', name: 'Lovescape' },
  { cat: 'AI Girlfriend', name: 'DreamGF' },
  { cat: 'AI Girlfriend', name: 'FantasyGF' },
  { cat: 'AI Girlfriend', name: 'CrushOn AI' },
  { cat: 'AI Girlfriend', name: 'Muah AI' },
  { cat: 'AI Girlfriend', name: 'Kupid AI' },
  { cat: 'AI Girlfriend', name: 'SoulFun' },
  { cat: 'AI Girlfriend', name: 'Nastia AI' },
  { cat: 'AI Girlfriend', name: 'GirlfriendGPT' },
  { cat: 'AI Girlfriend', name: 'SpicyAI' },
  { cat: 'AI Girlfriend', name: 'AI Girlfriend WTF' },
  { cat: 'AI Girlfriend', name: 'My Lovely AI' },
  { cat: 'AI Girlfriend', name: 'Secrets AI' },
  { cat: 'AI Girlfriend', name: 'Elyza' },
  { cat: 'AI Girlfriend', name: 'DreamBF AI' },
  { cat: 'AI Girlfriend', name: 'Loveli AI' },
  { cat: 'AI Girlfriend', name: 'Krush' },
  { cat: 'AI Girlfriend', name: 'Romantic AI' },
  { cat: 'AI Girlfriend', name: 'Honeybot' },
  { cat: 'AI Girlfriend', name: 'LoveMy AI' },
  { cat: 'AI Girlfriend', name: 'Dream Companion' },
  // Undress AI (10)
  { cat: 'Undress AI', name: 'Undress AI' },
  { cat: 'Undress AI', name: 'Clothoff' },
  { cat: 'Undress AI', name: 'Nudify AI' },
  { cat: 'Undress AI', name: 'DeepNudeNow' },
  { cat: 'Undress AI', name: 'Undress App' },
  { cat: 'Undress AI', name: 'Deepstrip' },
  { cat: 'Undress AI', name: 'NudeMaker' },
  { cat: 'Undress AI', name: 'AINUDEZ' },
  { cat: 'Undress AI', name: 'Makenude' },
  { cat: 'Undress AI', name: 'Fastundress' },
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
  let updated = 0;
  let skipped = 0;

  for (const t of TOOLS) {
    const slug = slugify(t.cat, t.name);
    const target = OVERRIDES[slug] ?? (HIGH_CATS.has(t.cat) ? rand(55, 80) : rand(40, 80));

    const existing = await col.findOne({ slug });
    const current = existing?.upvotes ?? 0;

    if (current >= target) {
      console.log(`SKIP  ${slug.padEnd(40)} current=${current}  target=${target}`);
      skipped++;
      continue;
    }

    await col.updateOne(
      { slug },
      {
        $set: { upvotes: target, updatedAt: now },
        $setOnInsert: { downvotes: 0, reviews: [], featured: false, createdAt: now },
      },
      { upsert: true },
    );
    console.log(`SET   ${slug.padEnd(40)} ${current} → ${target}`);
    updated++;
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped (already at or above target)`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
