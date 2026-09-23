/**
 * Seed script — imports existing GroupManager groups & templates into MongoDB.
 * Run with: npx tsx scripts/seed.ts
 */
import mongoose from 'mongoose';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI!;

const ButtonSchema = new mongoose.Schema({ text: String, url: String }, { _id: false });

const TgTemplate = mongoose.model('TgTemplate', new mongoose.Schema({
  name: String, text: String, buttons: [[ButtonSchema]], parseMode: { type: String, default: 'HTML' },
}, { timestamps: true }));

const TgGroup = mongoose.model('TgGroup', new mongoose.Schema({
  name: String, channelId: String, mediaFolder: String,
  defaultTemplate: { type: mongoose.Schema.Types.ObjectId, ref: 'TgTemplate', default: null },
  enabled: { type: Boolean, default: true },
}, { timestamps: true }));

const TEMPLATES: Record<string, any> = {
  tmpl_casual_dating_1: {
    name: 'Casual Dating (Hot Tonight)',
    text: '<b>🔥 Casual Dating Tonight</b>\n\nMeet someone fun in minutes — no drama, just vibes. 😈\n\n<b>Tap below to start:</b>',
    buttons: [
      [{ text: '❤️ Start Casual Dating', url: 'https://erogram.pro' }],
      [{ text: '⚡️ Instant Matches', url: 'https://erogram.pro' }],
    ],
  },
  tmpl_casual_dating_2: {
    name: 'Casual Dating (Nearby)',
    text: '<b>📍 Looking for someone nearby?</b>\n\nSwipe, chat, and set something up — fast.\n\n<b>✅ Click to join:</b>',
    buttons: [
      [{ text: '🔥 Find Nearby Singles', url: 'https://erogram.pro' }],
    ],
  },
  tmpl_casual_dating_3: {
    name: 'Casual Dating (Private Chat)',
    text: '<b>💬 Private chat?</b>\n\nFlirty conversations, real people, zero pressure.\n\n<b>👉 Tap to start now:</b>',
    buttons: [
      [{ text: '😈 Start Chatting', url: 'https://erogram.pro' }],
      [{ text: '🔒 Keep it Private', url: 'https://erogram.pro' }],
    ],
  },
};

const GROUP_NAMES: Record<string, string> = {
  '-1003460612582': 'Booty Bazaar',
  '-1003292514683': 'Cumslut Carousel',
  '-1003372987667': 'Boobie Paradise',
  '-1003255374324': 'Anal Arcade',
  '-1003335804324': 'Throat Throne',
  '-1003235414317': 'Dick Dungeon',
  '-1003213420049': 'Pussy Palace',
  '-1003441351229': 'InstaBaddies',
  '-1003452597361': 'Tranny Sluts HQ',
  '-1003221642870': 'Sissy Captions',
  '-1003677203250': 'Hot Desi Tunnel',
};

const MEDIA_FOLDERS: Record<string, string> = {
  '-1003460612582': 'booty',
  '-1003292514683': 'cumslut',
  '-1003372987667': 'boobs',
  '-1003255374324': 'anal',
  '-1003335804324': 'throat',
  '-1003235414317': 'dick',
  '-1003213420049': 'pussy',
  '-1003441351229': 'instabaddies',
  '-1003452597361': 'tranny',
  '-1003221642870': 'sissy',
  '-1003677203250': 'desi',
};

const GROUP_TEMPLATE_MAP: Record<string, string> = {
  '-1003460612582': 'tmpl_casual_dating_1',
  '-1003292514683': 'tmpl_casual_dating_2',
  '-1003372987667': 'tmpl_casual_dating_3',
  '-1003255374324': 'tmpl_casual_dating_1',
  '-1003335804324': 'tmpl_casual_dating_3',
  '-1003235414317': 'tmpl_casual_dating_1',
  '-1003213420049': 'tmpl_casual_dating_3',
  '-1003452597361': 'tmpl_casual_dating_1',
  '-1003221642870': 'tmpl_casual_dating_3',
  '-1003677203250': 'tmpl_casual_dating_1',
};

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  await TgTemplate.deleteMany({});
  await TgGroup.deleteMany({});
  console.log('Cleared existing data.');

  const templateDocs: Record<string, any> = {};
  for (const [key, tpl] of Object.entries(TEMPLATES)) {
    const doc = await TgTemplate.create(tpl);
    templateDocs[key] = doc;
    console.log(`  Template: ${doc.name}`);
  }

  for (const [channelId, name] of Object.entries(GROUP_NAMES)) {
    const tplKey = GROUP_TEMPLATE_MAP[channelId];
    const tplDoc = tplKey ? templateDocs[tplKey] : null;
    await TgGroup.create({
      name,
      channelId,
      mediaFolder: MEDIA_FOLDERS[channelId] || '',
      defaultTemplate: tplDoc?._id || null,
      enabled: true,
    });
    console.log(`  Group: ${name} (${channelId})`);
  }

  console.log('\nSeed complete!');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
