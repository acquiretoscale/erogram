#!/usr/bin/env node
/** Manual email patches from deep research */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MERGED = path.join(__dirname, '../tmp/outreach-merged.json');
const AIAPPS = path.join(__dirname, '../tmp/aiapps-nsfw-outreach.json');
const RECENT = path.join(__dirname, '../tmp/nsfw-recent-outreach.json');
const BEST = path.join(__dirname, '../tmp/nsfw-best-promoted.json');

const PATCHES = {
  SwapperAI: { emails: ['swapperaiteam@gmail.com'], contactPage: 'https://swapperai.com/privacy-policy' },
  NudeFab: { emails: ['himyprw@proton.me'], contactPage: 'https://nudefab.app/privacy' },
  TickleTalk: { emails: ['deeplink.meta.ltd@gmail.com'], contactPage: 'https://www.tickletalk.ai/contact' },
  'Free GF': { emails: ['help@freegf.ai', 'info@freegf.ai'], contactPage: 'https://freegf.ai/contact' },
  CreatePorn: { emails: ['business@createporn.com', 'contact@createporn.com'], contactPage: 'https://www.createporn.com/contact' },
  SyncMo: { emails: ['support@syncmo.com'], contactPage: 'https://www.sync-mo.com/contact-us/' },
  Freeze: { emails: ['romero@hentaied.com'], contactPage: 'https://freeze.xxx/contact' },
  Parasited: { emails: ['romero@hentaied.com'], contactPage: 'https://parasited.com/contact' },
  'Plants vs Cunts': { emails: ['romero@hentaied.com'], contactPage: 'https://plantsvscunts.com/contact' },
  'Lollipop Chat': { emails: ['lenny@lollipop.chat'], contactPage: 'https://lollipop.chat/contact' },
  'MyBabes.ai': { emails: ['support@mybabes.ai'], contactPage: 'https://mybabes.ai/docs/complaint' },
  DeepUndress: { emails: ['info@deepstrike.io'], contactPage: 'https://deepundress.app/support' },
  'eHentai.ai': { emails: ['collaborations@ehentai.ai'], contactPage: 'https://ehentai.ai/contact' },
};

function normName(n) {
  return n.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function applyPatch(tool, patch) {
  if (patch.emails?.length) tool.emails = [...new Set([...(tool.emails || []), ...patch.emails])].slice(0, 4);
  if (patch.contactPage) tool.contactPage = patch.contactPage;
}

function patchList(list) {
  for (const t of list) {
    const patch = PATCHES[t.name];
    if (patch) applyPatch(t, patch);
    for (const [name, patch] of Object.entries(PATCHES)) {
      if (normName(t.name) === normName(name)) applyPatch(t, patch);
    }
  }
}

const merged = JSON.parse(fs.readFileSync(MERGED, 'utf8'));
patchList(merged);
fs.writeFileSync(MERGED, JSON.stringify(merged, null, 2));

for (const file of [AIAPPS, RECENT, BEST]) {
  if (!fs.existsSync(file)) continue;
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = Array.isArray(raw) ? raw : raw.new || [];
  patchList(list);
  fs.writeFileSync(file, JSON.stringify(Array.isArray(raw) ? list : { ...raw, new: list }, null, 2));
}

execSync('node scripts/build-outreach-index.mjs', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });

const after = JSON.parse(fs.readFileSync(MERGED, 'utf8'));
const missing = after.filter((t) => !t.emails?.length);
console.log(`\nWith email: ${after.length - missing.length}/${after.length}`);
console.log('Still missing:', missing.map((t) => t.name).join(', '));
