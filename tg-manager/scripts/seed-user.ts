/**
 * One-time script: creates the first owner account in MongoDB.
 *
 * Usage:
 *   npx tsx scripts/seed-user.ts
 *
 * Reads MONGODB_URI from .env.local.
 * Username: "admin" (or set SEED_USERNAME env var)
 * Password: value of ADMIN_PASSWORD in .env.local (or set SEED_PASSWORD env var)
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  const username = (process.env.SEED_USERNAME || 'admin').toLowerCase().trim();
  const password = process.env.SEED_PASSWORD || process.env.ADMIN_PASSWORD || '';
  if (!password) { console.error('No password provided. Set ADMIN_PASSWORD or SEED_PASSWORD.'); process.exit(1); }

  await mongoose.connect(uri);

  const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'owner' },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    lastLoginAt: { type: Date, default: null },
  }, { timestamps: true });

  const User = mongoose.models.User || mongoose.model('User', UserSchema);

  const existing = await User.findOne({ username });
  if (existing) {
    console.log(`User "${username}" already exists (role: ${existing.role}). Nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ username, passwordHash, role: 'owner' });
  console.log(`✓ Created owner account: username="${username}"`);
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
