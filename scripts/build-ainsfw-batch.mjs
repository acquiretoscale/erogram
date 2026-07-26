/**
 * Phase 1: Build clean AI-only batch manifest from nsfw.tools scrape.
 * Usage: node scripts/build-ainsfw-batch.mjs
 */
import fs from 'fs';
import {
  SCRAPE_PATH,
  MANIFEST_PATH,
  parseLiveTools,
  isLiveTool,
  inferCategory,
  guessVendor,
  guessWebsite,
  inferSubscription,
  inferPayment,
  cleanTags,
  toolSlug,
} from './ainsfw-batch-lib.mjs';

const scrape = JSON.parse(fs.readFileSync(SCRAPE_PATH, 'utf8'));
const arr = Array.isArray(scrape) ? scrape : Object.values(scrape);
const live = parseLiveTools();
const liveSlugs = new Set(live.map((t) => t.slug));

const batch = [];
const skipped = { live: 0, junk: 0, duplicateSlug: 0 };

for (const raw of arr) {
  const tool = {
    name: raw.name,
    tags: raw.tags || [],
    scrapeDesc: raw.desc || raw.description || '',
    productUrl: raw.url || '',
    affiliateUrl: raw.tryNow || '',
  };

  if (isLiveTool(tool, live)) {
    skipped.live++;
    continue;
  }

  const category = inferCategory(tool);
  if (category === '__SKIP__') {
    skipped.junk++;
    continue;
  }

  const vendor = guessVendor(tool.name, tool.productUrl);
  const websiteUrl = guessWebsite(vendor);
  const slug = toolSlug(category, tool.name);

  if (liveSlugs.has(slug) || batch.some((t) => t.slug === slug)) {
    skipped.duplicateSlug++;
    continue;
  }

  batch.push({
    name: tool.name,
    category,
    vendor,
    slug,
    websiteUrl,
    scrapeDesc: tool.scrapeDesc,
    tags: cleanTags(tool.tags, category),
    subscription: inferSubscription(tool.tags),
    payment: inferPayment(tool.tags),
    productUrl: tool.productUrl,
  });
}

batch.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(batch, null, 2));

const byCat = {};
for (const t of batch) byCat[t.category] = (byCat[t.category] || 0) + 1;

console.log(`Wrote ${batch.length} tools → ${MANIFEST_PATH}`);
console.log('By category:', byCat);
console.log('Skipped:', skipped);
