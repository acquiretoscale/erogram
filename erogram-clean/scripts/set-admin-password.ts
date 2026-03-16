import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import bcrypt from 'bcryptjs';
import connectDB from '../lib/db/mongodb';
import { User } from '../lib/models';

async function setAdminPassword() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    const args = process.argv.slice(2);
    if (args.length < 3) {
      console.log('Usage: npx tsx scripts/set-admin-password.ts <username|email> <password> <setIsAdmin>');
      console.log('Example: npx tsx scripts/set-admin-password.ts admin@erogram.pro mypassword true');
      console.log('');
      console.log('Or if .env.local exists:');
      console.log('MONGODB_URI="mongodb://..." npx tsx scripts/set-admin-password.ts admin mypassword true');
      process.exit(1);
    }

    const [identifier, password, shouldBeAdmin] = args;

    // Find user by username or email
    const user = await User.findOne({ 
      $or: [
        { username: identifier },
        { email: identifier }
      ]
    });

    if (!user) {
      console.error(`❌ User not found: ${identifier}`);
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user
    user.password = hashedPassword;
    if (shouldBeAdmin === 'true') {
      user.isAdmin = true;
    }

    await user.save();

    console.log(`✅ Updated user: ${user.username} (${user.email || 'no email'})`);
    console.log(`   - Password: Updated`);
    if (shouldBeAdmin === 'true') {
      console.log(`   - Admin: true`);
    }

    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

setAdminPassword();

