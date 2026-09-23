import mongoose, { Schema, type Connection, type Model } from 'mongoose';

const EROGRAM_URI = process.env.EROGRAM_MONGODB_URI;

let cached = (global as any).erogramDbCache as {
  conn: Connection | null;
  promise: Promise<Connection> | null;
};

if (!cached) {
  cached = (global as any).erogramDbCache = { conn: null, promise: null };
}

export async function connectErogramDB(): Promise<Connection> {
  if (!EROGRAM_URI) {
    throw new Error('EROGRAM_MONGODB_URI is not set');
  }
  if (cached.conn && cached.conn.readyState === 1) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose
      .createConnection(EROGRAM_URI, {
        maxPoolSize: 3,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 10000,
      })
      .asPromise();
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export type ErogramCreator = {
  _id: any;
  name: string;
  username: string;
  slug: string;
  categories: string[];
  avatar: string;
  header: string;
  extraPhotos: string[];
  instagramUrl: string;
  instagramUsername: string;
  twitterUrl: string;
  deleted?: boolean;
};

const CreatorSchema = new Schema(
  {
    name: String,
    username: String,
    slug: String,
    categories: [String],
    avatar: String,
    header: String,
    extraPhotos: [String],
    instagramUrl: String,
    instagramUsername: String,
    twitterUrl: String,
    deleted: Boolean,
  },
  { collection: 'onlyfanscreators', strict: false }
);

export async function getOnlyFansCreatorModel(): Promise<Model<ErogramCreator>> {
  const conn = await connectErogramDB();
  return (conn.models.OnlyFansCreator ||
    conn.model('OnlyFansCreator', CreatorSchema)) as Model<ErogramCreator>;
}

/** Collect up to `max` public photo URLs for a Telegram album. */
export function creatorPhotoUrls(creator: ErogramCreator, max = 8): string[] {
  const urls: string[] = [];
  const push = (u?: string) => {
    const t = (u || '').trim();
    if (t && !urls.includes(t)) urls.push(t);
  };
  push(creator.avatar);
  for (const p of creator.extraPhotos || []) push(p);
  push(creator.header);
  return urls.slice(0, max);
}

export function erogramProfileUrl(username: string): string {
  const u = username.replace(/^@/, '').trim().toLowerCase();
  return `https://erogram.pro/onlyfanssearch/${encodeURIComponent(u)}`;
}
