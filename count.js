const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
const { Group, Bot, Article, AINsfwSubmission } = require('./lib/models');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const groups = await Group.countDocuments({ status: 'approved', premiumOnly: { $ne: true }, category: { $ne: 'Hentai' } });
  const bots = await Bot.countDocuments({ status: 'approved' });
  const articles = await Article.countDocuments({ status: 'published' });
  console.log({ groups, bots, articles });
  process.exit(0);
}
run();
