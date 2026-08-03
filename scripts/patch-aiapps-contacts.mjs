#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_PATH = path.join(__dirname, '../tmp/aiapps-nsfw-outreach.json');
const CSV_PATH = path.join(__dirname, '../tmp/aiapps-nsfw-outreach.csv');
const DL_CSV = path.join(process.env.HOME, 'Downloads/aiapps-nsfw-outreach.csv');
const MAX = 4;

const MANUAL = {
  'candy-ai': { emails: ['support@candymail.ai', 'DPO@everai.ai'], contactPage: 'https://candy.ai/privacy-policy' },
  'crushon-ai': { emails: ['support@crushon.ai', 'security@crushon.ai'], contactPage: 'https://crushon.ai/contact' },
  'juicy-chat': { emails: ['support@juicychat.work'], contactPage: 'https://wiki.juicychat.ai/faq/i.general-faq' },
  'juicychat-ai': { emails: ['support@juicychat.work'], contactPage: 'https://wiki.juicychat.ai/policy/iv.privacy-policy' },
  'celebmakerai': { emails: ['support@celebmakerai.com', 'privacy@celebmakerai.com', 'compliance@celebmakerai.com'], contactPage: 'https://celebmakerai.com/contact' },
  'dittin-ai': { emails: ['support@dittin.ai'], contactPage: 'https://docs.dittin.ai/dittin.ai/introduction/contact' },
  'spicychat-ai': { emails: ['support@spicychat.ai'], contactPage: 'https://support.spicychat.ai/support/tickets/new', telegram: ['https://t.me/spicychatai'] },
  'spicy-chat': { emails: ['support@spicychat.ai'], contactPage: 'https://support.spicychat.ai/' },
  'promptchan': { emails: ['support@promptchan.com'], contactPage: 'https://promptchan.com/articles/about-promptchan' },
  'xmode-ai': { emails: ['support@xmode.ai'], contactPage: 'https://xmode.ai/contact' },
  'craveu': { emails: ['contact@craveu.ai', 'support@craveu.ai'], contactPage: 'https://craveu.ai/contact' },
  'nectar-ai': { emails: ['support@nectar.ai', 'hello@nectar.ai'], contactPage: 'https://nectar.ai/contact' },
  'janitor-ai': { emails: ['support@janitorai.com'], contactPage: 'https://janitorai.com/contact' },
  'girlfriendgpt': { emails: ['support@gptgirlfriend.online', 'contact@gptgirlfriend.online'], contactPage: 'https://www.gptgirlfriend.online/contact' },
  'eroplay-ai': { emails: ['support@eroplay.ai'], contactPage: 'https://eroplay.ai/privacy-policy' },
  'our-dream': { emails: ['support@ourdream.ai', 'trust@ourdream.ai'], contactPage: 'https://safety.ourdream.ai/contact' },
  'ourdream-ai': { emails: ['support@ourdream.ai', 'trust@ourdream.ai'], contactPage: 'https://safety.ourdream.ai/contact' },
  'ourdream-gay': { emails: ['support@ourdream.ai', 'trust@ourdream.ai'], contactPage: 'https://safety.ourdream.ai/contact' },
  'ourdream-trans': { emails: ['support@ourdream.ai', 'trust@ourdream.ai'], contactPage: 'https://safety.ourdream.ai/contact' },
  'thotchat': { emails: ['support@thotchat.ai'], contactPage: 'https://thotchat.ai/contact' },
  'myspicy-ai': { emails: ['support@myspicy.ai'], contactPage: 'https://myspicy.ai/contact' },
  'onlycreate': { emails: ['hello@onlycreate.app', 'support@onlycreate.app'], contactPage: 'https://onlycreate.app/contact' },
  'ai-peeps': { emails: ['support@aipeeps.com', 'hello@aipeeps.com'], contactPage: 'https://aipeeps.com/contact' },
  'rushchat-ai': { emails: ['support@rushchat.ai'], contactPage: 'https://rushchat.ai/contact' },
  'darlink-ai': { emails: ['support@darlink.ai'], contactPage: 'https://darlink.ai/contact' },
  'desirex': { emails: ['support@desirex.ai'], contactPage: 'https://desirex.ai/contact' },
  'chatup-ai': { emails: ['support@aichattings.com'], contactPage: 'https://aichattings.com/contact' },
  'kupid': { emails: ['support@kupid.ai'], contactPage: 'https://www.kupid.ai/contact' },
  'justsext': { emails: ['support@justsext.com'], contactPage: 'https://justsext.com/contact' },
  'joyfun-ai': { emails: ['support@joyfun.ai'], contactPage: 'https://joyfun.ai/contact' },
  'pornpen-ai': { emails: ['support@pornpen.ai'], contactPage: 'https://pornpen.ai/contact' },
  'nutaku': { emails: ['support@nutaku.com', 'business@nutaku.com'], contactPage: 'https://www.nutaku.net/contact/' },
  'ai-girls-by-aiallure': { emails: ['hello@aiallure.com'], contactPage: 'https://www.aiallure.com/legal/privacy' },
  'heyreal': { emails: ['support@heyreal.ai', 'marketing@heyreal.ai'], contactPage: 'https://heyreal.ai/faq/' },
  'arktan': { contactPage: 'https://arktan.com/contact' },
  'reez': { contactPage: 'https://reez.app/' },
};

