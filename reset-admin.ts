import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import connectDB from './lib/db/mongodb';
import { User } from './lib/models';
import bcrypt from 'bcryptjs';

async function resetAdminPassword() {
    try {
        await connectDB();
        console.log('✅ Connected to MongoDB');

        const username = 'TurboMuna';
        const newPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const result = await User.updateOne(
            { username: username },
            { $set: { password: hashedPassword } }
        );

        if (result.matchedCount === 0) {
            console.log(`❌ User ${username} not found!`);
        } else {
            console.log(`✅ Password for ${username} updated to: ${newPassword}`);
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

resetAdminPassword();
