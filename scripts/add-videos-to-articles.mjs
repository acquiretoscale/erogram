import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
await mongoose.connect(process.env.MONGODB_URI, { family: 4 });

const Article = mongoose.models.Article || mongoose.model('Article', new mongoose.Schema({
  content: String,
}, { strict: false, timestamps: true }));

const LINK = 'https://lovescape.com/create-ai-sex-girlfriend/style?userId=5ebe4f139af9bcff39155f3e9f06fbce233415fd82fd4da2a9c51ea0921d4c0e&sourceId=Erogram&creativeId=6step_hent&p1=test';

function videoBlock(videoUrl, caption) {
  return `\`\`\`video
url: ${videoUrl}
caption: ${caption}
link: ${LINK}
\`\`\``;
}

// Article 1: ai-girlfriend-chat-changing-relationships
// Videos: aigirlfriend_8, aigirlfriend_3-480p, milf_1-480p
const a1 = await Article.findOne({ slug: 'ai-girlfriend-chat-changing-relationships' });
if (a1) {
  let c = a1.content;
  const v1 = videoBlock('https://cdn.lovescape.com/cdn/front/videos/cards/aigirlfriend_8.mp4', 'AI girlfriend created on Lovescape');
  const v2 = videoBlock('https://cdn.lovescape.com/cdn/front/videos/cards/aigirlfriend_3-480p.mp4', 'Your AI companion, your way');
  const v3 = videoBlock('https://cdn.lovescape.com/cdn/front/videos/cards/milf_1-480p.mp4', 'Build her exactly how you want');

  // Place each video above each of the 3 CTAs
  // Find all ```cta blocks and insert video before each
  let ctaCount = 0;
  const videos = [v1, v2, v3];
  c = c.replace(/```cta/g, (match) => {
    if (ctaCount < 3) {
      const vid = videos[ctaCount];
      ctaCount++;
      return vid + '\n\n' + match;
    }
    return match;
  });

  await Article.findByIdAndUpdate(a1._id, { content: c });
  console.log('Article 1 updated — 3 videos added above CTAs');
} else {
  console.log('Article 1 NOT FOUND');
}

// Article 2: ai-girlfriend-chatbots-vs-dating-apps
// Videos: 841111ea long URL, aigirlfriend_3-480p, aigirlfriend_8
// (different order to avoid same feel)
const a2 = await Article.findOne({ slug: 'ai-girlfriend-chatbots-vs-dating-apps' });
if (a2) {
  let c = a2.content;
  const v1 = videoBlock('https://videos-storage.lovescape.com/public/9771984/841111ea3d59fe0ba5336fc25b7199be086182fff05aa87aa7e01620043d1add.mp4/841111ea3d59fe0ba5336fc25b7199be086182fff05aa87aa7e01620043d1add.mp4', 'Meet your AI girlfriend on Lovescape');
  const v2 = videoBlock('https://cdn.lovescape.com/cdn/front/videos/cards/aigirlfriend_3-480p.mp4', 'She adapts to you, not the other way around');
  const v3 = videoBlock('https://cdn.lovescape.com/cdn/front/videos/cards/milf_1-480p.mp4', 'No rules, no limits, fully yours');

  let ctaCount = 0;
  const videos = [v1, v2, v3];
  c = c.replace(/```cta/g, (match) => {
    if (ctaCount < 3) {
      const vid = videos[ctaCount];
      ctaCount++;
      return vid + '\n\n' + match;
    }
    return match;
  });

  await Article.findByIdAndUpdate(a2._id, { content: c });
  console.log('Article 2 updated — 3 videos added above CTAs');
} else {
  console.log('Article 2 NOT FOUND');
}

await mongoose.disconnect();
console.log('Done.');
