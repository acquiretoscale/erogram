require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const users = db.collection('users');

  const existing = await users.findOne({ username: 'erosdemo' });
  if (existing) {
    const uid = existing._id;
    await users.updateOne({ username: 'erosdemo' }, {
      $set: {
        onboardingCompleted: false,
        interests: [],
        preferredPlatforms: [],
        interestedInAI: false,
        savedCreators: [],
        savedGroups: [],
        premium: false,
      }
    });
    await db.collection('bookmarks').deleteMany({ userId: uid });
    await db.collection('bookmarkfolders').deleteMany({ userId: uid });
    console.log('User "erosdemo" reset — cleared onboarding, bookmarks & folders.');
  } else {
    const hash = await bcrypt.hash('demo123', 10);
    await users.insertOne({
      username: 'erosdemo',
      password: hash,
      onboardingCompleted: false,
      interests: [],
      preferredPlatforms: [],
      interestedInAI: false,
      savedCreators: [],
      premium: false,
      isAdmin: false,
      loginCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('Created user "erosdemo" with password "demo123"');
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