const JUNK_LOCAL = new Set(['are', 'editor', 'u003e', 'your', 'myemail', 'session-client', 'test']);

function cleanList(emails) {
  const out = [];
  for (const e of emails || []) {
    let lower = String(e).toLowerCase().trim().replace(/^u003e/, '');
    // trim glued suffixes from bad HTML scrapes
    lower = lower.replace(/(adresse|postanschrift|postal|address|phone|tel)$/i, '');
    const m = lower.match(/^([a-z0-9._%+-]+)@([a-z0-9.-]+\.[a-z]{2,24})$/);
    if (!m) continue;
    const [, local, domain] = m;
    if (JUNK_LOCAL.has(local)) continue;
    if (domain.includes('sentry.io') || domain === 'test.com') continue;
    const full = `${local}@${domain}`;
    if (!out.includes(full)) out.push(full);
  }
  return out.slice(0, MAX);
}

let list = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const seen = new Map();
for (const t of list) if (!seen.has(t.slug)) seen.set(t.slug, t);
list = [...seen.values()];

for (const t of list) {
  t.emails = cleanList(Array.isArray(t.emails) ? t.emails : (t.emails || '').split('; ').filter(Boolean));
  t.telegram = Array.isArray(t.telegram) ? t.telegram : (t.telegram || '').split('; ').filter(Boolean);

  const m = MANUAL[t.slug];
  if (m) {
    if (m.emails) t.emails = cleanList([...m.emails, ...t.emails]);
    if (m.contactPage) t.contactPage = m.contactPage;
    if (m.telegram) t.telegram = [...new Set([...m.telegram, ...t.telegram])];
  }
  delete t.aiappsUrl;
}

list.sort((a, b) => a.name.localeCompare(b.name));

const header = 'Name,Featured,Website,Contact Page,Email 1,Email 2,Email 3,Email 4,Telegram';
const rows = list.map((t) =>
  [
    `"${(t.name || '').replace(/"/g, '""')}"`,
    t.featured ? 'FEATURED' : 'NON-FEATURED',
    `"${(t.website || '').replace(/"/g, '""')}"`,
    `"${(t.contactPage || '').replace(/"/g, '""')}"`,
    ...Array.from({ length: MAX }, (_, i) => `"${(t.emails[i] || '').replace(/"/g, '""')}"`),
    `"${t.telegram.join('; ').replace(/"/g, '""')}"`,
  ].join(',')
);

fs.writeFileSync(JSON_PATH, JSON.stringify(list, null, 2));
fs.writeFileSync(CSV_PATH, [header, ...rows].join('\n'));
fs.copyFileSync(CSV_PATH, DL_CSV);

const withE = list.filter((t) => t.emails.length).length;
const multi = list.filter((t) => t.emails.length >= 2).length;
console.log(`Patched. Tools: ${list.length} | With email: ${withE} | 2+ emails: ${multi}`);
console.log(`Downloads: ${DL_CSV}`);
