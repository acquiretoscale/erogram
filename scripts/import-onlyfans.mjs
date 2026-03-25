/**
 * Import OnlyFans creators from an Apify run (igolaizola/onlyfans-scraper).
 *
 * Usage: node --env-file=.env.local scripts/import-onlyfans.mjs <runId> [category]
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;

const runId = process.argv[2];
const category = (process.argv[3] || 'redhead').toLowerCase();

if (!runId) { console.error('Usage: node scripts/import-onlyfans.mjs <runId> [category]'); process.exit(1); }

const schema = new mongoose.Schema({
  name: String, username: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  categories: [String], avatar: String, header: String, bio: String,
  subscriberCount: Number, likesCount: Number, mediaCount: Number,
  photosCount: Number, videosCount: Number, price: Number,
  isFree: Boolean, isVerified: Boolean, url: String, gender: String,
  clicks: { type: Number, default: 0 },
  scrapedAt: Date,
}, { timestamps: true });

const Creator = mongoose.models.OnlyFansCreator || mongoose.model('OnlyFansCreator', schema);

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const url = `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&limit=500`;
  const res = await fetch(url);
  const items = await res.json();
  console.log(`Fetched ${items.length} items from Apify run ${runId}`);

  let saved = 0, skipped = 0;

  for (const item of items) {
    const username = item.username || '';
    if (!username) { skipped++; continue; }

    const slug = username.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const tags = item.category || [];

    try {
      await Creator.findOneAndUpdate(
        { slug },
        {
          $set: {
            name: item.name || username,
            username,
            slug,
            avatar: item.image || (item.images?.[0]?.url) || '',
            header: item.images?.length > 1 ? item.images[1].url : '',
            bio: (item.description || '').slice(0, 500),
            subscriberCount: 0,
            likesCount: typeof item.likes === 'number' ? item.likes : 0,
            mediaCount: 0, photosCount: 0, videosCount: 0,
            price: typeof item.price === 'number' ? item.price : 0,
            isFree: item.price === 0 || item.price === 'Free',
            isVerified: false,
            gender: tags.includes('female') ? 'female' : 'unknown',
            url: item.link || `https://onlyfans.com/${username}`,
            scrapedAt: new Date(),
          },
          $addToSet: { categories: category },
        },
        { upsert: true },
      );
      saved++;
      if (saved % 20 === 0) console.log(`  saved ${saved}...`);
    } catch (e) {
      if (e.code !== 11000) console.error(`  FAIL ${username}: ${e.message}`);
    }
  }

  console.log(`Done! Saved: ${saved}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
