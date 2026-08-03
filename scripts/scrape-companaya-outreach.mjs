#!/usr/bin/env node
/** Scrape Companaya companions, skip duplicates from aiapps outreach list */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXISTING = path.join(__dirname, '../tmp/aiapps-nsfw-outreach.json');
const OUT_JSON = path.join(__dirname, '../tmp/companaya-outreach.json');
const OUT_HTML = path.join(process.env.HOME, 'Desktop/outreach/companaya.html');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
const MAX_EMAILS = 4;
const CONCURRENCY = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    redirect: 'follow',
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function normDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function normName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function loadExisting() {
  const data = JSON.parse(fs.readFileSync(EXISTING, 'utf8'));
  const domains = new Set();
  const names = new Set();
  for (const t of data) {
    if (t.website) domains.add(normDomain(t.website));
    names.add(normName(t.name));
    // common aliases
    const n = normName(t.name);
    if (n.includes('dreamcompanion')) names.add('mydreamcompanion');
    if (n.includes('secretdesires')) names.add('secretdesires');
    if (n.includes('promptchan')) names.add('promptchan');
    if (n.includes('spicychat')) names.add('spicychat');
    if (n.includes('ourdream')) names.add('ourdream');
    if (n.includes('aiallure')) names.add('aiallure');
  }
  return { domains, names };
}

function isDuplicate(tool, existing) {
  const d = normDomain(tool.website);
  if (d && existing.domains.has(d)) return true;
  const n = normName(tool.name);
  if (existing.names.has(n)) return true;
  // fuzzy: same root domain as existing entry
  const root = d.split('.')[0];
  if (root.length > 3) {
    for (const ed of existing.domains) {
      if (ed === d || ed.split('.')[0] === root) return true;
    }
  }
  return false;
}

async function parseListing() {
  const html = await fetchText('https://companaya.com/companions/');
  const urls = [...new Set([...html.matchAll(/href="(https:\/\/companaya\.com\/companion\/[^"]+)"/g)].map((m) => m[1]))];
  return urls;
}

async function parseReview(url) {
  const html = await fetchText(url);
  const name =
    html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim() ||
    html.match(/<title>([^|<]+)/i)?.[1]?.trim() ||
    url.split('/').slice(-2, -1)[0];
  const visit =
    html.match(/href="(https?:\/\/[^"]+)"[^>]*class="btn-visit-full"/i)?.[1] ||
    html.match(/class="btn-visit-full"[^>]*href="([^"]+)"/i)?.[1] ||
    html.match(/class="btn-visit"[^>]*href="(https?:\/\/[^"]+)"/i)?.[1] ||
    '';
  return { name: name.replace(/\s*Review.*$/i, '').trim(), website: visit, reviewUrl: url };
}

const SKIP_EMAIL_DOMAINS = new Set([
  'example.com', 'sentry.io', 'wixpress.com', 'gmail.com', 'test.com', 'google.com', 'cloudflare.com',
]);
const CONTACT_PATHS = [
  '/contact', '/contact-us', '/about', '/support', '/help', '/privacy', '/privacy-policy', '/terms', '/legal',
];

function extractEmails(html, siteDomain) {
  const raw = html.replace(/\[\s*at\s*\]/gi, '@').replace(/\[\s*dot\s*\]/gi, '.');
  const found = new Set();
  for (const m of raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}/g) || []) {
    const lower = m.toLowerCase();
    const domain = lower.split('@')[1];
    if (!domain || SKIP_EMAIL_DOMAINS.has(domain)) continue;
    if (lower.includes('noreply') || lower.includes('no-reply')) continue;
    if (siteDomain && !domain.includes(siteDomain.split('.')[0]) && !/^(support|contact|hello|info|help|sales|business|press|team|admin)@/.test(lower)) continue;
    found.add(lower);
  }
  for (const m of html.matchAll(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24})/gi)) {
    found.add(m[1].toLowerCase());
  }
  return [...found].slice(0, MAX_EMAILS);
}

const TG_RE = /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([a-zA-Z0-9_+/-]+)/gi;

function extractTelegram(html) {
  const out = new Set();
  let m;
  while ((m = TG_RE.exec(html))) {
    const h = m[1].split('/')[0].split('?')[0];
    if (h && h.length > 2) out.add(`https://t.me/${h}`);
  }
  return [...out].slice(0, 3);
}

async function fetchContacts(websiteUrl) {
  let origin, domain;
  try {
    const res = await fetch(websiteUrl, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
    const final = new URL(res.url);
    origin = final.origin;
    domain = final.hostname.replace(/^www\./, '');
  } catch {
    try {
      const u = new URL(websiteUrl);
      origin = u.origin;
      domain = u.hostname.replace(/^www\./, '');
    } catch {
      return { contactPage: '', emails: [], telegram: [], website: websiteUrl };
    }
  }

  const emails = new Set();
  const telegram = new Set();
  let contactPage = '';

  for (const p of ['/', ...CONTACT_PATHS.map((x) => x)]) {
    const url = origin + (p === '/' ? '' : p);
    try {
      const html = await fetchText(url);
      extractEmails(html, domain).forEach((e) => emails.add(e));
      extractTelegram(html).forEach((t) => telegram.add(t));
      if ((emails.size || telegram.size) && !contactPage) contactPage = url;
      await sleep(80);
    } catch { /* skip */ }
  }

  return {
    website: origin + '/',
    contactPage,
    emails: [...emails].slice(0, MAX_EMAILS),
    telegram: [...telegram],
  };
}

async function poolMap(items, fn, n) {
  const out = [];
  let i = 0;
  async function w() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
      await sleep(150);
    }
  }
  await Promise.all(Array.from({ length: n }, w));
  return out;
}

