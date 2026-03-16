import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import bcrypt from 'bcryptjs';
import connectDB from '../lib/db/mongodb';
import { User } from '../lib/models';

async function createAdmin() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    const args = process.argv.slice(2);
    if (args.length < 2) {
      console.log('Usage: npx tsx scripts/create-admin.ts <username> <password>');
      console.log('Example: npx tsx scripts/create-admin.ts Admin jepasse');
      process.exit(1);
    }

    const [username, password] = args;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    
    if (existingUser) {
      console.log(`⚠️  User "${username}" already exists. Updating password and setting as admin...`);
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Update existing user
      existingUser.password = hashedPassword;
      existingUser.isAdmin = true;
      await existingUser.save();
      
      console.log(`✅ Updated user: ${existingUser.username}`);
      console.log(`   - Password: Updated`);
      console.log(`   - Admin: true`);
    } else {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new admin user
      const newUser = await User.create({
        username,
        password: hashedPassword,
        isAdmin: true,
        loginCount: 0,
        stats: {
          groupsCreated: 0,
          groupsSaved: 0,
          commentsPosted: 0,
          lastActivity: new Date(),
        },
      });

      console.log(`✅ Created new admin user: ${newUser.username}`);
      console.log(`   - Password: Set`);
      console.log(`   - Admin: true`);
    }

    console.log('✅ Done!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createAdmin();
