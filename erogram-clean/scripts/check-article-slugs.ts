/**
 * Check for articles whose slugs contain "2026" (or no year) when they
 * likely had a "2025" slug that was indexed by Google.
 *
 * Run:  npx tsx scripts/check-article-slugs.ts
 * Dry-run by default. Pass --fix to actually revert slugs.
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

const fix = process.argv.includes('--fix');

async function main() {
  await mongoose.connect(MONGODB_URI, { family: 4, serverSelectionTimeoutMS: 5000 });
  const db = mongoose.connection.db!;
  const articles = db.collection('articles');

  const allArticles = await articles.find({}).project({ title: 1, slug: 1, updatedAt: 1, createdAt: 1 }).toArray();

  console.log(`\nTotal articles: ${allArticles.length}\n`);
  console.log('--- Articles with "2026" in slug (may have had "2025" slug indexed by Google) ---\n');

  const affected: { _id: any; title: string; currentSlug: string; suggestedOldSlug: string }[] = [];

  for (const a of allArticles) {
    const slug = a.slug as string;
    if (slug.includes('2026')) {
      const oldSlug = slug.replace(/2026/g, '2025');
      affected.push({ _id: a._id, title: a.title, currentSlug: slug, suggestedOldSlug: oldSlug });
      console.log(`  Title: ${a.title}`);
      console.log(`  Current slug:  ${slug}`);
      console.log(`  Old slug (2025): ${oldSlug}`);
      console.log('');
    }
  }

  if (affected.length === 0) {
    console.log('  No articles found with "2026" in slug. The slugs may not have been changed,');
    console.log('  or they were created fresh with 2026 titles.\n');
  } else {
    console.log(`Found ${affected.length} article(s) that may have broken 2025 URLs.\n`);

    if (fix) {
      console.log('--fix flag detected. Reverting slugs to 2025 versions...\n');
      for (const a of affected) {
        const existing = await articles.findOne({ slug: a.suggestedOldSlug, _id: { $ne: a._id } });
        if (existing) {
          console.log(`  SKIP: "${a.suggestedOldSlug}" already in use by another article.`);
          continue;
        }
        await articles.updateOne({ _id: a._id }, { $set: { slug: a.suggestedOldSlug } });
        console.log(`  FIXED: ${a.currentSlug} → ${a.suggestedOldSlug}`);
      }
      console.log('\nDone! Now submit the old URLs to IndexNow and revalidate your sitemap.');
    } else {
      console.log('Run with --fix to revert these slugs to the 2025 versions.');
      console.log('This will restore the URLs that Google had indexed.\n');
    }
  }

  console.log('--- All article slugs ---\n');
  for (const a of allArticles) {
    console.log(`  ${a.slug}  →  "${a.title}"`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
