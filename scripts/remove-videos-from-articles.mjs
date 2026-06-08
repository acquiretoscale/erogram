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

const slugs = ['ai-girlfriend-chat-changing-relationships', 'ai-girlfriend-chatbots-vs-dating-apps'];

for (const slug of slugs) {
  const a = await Article.findOne({ slug });
  if (!a) { console.log(`${slug} — NOT FOUND`); continue; }
  const cleaned = a.content.replace(/```video\n[\s\S]*?```\n?\n?/g, '');
  await Article.findByIdAndUpdate(a._id, { content: cleaned });
  console.log(`${slug} — videos removed`);
}

await mongoose.disconnect();
console.log('Done.');
