// Load environment variables FIRST before importing anything else
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import connectDB from '../lib/db/mongodb';
import { Group, User } from '../lib/models';

// Slugify function
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
}

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Find or create admin user
    let adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      // Create a basic admin user for seeding
      adminUser = await User.create({
        username: 'admin',
        email: 'admin@erogram.pro',
        isAdmin: true,
      });
      console.log('✅ Created admin user');
    } else {
      console.log('✅ Using existing admin user:', adminUser.username);
    }
    const userId = adminUser._id;

    // Sample group data - using the actual categories from the app
    const groups = [
      { 
        name: 'Tech Enthusiasts', 
        category: 'Technology', 
        country: 'USA', 
        telegramLink: 'https://t.me/techenthusiasts', 
        description: 'A group for tech lovers to discuss the latest gadgets and innovations in technology.', 
        createdBy: userId, 
        pinned: true,
        image: '/assets/image.jpg'
      },
      { 
        name: 'Gaming Hub', 
        category: 'Gaming', 
        country: 'USA', 
        telegramLink: 'https://t.me/gaminghub', 
        description: 'Join gamers to talk about your favorite games and share gaming experiences.', 
        createdBy: userId, 
        pinned: true,
        image: '/assets/image.jpg'
      },
      { 
        name: 'Learn Coding', 
        category: 'Education', 
        country: 'India', 
        telegramLink: 'https://t.me/learncoding', 
        description: 'A community for aspiring programmers to learn and grow together.', 
        createdBy: userId, 
        pinned: false,
        image: '/assets/image.jpg'
      },
      { 
        name: 'Social Chat', 
        category: 'Lifestyle', 
        country: 'UK', 
        telegramLink: 'https://t.me/socialchat', 
        description: 'Make new friends and chat about anything under the sun!', 
        createdBy: userId, 
        pinned: false,
        image: '/assets/image.jpg'
      },
      { 
        name: 'AI Innovators', 
        category: 'Technology', 
        country: 'USA', 
        telegramLink: 'https://t.me/aiinnovators', 
        description: 'Discuss AI and machine learning advancements with fellow innovators.', 
        createdBy: userId, 
        pinned: false,
        image: '/assets/image.jpg'
      },
      { 
        name: 'Retro Gamers', 
        category: 'Gaming', 
        country: 'USA', 
        telegramLink: 'https://t.me/retrogamers', 
        description: 'For fans of classic video games and retro gaming culture.', 
        createdBy: userId, 
        pinned: false,
        image: '/assets/image.jpg'
      },
      { 
        name: 'Math Wizards', 
        category: 'Education', 
        country: 'India', 
        telegramLink: 'https://t.me/mathwizards', 
        description: 'Solve math problems and learn mathematics together with experts.', 
        createdBy: userId, 
        pinned: false,
        image: '/assets/image.jpg'
      },
      { 
        name: 'Global Hangout', 
        category: 'Lifestyle', 
        country: 'USA', 
        telegramLink: 'https://t.me/globalhangout', 
        description: 'Connect with people from around the world in this global community.', 
        createdBy: userId, 
        pinned: false,
        image: '/assets/image.jpg'
      },
      { 
        name: 'Tech Startups', 
        category: 'Technology', 
        country: 'UK', 
        telegramLink: 'https://t.me/techstartups', 
        description: 'Network with startup founders and tech entrepreneurs worldwide.', 
        createdBy: userId, 
        pinned: false,
        image: '/assets/image.jpg'
      },
      { 
        name: 'Game Devs', 
        category: 'Gaming', 
        country: 'USA', 
        telegramLink: 'https://t.me/gamedevs', 
        description: 'Collaborate on game development projects and share knowledge.', 
        createdBy: userId, 
        pinned: false,
        image: '/assets/image.jpg'
      },
      { 
        name: 'Crypto Traders', 
        category: 'Crypto', 
        country: 'USA', 
        telegramLink: 'https://t.me/cryptotraders', 
        description: 'Join cryptocurrency traders to discuss market trends and strategies.', 
        createdBy: userId, 
        pinned: false,
        image: '/assets/image.jpg'
      },
      { 
        name: 'Fitness Freaks', 
        category: 'Lifestyle', 
        country: 'USA', 
        telegramLink: 'https://t.me/fitnessfreaks', 
        description: 'Get fit together! Share workouts, diets, and motivation.', 
        createdBy: userId, 
        pinned: false,
        image: '/assets/image.jpg'
      },
    ];

    // Generate unique slugs
    const groupsWithSlugs = [];
    for (const group of groups) {
      const baseSlug = slugify(group.name);
      let slug = baseSlug;
      let counter = 1;
      while (await Group.findOne({ slug })) {
        slug = `${baseSlug}-${counter++}`;
      }
      groupsWithSlugs.push({ ...group, slug, status: 'approved' });
    }

    // Clear existing groups (comment out to append instead)
    const deleteResult = await Group.deleteMany({});
    console.log(`✅ Cleared ${deleteResult.deletedCount} existing groups`);

    // Insert new groups
    const insertResult = await Group.insertMany(groupsWithSlugs);
    console.log(`✅ Inserted ${insertResult.length} groups`);

    // Disconnect
    await mongoose.connection.close();
    console.log('✅ Disconnected from MongoDB');
    console.log('\n🎉 Database seeded successfully!');
  } catch (err: any) {
    console.error('❌ Seeding error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

// Run the seed
seedDatabase();

