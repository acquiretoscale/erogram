/**
 * Apply rewritten descriptions from scripts/ainsfw-batch-descriptions.json into data.ts.
 * Usage: node scripts/apply-ainsfw-descriptions.mjs
 */
import fs from 'fs';
import { DATA_TS, DESCRIPTIONS_PATH, escapeTsString, toolSlug } from './ainsfw-batch-lib.mjs';

if (!fs.existsSync(DESCRIPTIONS_PATH)) {
  console.error('Missing scripts/ainsfw-batch-descriptions.json');
  process.exit(1);
}

const descriptions = JSON.parse(fs.readFileSync(DESCRIPTIONS_PATH, 'utf8'));
const ONLY_QWEN = process.argv.includes('--qwen-only');
let src = fs.readFileSync(DATA_TS, 'utf8');

const blockRe = /(\n  \{\n    slug: slugify\('((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)'\),[\s\S]*?\n  \},)/g;
let updated = 0;
let missing = 0;

src = src.replace(blockRe, (block, _full, cat, name) => {
  const slugName = name.replace(/\\'/g, "'");
  const slugCat = cat;
  const slug = toolSlug(slugCat, slugName);
  const entry = descriptions[slug];
  if (!entry?.description) {
    missing++;
    return block;
  }
  if (ONLY_QWEN && entry.source !== 'qwen-humanized') {
    return block;
  }

  const escaped = escapeTsString(entry.description);
  const next = block.replace(
    /description: '((?:[^'\\]|\\.)*)'/,
    `description: '${escaped}'`,
  );
  if (next !== block) updated++;
  return next;
});

fs.writeFileSync(DATA_TS, src);
console.log(`Updated ${updated} descriptions in data.ts (${missing} blocks had no JSON entry)`);
