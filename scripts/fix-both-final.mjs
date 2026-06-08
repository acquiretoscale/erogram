import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
await mongoose.connect(process.env.MONGODB_URI, { family: 4 });

const Article = mongoose.models.Article || mongoose.model('Article', new mongoose.Schema({
  title: String, slug: String, content: String, status: String, publishedAt: Date,
}, { timestamps: true, strict: false }));

const URL = 'https://lovescape.com/create-ai-sex-girlfriend/style?userId=5ebe4f139af9bcff39155f3e9f06fbce233415fd82fd4da2a9c51ea0921d4c0e&sourceId=Erogram&creativeId=6step_hent&p1=test';

const CTA1 = `\`\`\`cta
url: ${URL}
text: Start on Lovescape, it's free
description: Build your AI companion from scratch. She remembers everything from your first message.
headline: Build your AI companion
\`\`\``;

const CTA2 = `\`\`\`cta
url: ${URL}
text: Try Lovescape now
description: Fully customizable. Always available. No restrictions on where the conversation goes.
headline: See what AI companionship actually feels like
\`\`\``;

const CTA3 = `\`\`\`cta
url: ${URL}
text: Create her on Lovescape now
description: She remembers everything. No walls. Built around you from the first message.
headline: Your AI companion is waiting
\`\`\``;

// ── ARTICLE 1: SACRED (why-millions) ────────────────────────
const a1 = await Article.findOne({ slug: 'why-millions-are-switching-to-ai-companionship-lately' });

const toc1 = `## In This Article

- [Something shifted quietly and most people missed it](#something-shifted-quietly-and-most-people-missed-it)
- [Why people are actually making the switch](#why-people-are-actually-making-the-switch)
- [What's actually different now](#whats-actually-different-now)
- [Who's actually using this](#whos-actually-using-this)
- [Is this going to be everywhere soon?](#is-this-going-to-be-everywhere-soon)
- [Getting started](#getting-started)

`;

// Strip any existing TOC, start clean from first H2
let c1 = a1.content;
const firstH2 = c1.indexOf('## Something shifted');
if (firstH2 > 0) c1 = c1.slice(firstH2);

// Strip all existing CTAs
c1 = c1.replace(/```cta[\s\S]*?```/g, '').replace(/\n{3,}/g, '\n\n').trim();

// Insert CTA1 after "What's actually different now" section, before "Who's actually using"
c1 = c1.replace("## Who's actually using this", CTA1 + '\n\n## Who\'s actually using this');

// Insert CTA2 after "Who's actually using this" section, before "Is this going to be"
c1 = c1.replace("## Is this going to be everywhere soon?", CTA2 + '\n\n## Is this going to be everywhere soon?');

// Insert CTA3 before "Getting started"
c1 = c1.replace('## Getting started', CTA3 + '\n\n## Getting started');

// Prepend TOC
c1 = toc1 + c1;

await Article.findByIdAndUpdate(a1._id, { content: c1, status: 'published' });
const check1 = await Article.findOne({ slug: 'why-millions-are-switching-to-ai-companionship-lately' }).lean();
const ctas1 = (check1.content.match(/```cta/g) || []).length;
console.log('Article 1 — status:', check1.status, '| CTAs:', ctas1, '| has TOC:', check1.content.includes('## In This Article'));

// ── ARTICLE 2: NEW (ai-girlfriend-chat) ─────────────────────
const a2 = await Article.findOne({ slug: 'ai-girlfriend-chat-changing-relationships' });

const toc2 = `## What's Inside

- [The moment that shifts things](#the-moment-that-shifts-things)
- [Creating AI girlfriends just went mainstream](#creating-ai-girlfriends-just-went-mainstream)
- [It's not about being lonely. It's about being tired.](#its-not-about-being-lonely-its-about-being-tired)
- [What changed when creating AI girlfriends got good](#what-changed-when-creating-ai-girlfriends-got-good)
- [What Lovescape figured out](#what-lovescape-figured-out)
- [The science behind why it actually works](#the-science-behind-why-it-actually-works)
- [Everyone's doing it. Here's who and why.](#everyones-doing-it-heres-who-and-why)
- [The compounding thing nobody mentions](#the-compounding-thing-nobody-mentions)
- [If you're curious](#if-youre-curious)

`;

let c2 = a2.content;

// Strip any existing TOC blocks
if (c2.includes("## What's Inside")) {
  const firstRealSection = c2.indexOf('## The moment') > 0 ? c2.indexOf('## The moment') : c2.indexOf('AI companionship');
  if (firstRealSection > 0) c2 = c2.slice(firstRealSection);
}

// Strip all existing CTAs
c2 = c2.replace(/```cta[\s\S]*?```/g, '').replace(/\n{3,}/g, '\n\n').trim();

// Insert CTA1 after "What Lovescape figured out" section, before "The science"
c2 = c2.replace('## The science behind why it actually works', CTA1 + '\n\n## The science behind why it actually works');

// Insert CTA2 after "Everyone's doing it" section, before "The compounding"
c2 = c2.replace('## The compounding thing nobody mentions', CTA2 + '\n\n## The compounding thing nobody mentions');

// Insert CTA3 before "If you're curious"
c2 = c2.replace("## If you're curious", CTA3 + "\n\n## If you're curious");

// Prepend TOC
c2 = toc2 + c2;

await Article.findByIdAndUpdate(a2._id, { content: c2, status: 'published' });
const check2 = await Article.findOne({ slug: 'ai-girlfriend-chat-changing-relationships' }).lean();
const ctas2 = (check2.content.match(/```cta/g) || []).length;
console.log('Article 2 — status:', check2.status, '| CTAs:', ctas2, '| has TOC:', check2.content.includes("## What's Inside"));

await mongoose.disconnect();
console.log('\nBoth live:');
console.log('https://erogram.pro/articles/why-millions-are-switching-to-ai-companionship-lately');
console.log('https://erogram.pro/articles/ai-girlfriend-chat-changing-relationships');
