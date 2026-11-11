/**
 * Insert or update Lucid Dreams blog article. Run:
 * node --env-file=.env.local scripts/seed-lucid-dreams-article.mjs
 *
 * Cover = featuredImage only (bots/lucid-dreams-18.jpg). Do not duplicate cover in markdown.
 */
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLUG = 'lucid-dreams-telegram-ai-girlfriend-bot-tested';
/** Never change — blog cover + index card only (not in markdown body). */
const COVER =
  'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/bots/lucid-dreams-18.jpg';

const content = fs.readFileSync(
  path.join(__dirname, '..', 'articles', 'lucid-dreams-the-ai-girlfriend-telegram-bot.md'),
  'utf8',
);

const doc = {
  title:
    'Lucid Dreams: The AI Girlfriend Telegram Bot 1M+ People Use (Honest Review)',
  slug: SLUG,
  content,
  excerpt:
    'Lucid Dreams is the leading AI girlfriend Telegram bot and sexting Telegram bot on Telegram. First-person review: photos in chat, characters, checkpoints, and why lucidedreams keeps a million users coming back.',
  featuredImage: COVER,
  status: 'published',
  blogCategory: 'ai-nsfw',
  authorSlug: 'eros',
  tags: [
    'Lucid Dreams',
    'lucidedreams',
    'Telegram Bot',
    'AI Girlfriend',
    'Sexting Bot',
    'AI Roleplay',
    'AI NSFW',
    'Telegram Mini App',
  ],
  metaTitle:
    'Lucid Dreams Review: AI Girlfriend Telegram Bot & Sexting Bot (18+)',
  metaDescription:
    'Hands-on Lucid Dreams review: the #1 AI girlfriend Telegram bot and sexting Telegram bot with 1M+ users. Characters, in-chat photos, checkpoints, and how lucidedreams feels in real use.',
  metaKeywords:
    'lucid dreams, lucidedreams, ai girlfriend telegram bot, sexting bot, sexting telegram bot, lucid dreams telegram, nsfw telegram bot, telegram mini app ai',
  ogImage: COVER,
  ogTitle: 'Lucid Dreams: AI Girlfriend Telegram Bot Review (1M+ Users)',
  ogDescription:
    'Why Lucid Dreams is the market-leading sexting Telegram bot: scenario roleplay, in-chat photos, realistic and anime modes, and a million monthly users.',
  twitterCard: 'summary_large_image',
  twitterImage: COVER,
  twitterTitle: 'Lucid Dreams AI Girlfriend Telegram Bot Review',
  twitterDescription:
    'The sexting bot most Telegram users try first. Lucid Dreams (lucidedreams) reviewed without the fluff.',
  videoBlocks: [],
  ctaBlocks: [],
  updatedAt: new Date(),
};

await mongoose.connect(process.env.MONGODB_URI);
const col = mongoose.connection.collection('articles');
const existing = await col.findOne({ slug: SLUG });
if (existing) {
  await col.updateOne(
    { slug: SLUG },
    {
      $set: {
        ...doc,
        publishedAt: existing.publishedAt ?? new Date(),
        views: existing.views ?? 0,
        weeklyViews: existing.weeklyViews ?? 0,
        createdAt: existing.createdAt ?? new Date(),
      },
    },
  );
  console.log('Updated existing article:', SLUG);
} else {
  await col.insertOne({
    ...doc,
    publishedAt: new Date(),
    views: 0,
    weeklyViews: 0,
    createdAt: new Date(),
  });
  console.log('Inserted article:', SLUG);
}
await mongoose.disconnect();
