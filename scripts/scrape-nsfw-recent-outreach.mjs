#!/usr/bin/env node
/** Scrape nsfw.tools recently-added collection only */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_JSON = path.join(__dirname, '../tmp/nsfw-recently-added-products.json');
const EXISTING_AIAPPS = path.join(__dirname, '../tmp/aiapps-nsfw-outreach.json');
const EXISTING_COMPANAYA = path.join(__dirname, '../tmp/companaya-outreach.json');
const OUT_JSON = path.join(__dirname, '../tmp/nsfw-recent-outreach.json');
const OUT_HTML = path.join(process.env.HOME, 'Desktop/outreach/nsfw-recent.html');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
const MAX_EMAILS = 4;

const RECENTLY_ADDED_NAMES = [
  'DeepX', 'FreeMode.ai', 'DeepDance', 'Genesisporn', 'Gushy AI', 'DeepNSFW', 'SecretWaifu',
  'DeepUndress', 'Crushi AI', 'AIundress.cc', 'My Lovely AI', 'Secrets.ai', 'Playbox', 'Swapzy',
  'Fastundress.net', 'VibeNude', 'Uncensored AI', 'Cyber Sexuals', 'Sugarlab', 'NudeFab',
  'PleasureDomes AI', 'CelebMakerAI', 'AIPose', 'Stimulation Studio',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    redirect: 'follow',
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.text();
}

function normName(n) {
  return n.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function vendorToUrl(vendor) {
  let v = vendor.trim();
  if (!/^https?:\/\//i.test(v)) v = `https://${v.toLowerCase()}`;
  try {
    return new URL(v).origin + '/';
  } catch {
    return v;
  }
}

function loadExisting() {
  const all = [];
  for (const f of [EXISTING_AIAPPS, EXISTING_COMPANAYA]) {
    if (!fs.existsSync(f)) continue;
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    const list = Array.isArray(data) ? data : data.new || [];
    all.push(...list);
  }
  const byDomain = new Map();
  const byName = new Map();
  for (const t of all) {
    const d = normDomain(t.website);
    if (d) byDomain.set(d, t);
    byName.set(normName(t.name), t);
    const root = d.split('.')[0];
    if (root.length > 3) byDomain.set(root, t);
  }
  return { byDomain, byName, all };
}

function findExisting(tool, existing) {
  const d = normDomain(tool.website);
  const root = d.split('.')[0];
  if (existing.byDomain.has(d)) return existing.byDomain.get(d);
  if (existing.byDomain.has(root)) return existing.byDomain.get(root);
  if (existing.byName.has(normName(tool.name))) return existing.byName.get(normName(tool.name));
  // aliases
  const aliases = {
    mylovelyai: 'mylovelyai',
    secretsai: 'secretsai',
    celebmakerai: 'celebmakerai',
    sugarlab: 'sugarlab',
  };
  const n = normName(tool.name);
  for (const [a, b] of Object.entries(aliases)) {
    if (n.includes(a) && existing.byName.has(b)) return existing.byName.get(b);
  }
  return null;
}

const SKIP_EMAIL_DOMAINS = new Set(['example.com', 'sentry.io', 'gmail.com', 'test.com', 'google.com']);
const CONTACT_PATHS = ['/contact', '/contact-us', '/about', '/support', '/help', '/privacy', '/privacy-policy', '/terms'];

function extractEmails(html, siteDomain) {
  const found = new Set();
  const root = siteDomain.split('.')[0];
  for (const m of html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}/g) || []) {
    const lower = m.toLowerCase();
    const domain = lower.split('@')[1];
    if (!domain || SKIP_EMAIL_DOMAINS.has(domain)) continue;
    if (lower.includes('noreply') || lower.includes('no-reply')) continue;
    if (!domain.includes(root) && !/^(support|contact|hello|info|help|sales|business|press|team|admin|privacy|legal)@/.test(lower)) continue;
    found.add(lower.replace(/^u003e/i, ''));
  }
  for (const m of html.matchAll(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24})/gi)) {
    found.add(m[1].toLowerCase().replace(/^u003e/i, ''));
  }
  return [...found].slice(0, MAX_EMAILS);
}

