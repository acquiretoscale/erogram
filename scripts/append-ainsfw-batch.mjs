/**
 * Phase 4: Append batch tools into app/ainsfw/data.ts (English only).
 * Usage: node scripts/append-ainsfw-batch.mjs
 */
import fs from 'fs';
import {
  DATA_TS,
  MANIFEST_PATH,
  DESCRIPTIONS_PATH,
  IMAGES_PATH,
  escapeTsString,
} from './ainsfw-batch-lib.mjs';

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const descriptions = fs.existsSync(DESCRIPTIONS_PATH)
  ? JSON.parse(fs.readFileSync(DESCRIPTIONS_PATH, 'utf8'))
  : {};
const images = fs.existsSync(IMAGES_PATH)
  ? JSON.parse(fs.readFileSync(IMAGES_PATH, 'utf8'))
  : {};

const missingDesc = manifest.filter((t) => !descriptions[t.slug]?.description);
if (missingDesc.length) {
  console.error(`Missing descriptions for ${missingDesc.length} tools. Run generate-ainsfw-batch-descriptions.mjs first.`);
  console.error('Missing:', missingDesc.slice(0, 5).map((t) => t.name).join(', '), missingDesc.length > 5 ? '...' : '');
  process.exit(1);
}

let src = fs.readFileSync(DATA_TS, 'utf8');
if (src.includes('// ── BATCH ADD 2026')) {
  console.error('Batch block already appended. Remove // ── BATCH ADD 2026 section first if re-running.');
  process.exit(1);
}

const blocks = [];
const catOrder = ['AI Girlfriend', 'Undress AI', 'AI Chat', 'AI Image', 'AI Roleplay'];
const byCat = {};
for (const t of manifest) {
  (byCat[t.category] ||= []).push(t);
}

for (const cat of catOrder) {
  const tools = byCat[cat];
  if (!tools?.length) continue;
  blocks.push(`  // ── ${cat} (batch) ──`);
  for (const tool of tools) {
    const desc = descriptions[tool.slug].description;
    const image = images[tool.slug]?.image || '/assets/image.jpg';
    const tags = tool.tags.map((t) => `'${escapeTsString(t)}'`).join(', ');
    const payment = tool.payment.map((p) => `'${p}'`).join(', ');
    blocks.push(`  {
    slug: slugify('${escapeTsString(tool.category)}', '${escapeTsString(tool.name)}'),
    name: '${escapeTsString(tool.name)}',
    category: '${tool.category}',
    vendor: '${escapeTsString(tool.vendor)}',
    description: '${escapeTsString(desc)}',
    image: '${image}',
    tags: [${tags}],
    subscription: '${escapeTsString(tool.subscription)}',
    payment: [${payment}],
    tryNowUrl: '${escapeTsString(tool.websiteUrl)}',
    sourceUrl: '${escapeTsString(tool.websiteUrl)}',
  },`);
  }
}

const insert = `\n  // ── BATCH ADD 2026 (nsfw.tools scrape) ──\n${blocks.join('\n')}\n`;
const marker = '\n];\n\nexport function getToolBySlug';
if (!src.includes(marker.trim())) {
  console.error('Could not find insertion point in data.ts');
  process.exit(1);
}

src = src.replace('\n];\n\nexport function getToolBySlug', `${insert}];\n\nexport function getToolBySlug`);
fs.writeFileSync(DATA_TS, src);
console.log(`Appended ${manifest.length} tools to data.ts`);

const counts = {};
for (const t of manifest) counts[t.category] = (counts[t.category] || 0) + 1;
console.log('By category:', counts);
