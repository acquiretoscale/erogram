import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

await mongoose.connect(process.env.MONGODB_URI);
const col = mongoose.connection.db.collection('articles');
const a = await col.findOne({ slug: 'ai-girlfriend-chatbots-vs-dating-apps' }, { projection: { content: 1 } });

// Fix closing ``` glued to ## headings
let fixed = a.content.replace(/```(##)/g, '```\n\n$1');

const lines = fixed.split('\n');
let headings = 0;
lines.forEach((l, i) => {
  if (l.startsWith('##') || l.startsWith('```')) {
    console.log(`Line ${i}: ${l.substring(0, 80)}`);
    if (l.startsWith('##')) headings++;
  }
});
console.log('Total ## headings:', headings);
console.log('Content length:', fixed.length);

await col.updateOne(
  { slug: 'ai-girlfriend-chatbots-vs-dating-apps' },
  { $set: { content: fixed } }
);
console.log('FIXED and saved');
process.exit(0);