async function fetchContacts(websiteUrl) {
  let origin, domain;
  try {
    const res = await fetch(websiteUrl, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
    const u = new URL(res.url);
    origin = u.origin;
    domain = u.hostname.replace(/^www\./, '');
  } catch {
    try {
      const u = new URL(websiteUrl);
      origin = u.origin;
      domain = u.hostname.replace(/^www\./, '');
    } catch {
      return { contactPage: '', emails: [], website: websiteUrl };
    }
  }
  const emails = new Set();
  let contactPage = '';
  for (const p of ['', ...CONTACT_PATHS]) {
    const url = origin + p;
    try {
      const html = await fetchText(url);
      extractEmails(html, domain).forEach((e) => emails.add(e));
      if (emails.size && !contactPage) contactPage = url;
      await sleep(80);
    } catch { /* skip */ }
  }
  return { website: origin + '/', contactPage, emails: [...emails] };
}

function buildHtml(tools) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const rows = tools
    .map((t) => {
      const emails = t.emails.length
        ? t.emails.map((e) => `<a href="mailto:${esc(e)}">${esc(e)}</a>`).join('<br>')
        : '<span class="muted">No email found</span>';
      const contact = t.contactPage
        ? `<a href="${esc(t.contactPage)}" target="_blank" rel="noopener">Contact page</a>`
        : `<a href="${esc(t.website)}" target="_blank" rel="noopener">Website</a>`;
      const recent = '<span class="badge yes">Yes</span>';
      const onList = t.onExistingList
        ? '<span class="badge onlist">Yes</span>'
        : '<span class="badge">No</span>';
      return `<tr data-recent="yes" data-onlist="${t.onExistingList ? 'yes' : 'no'}"><td><strong>${esc(t.name)}</strong></td><td>${recent}</td><td>${onList}</td><td><a href="${esc(t.website)}" target="_blank" rel="noopener">${esc(normDomain(t.website))}</a></td><td><a href="${esc(t.nsfwToolsUrl)}" target="_blank" rel="noopener">NSFW.tools</a></td><td>${contact}</td><td>${emails}</td></tr>`;
    })
    .join('\n');

  const withEmail = tools.filter((t) => t.emails.length).length;
  const onList = tools.filter((t) => t.onExistingList).length;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NSFW.tools Recently Added Outreach</title>
<style>
*{box-sizing:border-box}body{font-family:system-ui,sans-serif;margin:0;padding:24px;background:#0f0f12;color:#eee}
h1{margin:0 0 4px}.sub{color:#999;margin:0 0 16px;font-size:.95rem}
.toolbar{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px;align-items:center}
input,select{padding:10px 14px;border:1px solid #333;border-radius:8px;background:#1a1a20;color:#fff}
input{flex:1;min-width:180px;max-width:360px}
table{width:100%;border-collapse:collapse;font-size:.92rem}th,td{border-bottom:1px solid #2a2a32;padding:12px 10px;text-align:left;vertical-align:top}
th{color:#aaa;font-size:.8rem;text-transform:uppercase}a{color:#7eb8ff;text-decoration:none}tr:hover td{background:#17171d}
.badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:.78rem;background:#2a2a32;color:#bbb}
.badge.yes{background:#0d3320;color:#6ee7a0;font-weight:600}.badge.onlist{background:#1a2a4a;color:#7eb8ff}
.muted{color:#666}tr.hidden{display:none}#count{color:#888;font-size:.9rem}
</style></head><body>
<h1>NSFW.tools Recently Added</h1>
<p class="sub">${tools.length} tools | ${withEmail} with email | ${onList} already on main list</p>
<div class="toolbar">
  <input id="q" type="search" placeholder="Search..." autofocus>
  <select id="filter">
    <option value="all">All</option>
    <option value="new">New only (not on list)</option>
    <option value="onlist">Already on list</option>
  </select>
  <span id="count"></span>
</div>
<table><thead><tr><th>Tool</th><th>Recently Added</th><th>On existing list</th><th>Website</th><th>NSFW.tools</th><th>Contact page</th><th>Emails</th></tr></thead>
<tbody id="rows">${rows}</tbody></table>
<script>
const q=document.getElementById('q'),filter=document.getElementById('filter'),countEl=document.getElementById('count');
const rows=[...document.querySelectorAll('#rows tr')];
function apply(){
  const v=q.value.toLowerCase(),f=filter.value;let n=0;
  rows.forEach(r=>{
    const okSearch=!v||r.textContent.toLowerCase().includes(v);
    const okFilter=f==='all'||(f==='new'&&r.dataset.onlist==='no')||(f==='onlist'&&r.dataset.onlist==='yes');
    const show=okSearch&&okFilter;r.classList.toggle('hidden',!show);if(show)n++;
  });
  countEl.textContent=n+' shown';
}
q.addEventListener('input',apply);filter.addEventListener('change',apply);apply();
</script></body></html>`;
}

async function main() {
  if (!fs.existsSync(PRODUCTS_JSON)) {
    console.error('Missing products JSON. Fetch first.');
    process.exit(1);
  }
  const { products } = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));
  const wanted = new Set(RECENTLY_ADDED_NAMES.map(normName));
  const picked = products.filter((p) => wanted.has(normName(p.title)));
  picked.sort((a, b) => a.title.localeCompare(b.title));

  const existing = loadExisting();
  const tools = picked.map((p) => ({
    name: p.title,
    website: vendorToUrl(p.vendor),
    nsfwToolsUrl: `https://nsfw.tools/products/${p.handle}`,
    price: p.variants?.[0]?.price || '',
    recentlyAdded: true,
    onExistingList: false,
    contactPage: '',
    emails: [],
  }));

  for (const t of tools) {
    const match = findExisting(t, existing);
    if (match) {
      t.onExistingList = true;
      t.emails = Array.isArray(match.emails) ? [...match.emails] : (match.emails || '').split('; ').filter(Boolean);
      t.contactPage = match.contactPage || '';
      if (match.website) t.website = match.website;
    }
  }

  const needScrape = tools.filter((t) => !t.onExistingList || !t.emails.length);
  console.log(`Scraping contacts for ${needScrape.length} tools...`);
  let i = 0;
  for (const t of needScrape) {
    i++;
    const c = await fetchContacts(t.website);
    t.website = c.website || t.website;
    if (c.contactPage) t.contactPage = c.contactPage;
    if (c.emails.length) t.emails = [...new Set([...t.emails, ...c.emails])].slice(0, MAX_EMAILS);
    process.stdout.write(`\r  ${i}/${needScrape.length} ${t.name.slice(0, 24).padEnd(24)} ${t.emails.length} emails`);
    await sleep(250);
  }
  console.log('\n');

  fs.writeFileSync(OUT_JSON, JSON.stringify(tools, null, 2));
  fs.mkdirSync(path.dirname(OUT_HTML), { recursive: true });
  fs.writeFileSync(OUT_HTML, buildHtml(tools));
  console.log(`Done. ${tools.filter((t) => t.emails.length).length}/${tools.length} with email`);
  console.log(`HTML: ${OUT_HTML}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
