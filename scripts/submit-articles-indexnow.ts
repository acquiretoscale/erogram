/**
 * Submit all published article URLs to IndexNow so search engines re-crawl them.
 *
 * Run:  npx tsx scripts/submit-articles-indexnow.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

const INDEXNOW_CONFIG = {
  host: 'erogram.pro',
  key: 'f8f91525268a439b8ae6ce03d362f9bc',
  keyLocation: 'https://erogram.pro/f8f91525268a439b8ae6ce03d362f9bc.txt',
};

async function main() {
  await mongoose.connect(MONGODB_URI, { family: 4, serverSelectionTimeoutMS: 5000 });
  const db = mongoose.connection.db!;
  const articles = db.collection('articles');

  const allArticles = await articles.find({}).project({ slug: 1, title: 1, status: 1 }).toArray();

  const urls = allArticles
    .filter((a: any) => a.status === 'published' || !a.status)
    .map((a: any) => `https://erogram.pro/articles/${a.slug}`);

  console.log(`Submitting ${urls.length} article URLs to IndexNow:\n`);
  urls.forEach((url) => console.log(`  ${url}`));

  const data = {
    host: INDEXNOW_CONFIG.host,
    key: INDEXNOW_CONFIG.key,
    keyLocation: INDEXNOW_CONFIG.keyLocation,
    urlList: urls,
  };

  const response = await fetch('https://www.bing.com/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(data),
  });

  if (response.ok) {
    console.log(`\nSubmitted ${urls.length} URLs to IndexNow (Bing + partners).`);
    console.log('Status:', response.status);
  } else {
    console.error('\nFailed:', response.status, await response.text());
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
