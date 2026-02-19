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

  // Never use a stale default connection (e.g. to old VPS). Always use only MONGODB_URI.
  if (cached!.conn && connectedUri !== MONGODB_URI) {
    try {
      await mongoose.disconnect();
    } catch (_) {}
    cached!.conn = null;
    cached!.promise = null;
    connectedUri = null;
  }

  // If there is any existing default connection to a different host, drop it so we don't use VPS
  if (mongoose.connection.readyState !== 0 && connectedUri !== MONGODB_URI) {
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
    // Ensure no stale default connection (e.g. from old VPS) before connecting
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.disconnect();
      } catch (_) {}
    }

    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 15000,
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

  // Wait until client is ready (fixes "Client must be connected" during Next.js build workers)
  const deadline = Date.now() + 15000;
  while (mongoose.connection.readyState !== 1 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100));
  }

  return conn;
}

export default connectDB;
