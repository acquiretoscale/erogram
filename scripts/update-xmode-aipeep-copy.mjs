/**
 * Sync submission descriptions to Erogram Review shortDescription text.
 * Run: node --env-file=.env.local scripts/update-xmode-aipeep-copy.mjs
 */
import mongoose from 'mongoose';

const COPY = {
  'xmode-ai-nsfw-image-generator':
    'xMode is a polished AI NSFW image generator and AI nude generator for adults who want strong results without mainstream filters shutting the prompt down. On xmode.ai, you upload reference photos, build a reusable Face ID, and generate uncensored stills and short AI video clips from plain text prompts or ready-made prompt packs. Whether you are exploring NSFW AI for the first time or you already run a busy creative workflow, the tool is built to feel fast, clear, and worth bookmarking.',
  'ai-peep-ai-nsfw-chat':
    'AI Peep (aipeeps.com) is one of the most approachable free NSFW AI chat destinations on the web: pick a Peep, start talking, and sign up only when you want saves, coins, and extras. The site bundles uncensored AI chat, in-thread images, video, and voice in one place, so it fits anyone comparing AI NSFW tools, AI girlfriend apps, and AI character platforms without jumping between tabs.',
};

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;
const subCol = db.collection('ainsfwsubmissions');
const statsCol = db.collection('ainsfwtoolstats');

for (const [slug, description] of Object.entries(COPY)) {
  await subCol.updateOne({ slug }, { $set: { description, updatedAt: new Date() } });
  await statsCol.updateOne(
    { slug },
    { $set: { descriptionOverride: description, updatedAt: new Date() } },
  );
  console.log('Updated', slug);
}

await mongoose.disconnect();
