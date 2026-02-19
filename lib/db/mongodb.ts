
import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {
  family: 4, // Force IPv4 to avoid timeouts
  serverSelectionTimeoutMS: 5000,
  bufferCommands: false,
};

let clientPromise: Promise<typeof mongoose>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongoose = global as typeof globalThis & {
    mongoose: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
  };

  if (!globalWithMongoose.mongoose) {
    globalWithMongoose.mongoose = { conn: null, promise: null };
  }

  if (!globalWithMongoose.mongoose.promise) {
    globalWithMongoose.mongoose.promise = mongoose.connect(uri, options).then((mongoose) => {
      return mongoose;
    });
  }
  clientPromise = globalWithMongoose.mongoose.promise;
} else {
  // In production mode, it's best to not use a global variable.
  clientPromise = mongoose.connect(uri, options).then((mongoose) => {
    return mongoose;
  });
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
async function connectDB() {
  // If the connection is already established, return the mongoose instance
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }
  return await clientPromise;
}

export default connectDB;
