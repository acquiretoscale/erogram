import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'app', 'ainsfw', 'data.ts');
const APPROVED_FILE = '/Users/themaf/Desktop/nsfw-tools-approved.json';

const approved = JSON.parse(fs.readFileSync(APPROVED_FILE, 'utf8'));
let data = fs.readFileSync(DATA_FILE, 'utf8');

// Build lookup by name
const approvedMap = {};
for (const item of approved) {
  approvedMap[item.name] = item;
}

// Randomly pick 40 tools to get new EN descriptions, keep 20 as-is
const allNames = approved.map(a => a.name);
const shuffled = [...allNames].sort(() => Math.random() - 0.5);
const swapEN = new Set(shuffled.slice(0, 40));
const keepEN = new Set(shuffled.slice(40));

console.log(`Swapping EN for ${swapEN.size} tools, keeping ${keepEN.size} as-is`);

function escapeTS(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

let enSwapped = 0;
let deAdded = 0;
let esAdded = 0;

// Process each tool block
// Strategy: find each tool's description line, then:
// 1. Optionally replace EN description
// 2. Add description_de and description_es after the description line

const toolBlockRe = /name:\s*'([^']+)'[\s\S]*?description:\s*'((?:[^'\\]|\\.)*)'/g;
let match;
const replacements = [];

while ((match = toolBlockRe.exec(data))) {
  const toolName = match[1];
  const oldDesc = match[2];
  const approved_item = approvedMap[toolName];

  if (!approved_item) {
    console.log(`⚠️  No approved data for: ${toolName}`);
    continue;
  }

  const fullMatch = `description: '${oldDesc}'`;
  const matchIdx = data.indexOf(fullMatch, match.index);
  if (matchIdx === -1) continue;

  // Build new EN description
  let newEN;
  if (swapEN.has(toolName)) {
    newEN = escapeTS(approved_item.description_en);
    enSwapped++;
  } else {
    newEN = oldDesc; // keep current
  }

  // Build DE/ES
  const de = escapeTS(approved_item.description_de);
  const es = escapeTS(approved_item.description_es);

  const replacement = `description: '${newEN}',\n    description_de: '${de}',\n    description_es: '${es}'`;

  replacements.push({
    name: toolName,
    old: fullMatch,
    new: replacement,
    pos: matchIdx,
  });

  deAdded++;
  esAdded++;
}

// Apply from end to start to preserve positions
replacements.sort((a, b) => b.pos - a.pos);
for (const r of replacements) {
  data = data.substring(0, r.pos) + r.new + data.substring(r.pos + r.old.length);
  console.log(`✅ ${r.name}`);
}

fs.writeFileSync(DATA_FILE, data);
console.log(`\nDone: ${enSwapped} EN swapped, ${deAdded} DE added, ${esAdded} ES added`);
