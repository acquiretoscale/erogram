// Adds the Erogram.pro ecosystem channels to TGempire
// Run: DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/seed-ecosystem.ts

import mongoose from 'mongoose';
import { TgGroup } from '../lib/models';

const MONGODB_URI = process.env.MONGODB_URI!;

const ECOSYSTEM_CHANNELS = [
  {
    name: 'Erogram.pro Announcements',
    channelId: '-1002843194982',   // @erogrampro
    tag: 'erogram',
    notes: 'Main public channel — auto-posts when new groups/bots are approved on erogram.pro',
    botToken: process.env.EROGRAM_NOTIFY_BOT_TOKEN || '',
    mediaFolder: '',
    enabled: true,
  },
  {
    name: 'Erogram Plus (VIP)',
    channelId: '-1003417554253',
    tag: 'erogram',
    notes: 'VIP channel — gets direct Telegram links when new groups/bots are approved',
    botToken: process.env.EROGRAM_PLUS_BOT_TOKEN || '',
    mediaFolder: '',
    enabled: true,
  },
];

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB:', MONGODB_URI.split('@')[1]);

  for (const ch of ECOSYSTEM_CHANNELS) {
    const existing = await TgGroup.findOne({ channelId: ch.channelId });
    if (existing) {
      console.log(`⏭  Already exists: ${ch.name} (${ch.channelId})`);
      continue;
    }
    await TgGroup.create(ch);
    console.log(`✅ Added: ${ch.name} (${ch.channelId})`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

run().catch(err => { console.error(err); process.exit(1); });
