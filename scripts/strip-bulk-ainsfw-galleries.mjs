/**
 * Remove screenshot galleries from bulk-added free AINSFW listings
 * that are not getting organic traffic. Keeps logo + description only.
 *
 * Keeps galleries for: JOI AI + GSC organic tools (FastUndress, AINUDEZ, NudeFab).
 * Paid submission slugs in galleryMap are untouched.
 *
 * Usage: node --env-file=.env.local scripts/strip-bulk-ainsfw-galleries.mjs [--dry]
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const DRY = process.argv.includes('--dry');
const MAP_JSON = path.join(process.cwd(), 'scripts/ainsfw-gallery-map.json');
const MAP_TS = path.join(process.cwd(), 'app/ainsfw/galleryMap.ts');

/** Free catalog tools that keep screenshots (organic traffic or hand-curated, not bulk). */
const KEEP_GALLERY_SLUGS = new Set([
  'joi-ai-nude-generator',
  'fastundress-undress-ai',
  'ainudez-undress-ai',
  'nudefab-ai-image',
]);

function parseStaticSlugs() {
  const src = fs.readFileSync(path.join(process.cwd(), 'app/ainsfw/data.ts'), 'utf8');
  const slugs = [];
  const re = /slug:\s*slugify\([^)]+\)/g;
  let m;
  while ((m = re.exec(src))) {
    const block = src.slice(m.index, m.index + 800);
    const cat = block.match(/slugify\('([^']+)'/)?.[1];
    const name = block.match(/slugify\([^,]+,\s*'([^']+)'/)?.[1];
    if (cat && name) {
      const n = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const c = cat.toLowerCase().replace(/\s+/g, '-');
      slugs.push(`${n}-${c}`);
    }
  }
  // legacy slug in data.ts
  if (src.includes("'joi-ai-nude-generator'")) slugs.push('joi-ai-nude-generator');
  return [...new Set(slugs)];
}

function writeGalleryMapTs(map) {
  const lines = [
    '// Auto-generated — keys match tool.slug (name-category).',
    'export const AINSFW_GALLERY: Record<string, string[]> = {',
  ];
  for (const key of Object.keys(map).filter((k) => map[k]?.length).sort()) {
    lines.push(`  "${key}": [`);
    for (const url of map[key]) lines.push(`    "${url}",`);
    lines.push('  ],');
  }
  lines.push('};', '');
  fs.writeFileSync(MAP_TS, lines.join('\n'));
}

async function main() {
  const staticSlugs = new Set(parseStaticSlugs());
  console.log(`Static catalog slugs: ${staticSlugs.size}`);

  const map = JSON.parse(fs.readFileSync(MAP_JSON, 'utf8'));
  const beforeKeys = Object.keys(map).length;
  const stripped = [];

  for (const slug of Object.keys(map)) {
    if (staticSlugs.has(slug) && !KEEP_GALLERY_SLUGS.has(slug)) {
      stripped.push(slug);
      delete map[slug];
    }
  }

  const afterKeys = Object.keys(map).length;
  console.log(`Gallery map: ${beforeKeys} → ${afterKeys} (stripped ${stripped.length})`);
  console.log(`Kept galleries: ${[...KEEP_GALLERY_SLUGS].join(', ')}`);

  if (!DRY) {
    fs.writeFileSync(MAP_JSON, JSON.stringify(map, null, 2) + '\n');
    writeGalleryMapTs(map);
    console.log('Wrote galleryMap.ts + ainsfw-gallery-map.json');
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('MONGODB_URI missing — skipped DB galleryManaged flags');
    return;
  }

  await mongoose.connect(uri);
  const col = mongoose.connection.collection('ainsfwtoolstats');
  let dbUpdated = 0;

  for (const slug of stripped) {
    if (DRY) continue;
    const res = await col.updateOne(
      { slug },
      {
        $set: {
          galleryManaged: true,
          customGallery: [],
          updatedAt: new Date(),
        },
        $setOnInsert: {
          upvotes: 0,
          downvotes: 0,
          featured: false,
          reviews: [],
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
    if (res.modifiedCount || res.upsertedCount) dbUpdated++;
  }

  console.log(`DB galleryManaged=true (empty gallery): ${DRY ? 'dry-run' : dbUpdated} slugs`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
