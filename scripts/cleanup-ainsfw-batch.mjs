/**
 * Remove non-adult/non-AI junk; move adult games to Adult Games category.
 * Usage: node scripts/cleanup-ainsfw-batch.mjs
 */
import fs from 'fs';
import path from 'path';

const DATA_TS = path.join(process.cwd(), 'app', 'ainsfw', 'data.ts');

const REMOVE = new Set([
  'Sudowrite',
  'OpenSpokenAi',
  'Icons8 Faceswapper',
  'Vidnoz AI Face Swapper',
  'HeyEditor',
  'RepublicLabs.ai',
  'Moemate',
  'MultiChat AI',
  'DREAMPRESS',
  'Mage',
  'PixAI.Art',
  'PicSo',
  'AnimeGenius',
  'DeepSwap',
  'Fapy',
  'HackAIGC',
]);

const ADULT_GAMES = new Set([
  'Bambie',
  'Virtual Lust 3D',
  'Game Of Lust 2',
  'Pirate Jessica',
]);

function slugify(category, name) {
  const cat = category.toLowerCase().replace(/\s+/g, '-');
  const n = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${n}-${cat}`;
}

function parseTools(src) {
  const start = src.indexOf('export const AI_NSFW_TOOLS: AINsfwTool[] = [');
  const end = src.indexOf('\n];\n\nexport function getToolBySlug');
  const body = src.slice(start, end);
  const tools = [];
  const blockRe = /\n  \{\n    slug: slugify\('((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)'\),[\s\S]*?\n  \},/g;
  let m;
  while ((m = blockRe.exec(body))) {
    const block = m[0];
    const cat = m[1];
    const name = m[2].replace(/\\'/g, "'");
    const nameM = block.match(/name:\s*'((?:[^'\\]|\\.)*)'/);
    const toolName = nameM[1].replace(/\\'/g, "'");
    tools.push({ block, category: cat, name: toolName });
  }
  return { start, end, tools, src };
}

const { start, end, tools, src } = parseTools(fs.readFileSync(DATA_TS, 'utf8'));

let removed = 0;
let moved = 0;
const kept = [];

for (const t of tools) {
  if (REMOVE.has(t.name)) {
    removed++;
    continue;
  }
  if (ADULT_GAMES.has(t.name)) {
    const newCat = 'Adult Games';
    const newSlug = slugify(newCat, t.name);
    let block = t.block;
    block = block.replace(/slug: slugify\('[^']*',\s*'((?:[^'\\]|\\.)*)'\)/, `slug: slugify('${newCat}', '$1')`);
    block = block.replace(/category: '[^']*'/, `category: '${newCat}'`);
    // Fix image URL slug segment if R2
    block = block.replace(
      /image: '(https:\/\/[^']+\/ainsfw\/)([a-z0-9-]+)(\.webp)'/,
      (_, pre, oldSlug, ext) => `${pre}${newSlug}${ext}'`,
    );
    kept.push({ ...t, block, category: newCat });
    moved++;
    continue;
  }
  kept.push(t);
}

const header = src.slice(0, start);
const footer = src.slice(end);
const midStart = src.indexOf('[', start) + 1;
const beforeArray = src.slice(0, midStart);
const afterArray = src.slice(end);

const newBody = kept.map((t) => t.block).join('');
fs.writeFileSync(DATA_TS, beforeArray + newBody + afterArray);

console.log(`Removed ${removed} junk tools`);
console.log(`Moved ${moved} to Adult Games`);
console.log(`Kept ${kept.length} tools`);
