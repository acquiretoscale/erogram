require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// First, query existing users to get naming patterns
async function generateRandomUsername() {
  const adjectives = [
    'Cosmic', 'Stellar', 'Aurora', 'Neon', 'Vivid',
    'Blaze', 'Sonic', 'Pixel', 'Cyber', 'Echo',
    'Lunar', 'Solar', 'Titan', 'Apex', 'Prime',
    'Flux', 'Nova', 'Vortex', 'Ultra', 'Hyper'
  ];
  
  const nouns = [
    'Phoenix', 'Dragon', 'Storm', 'Wave', 'Thunder',
    'Knight', 'Sage', 'Raven', 'Wolf', 'Tiger',
    'Eagle', 'Falcon', 'Hunter', 'Shadow', 'Arrow',
    'Nexus', 'Pulse', 'Volt', 'Surge', 'Blitz'
  ];
  
  const numbers = Math.floor(Math.random() * 100);
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adj}${noun}${numbers}`.toLowerCase();
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const users = db.collection('users');

    console.log('🌱 Seeding 10 engagement users...\n');

    const seedUsernames = [];
    for (let i = 0; i < 10; i++) {
      let username = await generateRandomUsername();
      
      // Ensure uniqueness
      let attempts = 0;
      while ((await users.findOne({ username })) && attempts < 10) {
        username = await generateRandomUsername();
        attempts++;
      }
      
      if (attempts >= 10) {
        console.log(`❌ Could not generate unique username for user ${i + 1}`);
        continue;
      }

      const hash = await bcrypt.hash('seeduser123', 10);
      const userData = {
        username,
        password: hash,
        isProfileVisible: false,
        onboardingCompleted: true,
        interests: [],
        preferredPlatforms: [],
        interestedInAI: false,
        savedCreators: [],
        savedGroups: [],
        premium: false,
        isAdmin: false,
        loginCount: 0,
        stats: {
          groupsCreated: 0,
          groupsSaved: 0,
          commentsPosted: 0,
          lastActivity: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await users.insertOne(userData);
      seedUsernames.push(username);
      console.log(`✅ Created user: @${username}`);
    }

    console.log('\n✨ Seeding complete!');
    console.log('\n📋 Seed users created:');
    seedUsernames.forEach((u, i) => console.log(`   ${i + 1}. @${u}`));
    console.log('\n🔗 You can now visit profiles at: http://127.0.0.1:3939/profile/@username');
    console.log('🎯 Use these users to seed comments, likes, and reviews.\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