function buildHtml(tools, skipped) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const rows = tools
    .map((t) => {
      const emails = t.emails.length
        ? t.emails.map((e) => `<a href="mailto:${esc(e)}">${esc(e)}</a>`).join('<br>')
        : '<span class="muted">No email found</span>';
      const tg = t.telegram.length
        ? t.telegram.map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace('https://t.me/', '@'))}</a>`).join('<br>')
        : '<span class="muted">-</span>';
      const contact = t.contactPage
        ? `<a href="${esc(t.contactPage)}" target="_blank" rel="noopener">Contact page</a>`
        : t.website
          ? `<a href="${esc(t.website)}" target="_blank" rel="noopener">Website</a>`
          : '<span class="muted">-</span>';
      const review = t.reviewUrl ? `<a href="${esc(t.reviewUrl)}" target="_blank" rel="noopener">Companaya review</a>` : '-';
      return `<tr><td><strong>${esc(t.name)}</strong></td><td><a href="${esc(t.website)}" target="_blank" rel="noopener">${esc(normDomain(t.website))}</a></td><td>${review}</td><td>${contact}</td><td>${emails}</td><td>${tg}</td></tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Companaya Outreach (new only)</title>
<style>
*{box-sizing:border-box}body{font-family:system-ui,sans-serif;margin:0;padding:24px;background:#0f0f12;color:#eee}
h1{margin:0 0 4px}.sub{color:#999;margin:0 0 16px;font-size:.95rem}
input{width:100%;max-width:420px;padding:10px 14px;border:1px solid #333;border-radius:8px;background:#1a1a20;color:#fff;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:.92rem}th,td{border-bottom:1px solid #2a2a32;padding:12px 10px;text-align:left;vertical-align:top}
th{color:#aaa;font-size:.8rem;text-transform:uppercase}a{color:#7eb8ff;text-decoration:none}tr:hover td{background:#17171d}
.muted{color:#666}tr.hidden{display:none}.skip{margin-top:24px;color:#888;font-size:.85rem}
</style></head><body>
<h1>Companaya Outreach</h1>
<p class="sub">${tools.length} new tools (${skipped.length} skipped, already on aiapps list) | ${tools.filter((t) => t.emails.length).length} with email</p>
<input id="q" type="search" placeholder="Search..." autofocus>
<table><thead><tr><th>Tool</th><th>Website</th><th>Companaya</th><th>Contact page</th><th>Emails</th><th>Telegram</th></tr></thead>
<tbody id="rows">${rows}</tbody></table>
<p class="skip">Skipped duplicates: ${esc(skipped.map((s) => s.name).join(', '))}</p>
<script>
const q=document.getElementById('q');const rows=[...document.querySelectorAll('#rows tr')];
q.addEventListener('input',()=>{const v=q.value.toLowerCase();rows.forEach(r=>r.classList.toggle('hidden',v&&!r.textContent.toLowerCase().includes(v)));});
</script></body></html>`;
}

async function main() {
  const existing = loadExisting();
  console.log('1/3 Fetching Companaya listing...');
  const reviewUrls = await parseListing();
  console.log(`   ${reviewUrls.length} companions`);

  console.log('2/3 Parsing review pages + deduping...');
  const parsed = await poolMap(reviewUrls, (url) => parseReview(url), CONCURRENCY);
  const skipped = [];
  const todo = [];
  for (const t of parsed) {
    if (!t.website) continue;
    if (isDuplicate(t, existing)) skipped.push(t);
    else todo.push(t);
  }
  console.log(`   ${todo.length} new | ${skipped.length} skipped`);

  console.log('3/3 Fetching contacts...');
  let done = 0;
  for (const t of todo) {
    const c = await fetchContacts(t.website);
    t.website = c.website || t.website;
    t.contactPage = c.contactPage;
    t.emails = c.emails;
    t.telegram = c.telegram;
    done++;
    process.stdout.write(`\r   ${done}/${todo.length} ${t.name.slice(0, 28).padEnd(28)} ${t.emails.length} emails`);
    await sleep(200);
  }
  console.log('\n');

  todo.sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(OUT_JSON, JSON.stringify({ new: todo, skipped: skipped.map((s) => s.name) }, null, 2));
  fs.mkdirSync(path.dirname(OUT_HTML), { recursive: true });
  fs.writeFileSync(OUT_HTML, buildHtml(todo, skipped));

  console.log(`Done. HTML: ${OUT_HTML}`);
  console.log(`With email: ${todo.filter((t) => t.emails.length).length}/${todo.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
