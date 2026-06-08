import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

await mongoose.connect(process.env.MONGODB_URI, { family: 4 });

const Article = mongoose.models.Article || mongoose.model('Article', new mongoose.Schema({
  title: String, slug: String, content: String, excerpt: String,
  featuredImage: String, status: String, publishedAt: Date,
  views: { type: Number, default: 0 }, weeklyViews: { type: Number, default: 0 },
  viewsByDay: { type: Map, of: Number, default: new Map() },
  advertiserId: mongoose.Schema.Types.ObjectId,
  tags: [String], metaTitle: String, metaDescription: String, metaKeywords: String,
  ogTitle: String, ogDescription: String,
  twitterCard: { type: String, default: 'summary_large_image' },
}, { timestamps: true }));

const TRACKING_URL = 'https://lovescape.com/create-ai-sex-girlfriend/style?userId=5ebe4f139af9bcff39155f3e9f06fbce233415fd82fd4da2a9c51ea0921d4c0e&sourceId=Erogram&creativeId=6step_hent&p1=test';

// ============================================================
// ARTICLE 1: Reference article (why-millions-are-switching)
// Add TOC + 3rd CTA
// ============================================================

const art1 = await Article.findOne({ slug: 'why-millions-are-switching-to-ai-companionship-lately' });
if (art1) {
  let c1 = art1.content;

  // Add TOC after first paragraph if not already there
  if (!c1.includes('## In This Article')) {
    const tocBlock = `## In This Article

- [Something shifted quietly and most people missed it](#something-shifted-quietly-and-most-people-missed-it)
- [Why people are actually making the switch](#why-people-are-actually-making-the-switch)
- [What's actually different now](#whats-actually-different-now)
- [Who's actually using this](#whos-actually-using-this)
- [Is this going to be everywhere soon?](#is-this-going-to-be-everywhere-soon)
- [Getting started](#getting-started)

`;
    // Insert after first paragraph
    const firstParaEnd = c1.indexOf('\n\n## ');
    if (firstParaEnd > 0) {
      c1 = c1.slice(0, firstParaEnd) + '\n\n' + tocBlock + c1.slice(firstParaEnd);
    }
  }

  // Add 3rd CTA before "Getting started" section if only 2 exist
  const ctaCount = (c1.match(/```cta/g) || []).length;
  if (ctaCount < 3) {
    const gettingStartedIdx = c1.indexOf('## Getting started');
    if (gettingStartedIdx > 0) {
      const thirdCta = `\`\`\`cta
url: ${TRACKING_URL}
text: Try Lovescape now
description: Fully customizable. Always available. No restrictions on where the conversation goes.
headline: See what AI companionship actually feels like
\`\`\`

`;
      c1 = c1.slice(0, gettingStartedIdx) + thirdCta + c1.slice(gettingStartedIdx);
    }
  }

  await Article.findByIdAndUpdate(art1._id, { content: c1 });
  console.log('Article 1 updated (reference): TOC + 3rd CTA added');
} else {
  console.log('Article 1 not found (why-millions-are-switching-to-ai-companionship-lately)');
}

// ============================================================
// ARTICLE 2: New article (ai-girlfriend-chat-changing-relationships)
// Fix H2s, add TOC, add 3rd CTA, weave new keywords, new title
// ============================================================

