import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SLUG = 'the-ai-girlfriend-app-thousands-are-switching-to';
const TRACKING_URL = 'https://hornydreams.ai/?affiliate=erogramx';
const CTA = `\`\`\`cta
url: ${TRACKING_URL}
text: Start free today
style: neobrutal
\`\`\``;

await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
const db = mongoose.connection.db;
const advertisers = db.collection('advertisers');
const campaigns = db.collection('campaigns');
const articles = db.collection('articles');

let adv = await advertisers.findOne({ name: 'horneydream.com' });
if (!adv) {
  const res = await advertisers.insertOne({
    name: 'horneydream.com',
    email: 'partners@hornydreams.ai',
    company: 'horneydream.com',
    logo: '',
    notes: 'Hornydreams AI. Article CTA clicks.',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  adv = { _id: res.insertedId };
  console.log('Created advertiser horneydream.com', adv._id.toString());
} else {
  console.log('Advertiser exists', adv._id.toString());
}

let camp = await campaigns.findOne({ advertiserId: adv._id, slot: 'article-link' });
if (!camp) {
  const res = await campaigns.insertOne({
    advertiserId: adv._id,
    name: 'Article CTA — horneydream.com',
    slot: 'article-link',
    creative: '',
    destinationUrl: TRACKING_URL,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2030-12-31'),
    status: 'active',
    isVisible: true,
    clicks: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('Created article-link campaign', res.insertedId.toString());
} else {
  console.log('Campaign exists', camp._id.toString());
}

const article = await articles.findOne({ slug: SLUG });
if (!article) {
  console.error('Article missing');
  process.exit(1);
}

let content = article.content;
content = content.replace(/\n```cta[\s\S]*?```/g, '');

const anchors = [
  '![horneydreams-ai-ai-girlfriend-app-kink](https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/articles/horneydreams-ai-ai-girlfriend-app-kink.webp)',
  '![horneydreams-ai-ai-girlfriend-app](https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/articles/horneydreams-ai-ai-girlfriend-app.webp)',
  '![horneydreams-ai-ai-girlfriend-app-voice](https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/articles/horneydreams-ai-ai-girlfriend-app-voice.webp)',
  '![horneydreams-ai-ai-girlfriend-app-ffee](https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/articles/horneydreams-ai-ai-girlfriend-app-ffee.webp)',
];

for (const a of anchors) {
  if (!content.includes(a)) {
    console.error('Missing image markdown:', a.slice(0, 80));
    process.exit(1);
  }
  content = content.replace(a, `${a}\n\n${CTA}`);
}

const res = await articles.updateOne(
  { slug: SLUG },
  { $set: { content, advertiserId: adv._id } },
);
console.log('article matched', res.matchedCount, 'modified', res.modifiedCount);
console.log('cta count', (content.match(/```cta/g) || []).length);
await mongoose.disconnect();
