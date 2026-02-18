/**
 * Restore articles from mongo_full/articles.bson into the database.
 * Use this to restore the articles collection from your full DB dump.
 *
 * Usage (from erogram-v2):
 *   node --env-file=.env.local scripts/restore-articles-from-dump.mjs
 *   node --env-file=.env.local scripts/restore-articles-from-dump.mjs --dry-run   # no writes
 *   node --env-file=.env.local scripts/restore-articles-from-dump.mjs --dump=../mongo_full
 *
 * Requires: MONGODB_URI in .env.local (your Atlas/live DB).
 * The mongo_full folder must be next to erogram-v2 (or pass --dump path).
 */

import { MongoClient } from 'mongodb';
import { BSON } from 'bson';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

// So restore uses the same DB as Next.js: load .env.local from project root if URI not set
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.join(PROJECT_ROOT, '.env.local') });
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const dumpArg = args.find((a) => a.startsWith('--dump='));
const DUMP_DIR = dumpArg
  ? dumpArg.slice('--dump='.length).replace(/^["']|["']$/g, '')
  : path.join(PROJECT_ROOT, '..', 'mongo_full');
const ARTICLES_BSON = path.join(DUMP_DIR, 'articles.bson');

function parseBsonFile(filePath) {
  const buf = fs.readFileSync(filePath);
  const docs = [];
  let offset = 0;
  while (offset + 4 <= buf.length) {
    const size = buf.readInt32LE(offset);
    if (size < 5 || size > 10 * 1024 * 1024) break;
    if (offset + size > buf.length) break;
    const docBuf = buf.slice(offset, offset + size);
    docs.push(BSON.deserialize(docBuf));
    offset += size;
  }
  return docs;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Missing MONGODB_URI. Use --env-file=.env.local or set MONGODB_URI.');
    process.exit(1);
  }
  if (!fs.existsSync(ARTICLES_BSON)) {
    console.error('Articles dump not found:', ARTICLES_BSON);
    console.error('Place mongo_full next to erogram-v2 or pass --dump=/path/to/mongo_full');
    process.exit(1);
  }

  console.log('Reading', ARTICLES_BSON, '...');
  const docs = parseBsonFile(ARTICLES_BSON);
  console.log('Parsed', docs.length, 'articles from dump.');

  if (docs.length === 0) {
    console.error('No documents found in dump.');
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log('Dry run: would restore', docs.length, 'articles. Slugs:', docs.map((d) => d.slug).join(', '));
    return;
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const dbName = db.databaseName;
    console.log('Connected to database:', dbName);

    const collection = db.collection('articles');
    const existing = await collection.countDocuments();
    console.log('Current articles in DB:', existing);

    console.log('Replacing articles with dump...');
    await collection.deleteMany({});
    const result = await collection.insertMany(docs);
    console.log('Inserted', result.insertedCount, 'articles.');

    // Recreate indexes expected by the app (slug unique, etc.)
    try {
      await collection.createIndex({ slug: 1 }, { unique: true });
      await collection.createIndex({ status: 1, publishedAt: -1, createdAt: -1 });
      await collection.createIndex({ author: 1 });
      console.log('Indexes recreated.');
    } catch (idxErr) {
      console.warn('Index creation (non-fatal):', idxErr.message);
    }
  } finally {
    await client.close();
  }
  console.log('Done. Articles restored from mongo_full.');
  console.log('If the app still shows no articles: run dev, open http://localhost:3000/api/debug/articles-count and check dbName and articleCount match.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
