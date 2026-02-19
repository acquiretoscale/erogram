#!/usr/bin/env node
/**
 * Verify DB has articles. Run: node --env-file=.env.local scripts/check-articles.mjs
 */
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Missing MONGODB_URI. Use: node --env-file=.env.local scripts/check-articles.mjs');
  process.exit(1);
}

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const count = await mongoose.connection.db.collection('articles').countDocuments({});
  console.log('Articles in DB:', count);
  if (count > 0) {
    const one = await mongoose.connection.db.collection('articles').findOne({}, { projection: { title: 1, slug: 1, status: 1 } });
    console.log('Sample:', one?.title, '| slug:', one?.slug, '| status:', one?.status);
  }
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
} finally {
  await mongoose.disconnect();
}
process.exit(0);
