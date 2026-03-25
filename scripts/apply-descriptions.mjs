import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'app', 'ainsfw', 'data.ts');
const DESC_FILE = path.join(process.cwd(), 'scripts', 'descriptions-output.json');

const descs = JSON.parse(fs.readFileSync(DESC_FILE, 'utf8'));
let data = fs.readFileSync(DATA_FILE, 'utf8');

// Build a map: name -> description
const descMap = {};
for (const [key, val] of Object.entries(descs)) {
  descMap[val.name] = val.description;
}

let replaced = 0;

// For each tool block, find the name and replace the description
// Pattern: name: 'ToolName', ... description: 'old desc',
// We process each tool block
const toolBlockRe = /name:\s*'([^']+)'[\s\S]*?description:\s*'((?:[^'\\]|\\.)*)'/g;
let match;
const replacements = [];

while ((match = toolBlockRe.exec(data))) {
  const toolName = match[1];
  const oldDesc = match[2];
  const newDesc = descMap[toolName];

  if (newDesc) {
    // Escape single quotes in new description for TS string
    const escaped = newDesc.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    replacements.push({
      oldFull: `description: '${oldDesc}'`,
      newFull: `description: '${escaped}'`,
      name: toolName,
    });
  }
}

// Apply replacements (from end to start to preserve positions)
for (const r of replacements) {
  const idx = data.indexOf(r.oldFull);
  if (idx !== -1) {
    data = data.substring(0, idx) + r.newFull + data.substring(idx + r.oldFull.length);
    replaced++;
    console.log(`✅ ${r.name}`);
  } else {
    console.log(`⚠️  Could not find description block for ${r.name}`);
  }
}

fs.writeFileSync(DATA_FILE, data);
console.log(`\nReplaced ${replaced} descriptions in data.ts`);
