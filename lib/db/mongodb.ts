import mongoose from 'mongoose';
import dns from 'node:dns';
import path from 'path';

// Ensure dev uses same DB as restore: load .env.local from project root if URI not set
if (process.env.NODE_ENV !== 'production' && !process.env.MONGODB_URI) {
  try {
    require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
  } catch {
    // ignore
  }
}

// Use Google DNS for MongoDB SRV resolution (local dev fix)
if (process.env.NODE_ENV !== 'production') {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
declare global {
  var mongoose: {
    conn: typeof import('mongoose') | null;
    promise: Promise<typeof import('mongoose')> | null;
  } | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// Remember which URI we connected with so we don't reuse a stale connection after .env.local change
let connectedUri: string | null = null;

async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  // If .env.local was changed (different URI), drop cached connection so we reconnect to the right DB
  if (cached!.conn && connectedUri !== MONGODB_URI) {
    try {
      await mongoose.disconnect();
    } catch (_) {}
    cached!.conn = null;
    cached!.promise = null;
    connectedUri = null;
  }

  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    };

    cached!.promise = (mongoose.connect(MONGODB_URI, opts) as Promise<typeof import('mongoose')>)
      .then((conn) => {
        cached!.conn = conn;
        connectedUri = MONGODB_URI;
        return conn;
      })
      .catch((e) => {
        cached!.promise = null;
        cached!.conn = null;
        connectedUri = null;
        throw e;
      });
  }

  const conn = await cached!.promise;

  // Mongoose 8+: ensure client is actually ready (avoids "Client must be connected" in dev/Turbopack)
  if (mongoose.connection.readyState !== 1) {
    await new Promise<void>((resolve, reject) => {
      if (mongoose.connection.readyState === 1) return resolve();
      mongoose.connection.once('connected', () => resolve());
      mongoose.connection.once('error', reject);
    });
  }

  return conn;
}

export default connectDB;
