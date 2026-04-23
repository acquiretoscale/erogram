
import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options: mongoose.ConnectOptions = {
  family: 4,
  maxPoolSize: 50,
  minPoolSize: 0,
  maxIdleTimeMS: 10000,
  serverSelectionTimeoutMS: 8000,
  connectTimeoutMS: 8000,
  socketTimeoutMS: 20000,
  bufferCommands: false,
};

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const g = global as typeof globalThis & { __mongoose: MongooseCache };
if (!g.__mongoose) {
  g.__mongoose = { conn: null, promise: null };
}

async function connectDB() {
  // Fast path: already connected
  if (g.__mongoose.conn && mongoose.connection.readyState === 1) {
    return g.__mongoose.conn;
  }

  // Connection dropped or never established — reset and reconnect
  if (mongoose.connection.readyState !== 1) {
    g.__mongoose.conn = null;
    g.__mongoose.promise = null;
  }

  if (!g.__mongoose.promise) {
    g.__mongoose.promise = mongoose.connect(uri, options).then((m) => {
      g.__mongoose.conn = m;
      return m;
    });
  }

  g.__mongoose.conn = await g.__mongoose.promise;
  return g.__mongoose.conn;
}

export default connectDB;