const art2 = await Article.findOne({ slug: 'ai-girlfriend-chat-changing-relationships' });
if (art2) {
  let c2 = art2.content;

  // Fix H2s
  c2 = c2.replace('## This isn\'t a niche anymore', '## Creating AI girlfriends just went mainstream');
  c2 = c2.replace('## The moment that shifts things', '## The moment that shifts things');
  c2 = c2.replace('## What everyone gets wrong about why people use this', '## It\'s not about being lonely. It\'s about being tired.');
  c2 = c2.replace('## The memory problem that nobody solved until recently', '## What changed when creating AI girlfriends got good');
  c2 = c2.replace('## What Lovescape figured out', '## What Lovescape figured out');
  c2 = c2.replace('## The psychology that research is starting to catch up to', '## The science behind why it actually works');
  c2 = c2.replace('## What the girlfriend chatbot actually looks like in daily use', '## Everyone\'s doing it. Here\'s who and why.');
  c2 = c2.replace('## The compounding advantage', '## The compounding thing nobody mentions');
  c2 = c2.replace('## Who\'s actually having these conversations', '## Who\'s actually creating AI girlfriends');

  // Weave "creating AI girlfriends" into body naturally in a few spots
  c2 = c2.replace(
    'That something else turned out to be AI girlfriend chat.',
    'That something else turned out to be creating AI girlfriends. Custom ones. Built from scratch.'
  );
  c2 = c2.replace(
    'The AI companion market hit $2.8 billion last year',
    'AI girlfriend creation hit the mainstream faster than anyone predicted. The companion market pulled in somewhere between $2 and $4 billion in 2025 according to Grand View Research'
  );
  c2 = c2.replace(
    'and is on pace to pass $9 billion by 2028. Those aren\'t numbers driven by hype. They\'re driven by people going back.',
    'and the growth rate is 30 to 60 percent year-over-year. Those aren\'t numbers driven by curiosity. They\'re driven by people who tried it, liked it, and kept coming back.'
  );

  // Add TOC at the beginning
  const toc = `## What's Inside

- [The moment that shifts things](#the-moment-that-shifts-things)
- [Creating AI girlfriends just went mainstream](#creating-ai-girlfriends-just-went-mainstream)
- [It's not about being lonely. It's about being tired.](#its-not-about-being-lonely-its-about-being-tired)
- [What changed when creating AI girlfriends got good](#what-changed-when-creating-ai-girlfriends-got-good)
- [What Lovescape figured out](#what-lovescape-figured-out)
- [The science behind why it actually works](#the-science-behind-why-it-actually-works)
- [Everyone's doing it. Here's who and why.](#everyones-doing-it-heres-who-and-why)
- [The compounding thing nobody mentions](#the-compounding-thing-nobody-mentions)
- [Who's actually creating AI girlfriends](#whos-actually-creating-ai-girlfriends)

`;
  c2 = toc + c2;

  // Add 3rd CTA before the last section "If you're curious"
  const ctaCount2 = (c2.match(/```cta/g) || []).length;
  if (ctaCount2 < 3) {
    const curiousIdx = c2.indexOf('## If you\'re curious');
    if (curiousIdx > 0) {
      const thirdCta = `\`\`\`cta
url: ${TRACKING_URL}
text: Build your AI girlfriend on Lovescape
description: Pick her personality, her look, her vibe. She's yours from the first message.
headline: Ready to see what it's like?
\`\`\`

`;
      c2 = c2.slice(0, curiousIdx) + thirdCta + c2.slice(curiousIdx);
    }
  }

  // Update title + meta
  await Article.findByIdAndUpdate(art2._id, {
    title: 'Why Men Are Creating AI Girlfriends Instead of Dating',
    content: c2,
    metaTitle: 'Why Men Are Creating AI Girlfriends Instead of Dating',
    metaDescription: 'AI girlfriend creation has gone mainstream in 2026. Here\'s why millions of men are building custom AI companions instead of swiping on dating apps.',
    metaKeywords: 'creating ai girlfriends, ai girlfriend creation, ai girlfriend chat, ai gf chat, girlfriend chatbot, ai companion, ai nsfw, lovescape',
    ogTitle: 'Why Men Are Creating AI Girlfriends Instead of Dating',
    ogDescription: 'AI girlfriend creation has gone mainstream. Here\'s why men are building custom AI companions instead of dating.',
  });
  console.log('Article 2 updated: new title, fixed H2s, TOC, 3rd CTA, keywords woven in');
} else {
  console.log('Article 2 not found (ai-girlfriend-chat-changing-relationships)');
}

await mongoose.disconnect();
console.log('\nDone. Both articles updated.');
console.log('Article 1: /articles/why-millions-are-switching-to-ai-companionship-lately');
console.log('Article 2: /articles/ai-girlfriend-chat-changing-relationships');
