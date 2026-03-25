/**
 * Re-import OnlyFans creators from an Apify run.
 * Auto-detects actor format (sentry vs igolaizola).
 *
 * Usage: node --env-file=.env.local scripts/reimport-of-creators.mjs <runId> [category] [--clean]
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const MONGODB_URI = process.env.MONGODB_URI;
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

const runId = process.argv[2];
const category = (process.argv[3] || 'redhead').toLowerCase();
const shouldClean = process.argv.includes('--clean');

if (!runId) { console.error('Usage: node scripts/reimport-of-creators.mjs <runId> [category] [--clean]'); process.exit(1); }

const creatorSchema = new mongoose.Schema({
  name: String, username: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  categories: [String], avatar: String, header: String, bio: String,
  subscriberCount: Number, likesCount: Number, mediaCount: Number,
  photosCount: Number, videosCount: Number, price: Number,
  isFree: Boolean, isVerified: Boolean, url: String, gender: String,
  clicks: { type: Number, default: 0 },
  scrapedAt: Date,
}, { timestamps: true, strict: false });

const Creator = mongoose.models.OnlyFansCreator || mongoose.model('OnlyFansCreator', creatorSchema);

function parseItem(item) {
  // sentry format: onlyfansUsername, displayName, profileImage, bio, onlyfansLink
  if (item.onlyfansUsername) {
    const username = item.onlyfansUsername;
    return {
      name: item.displayName || username,
      username,
      avatar: item.profileImage || '',
      bio: (item.bio || '').slice(0, 500),
      likesCount: parseInt(String(item.likes || '0').replace(/,/g, ''), 10) || 0,
      photosCount: parseInt(String(item.photos || '0').replace(/,/g, ''), 10) || 0,
      videosCount: parseInt(String(item.videos || '0').replace(/,/g, ''), 10) || 0,
      price: parseFloat(String(item.price || '0').replace(/[^0-9.]/g, '')) || 0,
      isFree: item.price === 'Free' || item.price === '0' || item.price === '0.00',
      url: item.onlyfansLink || `https://onlyfans.com/${username}`,
      gender: 'female',
    };
  }
  // igolaizola format: username, name, image, description, link
  const username = item.username || '';
  if (!username) return null;
  const tags = item.category || [];
  return {
    name: item.name || username,
    username,
    avatar: item.image || (item.images?.[0]?.url) || '',
    bio: (item.description || '').slice(0, 500),
    likesCount: typeof item.likes === 'number' ? item.likes : 0,
    photosCount: 0,
    videosCount: 0,
    price: typeof item.price === 'number' ? item.price : 0,
    isFree: item.price === 0 || item.price === 'Free',
    url: item.link || `https://onlyfans.com/${username}`,
    gender: tags.includes('female') ? 'female' : 'unknown',
  };
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  if (shouldClean) {
    const del = await Creator.deleteMany({ categories: category });
    console.log(`Cleaned ${del.deletedCount} existing "${category}" creators`);
  }

  const url = `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&limit=500`;
  const res = await fetch(url);
  const items = await res.json();
  console.log(`Fetched ${items.length} items from Apify run ${runId}`);

  const isSentry = items.length > 0 && 'onlyfansUsername' in items[0];
  console.log(`Detected format: ${isSentry ? 'sentry' : 'igolaizola'}`);

  let saved = 0, skipped = 0;

  for (const item of items) {
    const parsed = parseItem(item);
    if (!parsed || !parsed.username) { skipped++; continue; }

    const bio = parsed.bio.toLowerCase();
    const maleIndicators = ['gay', 'male model', 'boy/boy', 'guy/guy', 'm4m', 'men only'];
    if (maleIndicators.some(m => bio.includes(m))) { skipped++; continue; }

    const slug = parsed.username.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    try {
      await Creator.findOneAndUpdate(
        { slug },
        {
          $set: {
            name: parsed.name, username: parsed.username, slug,
            avatar: parsed.avatar, header: '',
            bio: parsed.bio, subscriberCount: 0,
            likesCount: parsed.likesCount,
            mediaCount: parsed.photosCount + parsed.videosCount,
            photosCount: parsed.photosCount, videosCount: parsed.videosCount,
            price: parsed.price, isFree: parsed.isFree,
            isVerified: false, gender: parsed.gender,
            url: parsed.url, scrapedAt: new Date(),
          },
          $addToSet: { categories: category },
        },
        { upsert: true },
      );
      saved++;
      if (saved % 20 === 0) console.log(`  saved ${saved}...`);
    } catch (e) {
      if (e.code !== 11000) console.error(`  FAIL ${parsed.username}: ${e.message}`);
    }
  }

  console.log(`\nDone! Saved: ${saved}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
