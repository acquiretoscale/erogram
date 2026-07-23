
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
  if (mongoose.connection.readyState === 1) {
    return g.__mongoose.conn ?? mongoose;
  }

  // Only clear cache when fully disconnected — NOT while connecting (readyState 2)
  if ((mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) && !g.__mongoose.promise) {
    g.__mongoose.conn = null;
  }

  if (!g.__mongoose.promise) {
    g.__mongoose.promise = mongoose.connect(uri, options)
      .then((m) => {
        g.__mongoose.conn = m;
        return m;
      })
      .catch((err) => {
        g.__mongoose.promise = null;
        g.__mongoose.conn = null;
        throw err;
      });
  }

  return await g.__mongoose.promise;
}

export default connectDB;
