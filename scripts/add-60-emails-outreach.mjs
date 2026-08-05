#!/usr/bin/env node
/** Gain +60 emails on outreach list: deep-hunt missing, then add new tools with email from directories. */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(process.env.HOME, 'Desktop/outreach');
const MERGED_JSON = path.join(OUT_DIR, 'outreach-merged.json');
const HUB_HTML = path.join(OUT_DIR, 'index.html');
const CSV_PATH = path.join(OUT_DIR, 'outreach-merged.csv');
const DATA_TS = path.join(ROOT, 'app/ainsfw/data.ts');
const LOG_PATH = path.join(OUT_DIR, 'email-hunt-log.txt');
const CANDIDATES_CACHE = path.join(OUT_DIR, 'email-hunt-candidates.json');

const TARGET_GAIN = 60;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
const MAX_EMAILS = 4;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BAD_WEBSITE = /(gstatic|googleapis|zendesk|sentry|cloudflare|fonts\.)/i;

const SKIP_DOMAINS = new Set([
  'example.com', 'sentry.io', 'wixpress.com', 'email.com', 'test.com', 'google.com',
  'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'youtube.com', 'linkedin.com',
  'apple.com', 'microsoft.com', 'cloudflare.com', 'duckduckgo.com', 'w3.org', 'gstatic.com',
  'fonts.googleapis.com', 'ccbill.com', 'go.aimojo.club', 'nsfwtools.vip', 'aipornwiki.com',
  'aihaven.com', 'aiapps.com', 'nsfw.tools', 'nsfw-tools.com', 'bestainsfw.com', 'erogram.pro',
]);

function log(msg) {
  console.log(msg);
  fs.appendFileSync(LOG_PATH, msg + '\n');
}

function normName(n) { return (n || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function normDomain(url) {
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase(); }
  catch { return ''; }
}
function domainRoot(d) { const p = d.split('.'); return p.length >= 2 ? p[p.length - 2] : p[0]; }

async function fetchText(url, accept = 'text/html') {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: accept }, redirect: 'follow', signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(String(res.status));
  return res.text();
}

function loadErogram() {
  const data = fs.readFileSync(DATA_TS, 'utf8');
  const domains = new Set(); const names = new Set();
  for (const m of data.matchAll(/name:\s*'([^']+)'[\s\S]*?vendor:\s*'([^']+)'/g)) {
    names.add(normName(m[1]));
    const d = normDomain(m[2]); if (d) { domains.add(d); domains.add(domainRoot(d)); }
  }
  return { domains, names };
}

function isExcluded(tool, erogram, outreachDomains, outreachNames) {
  const d = normDomain(tool.website); const n = normName(tool.name); const root = domainRoot(d);
  if (outreachNames.has(n) || (d && outreachDomains.has(d)) || (root.length > 3 && outreachDomains.has(root))) return true;
  if (d && erogram.domains.has(d)) return true;
  if (root.length > 3 && erogram.domains.has(root)) return true;
  if (n && erogram.names.has(n)) return true;
  return false;
}

const CONTACT_PATHS = ['/contact', '/contact-us', '/contactus', '/support', '/help', '/about', '/about-us', '/privacy', '/privacy-policy', '/terms', '/legal', '/press', '/partners', '/advertise', '/business', '/faq', '/company', '/dmca'];
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}/g;
const MAILTO_RE = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24})/gi;

function deobfuscate(t) {
  return t.replace(/\[\s*at\s*\]|\(\s*at\s*\)|\s+at\s+/gi, '@').replace(/\[\s*dot\s*\]|\(\s*dot\s*\)|\s+dot\s+/gi, '.').replace(/&#64;/g, '@').replace(/&#46;/g, '.');
}

function isValidEmail(email, siteDomain) {
  const lower = email.toLowerCase().replace(/^u003e|^mailto:/, '').trim();
  if (!lower.includes('@') || lower.length > 80) return false;
  const [local, domain] = lower.split('@');
  if (!local || !domain || SKIP_DOMAINS.has(domain)) return false;
  if (local.includes('noreply') || local.includes('no-reply')) return false;
  if (/\.(png|jpg|webp|svg|js|css)$/.test(lower)) return false;
  const role = ['support', 'contact', 'hello', 'info', 'help', 'sales', 'business', 'press', 'partners', 'team', 'admin', 'billing', 'legal', 'privacy', 'affiliate', 'ads', 'marketing', 'abuse'];
  const root = domainRoot(siteDomain);
  const okDom = siteDomain && (domain === siteDomain || domain.endsWith('.' + siteDomain) || domain.includes(root));
  const okRole = role.some((r) => local.startsWith(r) || local === r);
  if (!okDom && !okRole && siteDomain && root.length > 3 && !domain.includes(root)) return false;
  return true;
}

function extractEmails(html, siteDomain) {
  const raw = deobfuscate(html); const found = new Set();
  for (const m of raw.match(EMAIL_RE) || []) if (isValidEmail(m, siteDomain)) found.add(m.toLowerCase().replace(/^u003e/, ''));
  let mm; while ((mm = MAILTO_RE.exec(html))) if (isValidEmail(mm[1], siteDomain)) found.add(mm[1].toLowerCase());
  return [...found];
}

function rankEmails(emails, siteDomain) {
  const score = (e) => {
    const [, domain] = e.split('@'); let s = 0;
    if (domain === siteDomain || domain.endsWith('.' + siteDomain)) s += 50;
    if (/^(support|contact|hello|info|help|business|sales|press|partners|team|admin)@/.test(e)) s += 30;
    return s;
  };
  return [...emails].sort((a, b) => score(b) - score(a)).slice(0, MAX_EMAILS);
}

function findInternalLinks(html, origin) {
  const links = new Set();
  for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
    let href = m[1]; if (href.startsWith('/')) href = origin + href;
    if (!href.startsWith(origin)) continue;
    if (/contact|about|support|help|privacy|terms|legal|press|partner|advert|business|faq|abuse|dmca/i.test(href)) links.add(href.split('#')[0].split('?')[0]);
  }
  return [...links];
}

async function resolveWebsite(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
    const u = new URL(res.url);
    return { origin: u.origin, domain: u.hostname.replace(/^www\./, ''), website: u.origin + '/' };
  } catch {
    try { const u = new URL(url); return { origin: u.origin, domain: u.hostname.replace(/^www\./, ''), website: u.origin + '/' }; }
    catch { return { origin: '', domain: '', website: url }; }
  }
}

async function searchWebEmails(domain, name) {
  const found = new Set();
  for (const q of [`"${domain}" contact email`, `"${domain}" support@ OR contact@`, `"${name}" ${domain} email`]) {
    try {
      const html = await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`);
      extractEmails(html, domain).forEach((e) => found.add(e));
      if (found.size >= MAX_EMAILS) break;
      await sleep(1400);
    } catch { /* skip */ }
  }
  return [...found];
}

async function websiteFromDirectory(directoryUrl) {
  if (!directoryUrl) return '';
  try {
    const html = await fetchText(directoryUrl);
    const fromNext = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (fromNext) {
      const site = JSON.parse(fromNext[1])?.props?.pageProps?.site;
      if (site?.url) return site.url;
    }
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try { const u = JSON.parse(m[1])?.itemReviewed?.url; if (u?.startsWith('http')) return u; } catch { /* skip */ }
    }
    const h1 = html.match(/<h1[^>]*>([^<]+)/)?.[1]?.replace(/\s*–.*/, '').trim() || '';
    const slug = directoryUrl.split('/').pop() || '';
    for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
      const href = m[1]; const d = normDomain(href);
      if (!d || SKIP_DOMAINS.has(d) || BAD_WEBSITE.test(href)) continue;
      if (d.includes('nsfwtools') || d.includes('aipornwiki') || d.includes('aihaven')) continue;
      if (slug && d.includes(slug.replace(/-/g, '').slice(0, 6))) return href;
      if (h1 && d.includes(normName(h1).slice(0, 6))) return href;
    }
    for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
      const href = m[1]; const d = normDomain(href);
      if (d && !SKIP_DOMAINS.has(d) && !BAD_WEBSITE.test(href) && !d.includes('nsfwtools')) return href;
    }
  } catch { /* skip */ }
  return '';
}

async function deepContacts(websiteUrl, name, { fast = false } = {}) {
  let url = websiteUrl;
  if (BAD_WEBSITE.test(url)) url = '';

  const { origin, domain, website } = url ? await resolveWebsite(url) : { origin: '', domain: '', website: '' };
  if (!origin) return { website: url || websiteUrl, contactPage: '', emails: [] };

  const emails = new Set(); let contactPage = ''; const visited = new Set();
  const maxVisits = fast ? 10 : 28;
  async function scan(u) {
    if (visited.has(u) || visited.size > maxVisits) return;
    visited.add(u);
    try {
      const html = await fetchText(u);
      extractEmails(html, domain).forEach((e) => emails.add(e));
      if (emails.size && !contactPage) contactPage = u;
      if (!fast) for (const link of findInternalLinks(html, origin)) await scan(link);
      await sleep(fast ? 50 : 100);
    } catch { /* skip */ }
  }
  for (const p of CONTACT_PATHS.slice(0, fast ? 8 : CONTACT_PATHS.length)) await scan(origin + p);
  if (!fast) await scan(origin);
  if (!fast && emails.size < MAX_EMAILS) (await searchWebEmails(domain, name)).forEach((e) => emails.add(e));

  return { website, contactPage: contactPage || (emails.size ? origin + '/contact' : ''), emails: rankEmails(emails, domain) };
}

const AI_NAME_RE = /\b(ai|gpt|gen(?:erat)?|undress|waifu|companion|chatbot|deepfake|nsfw)\b/i;
function looksLikeAiTool(name, website) {
  const d = normDomain(website);
  return AI_NAME_RE.test(name || '') || d.endsWith('.ai') || /\.ai\//.test(website || '');
}

function pickExternalLink(html, slugHint = '') {
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    const href = m[1]; const d = normDomain(href);
    if (!d || SKIP_DOMAINS.has(d) || BAD_WEBSITE.test(href)) continue;
    if (d.includes('nsfwtools') || d.includes('aipornwiki') || d.includes('aihaven')) continue;
    if (slugHint && d.includes(slugHint.replace(/-/g, '').slice(0, 8))) return href;
  }
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    const href = m[1]; const d = normDomain(href);
    if (d && !SKIP_DOMAINS.has(d) && !BAD_WEBSITE.test(href) && !d.includes('nsfwtools')) return href;
  }
  return '';
}

async function collectDirectoryCandidates() {
  const out = [];

  const vipXml = await fetchText('https://nsfwtools.vip/sitemap-tools.xml');
  const vipUrls = [...vipXml.matchAll(/<loc>(https:\/\/nsfwtools\.vip\/tool\/[^<]+)<\/loc>/g)].map((m) => m[1]);
  for (let i = 0; i < vipUrls.length; i++) {
    try {
      const url = vipUrls[i]; const html = await fetchText(url);
      const slug = url.split('/tool/')[1];
      const name = html.match(/<h1[^>]*>([^<]+)/)?.[1]?.replace(/\s*–.*/, '').trim() || slug;
      const website = pickExternalLink(html, slug);
      if (website) out.push({ name, website, sources: ['nsfwtools.vip'], directoryUrl: url });
    } catch { /* skip */ }
    if ((i + 1) % 100 === 0) process.stdout.write(`\r  vip ${i + 1}/${vipUrls.length}`);
    await sleep(50);
  }
  console.log(`\n  nsfwtools.vip: ${out.length}`);

  const wikiXml = await fetchText('https://aipornwiki.com/sitemap.xml');
  const wikiUrls = [...wikiXml.matchAll(/<loc>(https:\/\/aipornwiki\.com\/site\/[^<]+)<\/loc>/g)].map((m) => m[1]);
  for (const url of wikiUrls) {
    try {
      const html = await fetchText(url);
      const nd = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      let name = url.split('/').pop(); let website = '';
      if (nd) { const site = JSON.parse(nd[1])?.props?.pageProps?.site; name = site?.name || name; website = site?.url || ''; }
      if (website) out.push({ name, website, sources: ['aipornwiki.com'], directoryUrl: url });
    } catch { /* skip */ }
    await sleep(80);
  }
  console.log(`  aipornwiki: ${wikiUrls.length} pages`);

  const shop = await (await fetch('https://nsfw.tools/products.json?limit=250', { headers: { 'User-Agent': UA } })).json();
  for (const p of shop.products || []) {
    const v = (p.vendor || '').trim(); if (!v) continue;
    let w = v.startsWith('http') ? v : `https://${v}`;
    try {
      w = new URL(w).origin + '/';
      if (!looksLikeAiTool(p.title, w)) continue;
      out.push({ name: p.title, website: w, sources: ['nsfw.tools'], directoryUrl: `https://nsfw.tools/products/${p.handle}` });
    } catch { /* skip */ }
  }
  console.log(`  nsfw.tools: ${shop.products?.length || 0}`);

  try {
    const aiPages = ['https://www.aiapps.com/categories/ai-nsfw/', 'https://www.aiapps.com/categories/ai-nsfw/for/content-creators/'];
    const aiTools = new Map();
    for (const page of aiPages) {
      const html = await fetchText(page);
      for (const m of html.matchAll(/<a href="\/items\/([^"]+)\/">([\s\S]*?)<\/a>/g)) {
        const slug = m[1];
        const name = m[2].match(/<h3[^>]*>([^<]+)<\/h3>/)?.[1]?.trim() || slug;
        if (!aiTools.has(slug)) aiTools.set(slug, { slug, name });
      }
    }
    for (const t of aiTools.values()) {
      try {
        const md = await fetchText(`https://www.aiapps.com/items/${t.slug}/`, 'text/markdown');
        const website = md.match(/\*\*URL:\*\* (https?:\/\/[^\s]+)/i)?.[1]?.trim() || '';
        if (website) out.push({ name: t.name, website, sources: ['aiapps.com'], directoryUrl: `https://www.aiapps.com/items/${t.slug}/` });
      } catch { /* skip */ }
      await sleep(60);
    }
    console.log(`  aiapps.com: ${aiTools.size} items`);
  } catch (e) { console.log(`  aiapps.com: skip (${e.message})`); }

  try {
    const bestXml = await fetchText('https://bestnsfwai.io/sitemap.xml');
    const bestUrls = [...bestXml.matchAll(/<loc>(https:\/\/bestnsfwai\.io\/[^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => /\/tool\/|\/tools\//.test(u));
    for (const url of bestUrls.slice(0, 400)) {
      try {
        const html = await fetchText(url);
        const name = html.match(/<h1[^>]*>([^<]+)/)?.[1]?.replace(/\s*[-|].*/, '').trim() || url.split('/').pop();
        const website = pickExternalLink(html, url.split('/').pop() || '');
        if (website && looksLikeAiTool(name, website)) out.push({ name, website, sources: ['bestnsfwai.io'], directoryUrl: url });
      } catch { /* skip */ }
      await sleep(40);
    }
    console.log(`  bestnsfwai.io: ${bestUrls.length} urls`);
  } catch (e) { console.log(`  bestnsfwai.io: skip (${e.message})`); }

  const byDom = new Map();
  for (const t of out) { const d = normDomain(t.website); if (d) byDom.set(d, t); }
  return [...byDom.values()];
}

function patchHub(html, tools) {
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const withEmail = tools.filter((t) => t.emails?.length).length;
  const featured = tools.filter((t) => t.featured).length;
  const rows = tools.map((t) => {
    const emails = t.emails?.length ? t.emails.map((e) => `<a href="mailto:${esc(e)}">${esc(e)}</a>`).join('<br>') : '<span class="muted">No email</span>';
    const contact = t.contactPage ? `<a href="${esc(t.contactPage)}" target="_blank" rel="noopener">Contact</a>` : t.website ? `<a href="${esc(t.website)}" target="_blank" rel="noopener">Website</a>` : '<span class="muted">-</span>';
    const feat = t.featured ? '<span class="badge featured">Yes</span>' : '<span class="badge">No</span>';
    const rec = t.recentlyAdded ? '<span class="badge recent">Yes</span>' : '<span class="badge">No</span>';
    const note = t.sidenote ? `<span class="note">${esc(t.sidenote)}</span>` : '<span class="muted">-</span>';
    const tg = t.telegram?.length ? t.telegram.map((x) => `<a href="${esc(x)}" target="_blank" rel="noopener">${esc(x)}</a>`).join('<br>') : '<span class="muted">-</span>';
    return `<tr class="row-tools" data-search="${esc((t.name + ' ' + (t.emails || []).join(' ')).toLowerCase())}"><td><strong>${esc(t.name)}</strong></td><td>${feat}</td><td>${rec}</td><td>${note}</td><td>${contact}</td><td>${emails}</td><td>${tg}</td></tr>`;
  }).join('\n');
  let out = html.replace(/<div class="stat"><strong>\d+<\/strong>AI tools to reach out<\/div>/, `<div class="stat"><strong>${tools.length}</strong>AI tools to reach out</div>`);
  out = out.replace(/<h2>AI NSFW Tools to Reach Out \(\d+\)<\/h2>/, `<h2>AI NSFW Tools to Reach Out (${tools.length})</h2>`);
  out = out.replace(/<p class="sub">\d+ with email \| \d+ featured on aiapps \/ nsfw\.tools<\/p>/, `<p class="sub">${withEmail} with email | ${featured} featured on aiapps / nsfw.tools</p>`);
  out = out.replace(/(<section id="tools"[\s\S]*?<tbody>)[\s\S]*?(<\/tbody>)/, `$1${rows}$2`);
  return out;
}

function writeCsv(tools) {
  const header = 'Name,Featured,Recently Added,Website,Contact Page,Email 1,Email 2,Email 3,Email 4,Telegram,Sources';
  const rows = tools.map((t) => {
    const e = t.emails || [];
    return [`"${(t.name || '').replace(/"/g, '""')}"`, t.featured ? 'Yes' : 'No', t.recentlyAdded ? 'Yes' : 'No',
      `"${(t.website || '').replace(/"/g, '""')}"`, `"${(t.contactPage || '').replace(/"/g, '""')}"`,
      ...Array.from({ length: MAX_EMAILS }, (_, i) => `"${(e[i] || '').replace(/"/g, '""')}"`),
      `"${(t.telegram || []).join('; ').replace(/"/g, '""')}"`, `"${(t.sources || []).join(', ').replace(/"/g, '""')}"`].join(',');
  });
  fs.writeFileSync(CSV_PATH, [header, ...rows].join('\n'));
}

function persist(tools) {
  tools.sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(MERGED_JSON, JSON.stringify(tools, null, 2));
  writeCsv(tools);
  if (fs.existsSync(HUB_HTML)) fs.writeFileSync(HUB_HTML, patchHub(fs.readFileSync(HUB_HTML, 'utf8'), tools));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.appendFileSync(LOG_PATH, `\nEmail hunt resumed ${new Date().toISOString()}\n`);

  const tools = JSON.parse(fs.readFileSync(MERGED_JSON, 'utf8'));
  const startWithEmail = tools.filter((t) => t.emails?.length).length;
  let gained = 0;

  log(`Start: ${tools.length} tools, ${startWithEmail} with email. Target +${TARGET_GAIN} emails.`);

  log('\nPhase 1: Deep hunt on list entries missing email...');
  const missing = tools.filter((t) => !t.emails?.length);
  for (let i = 0; i < missing.length && gained < TARGET_GAIN; i++) {
    const tool = missing[i];
    if (BAD_WEBSITE.test(tool.website || '') && tool.directoryUrl) {
      const fixed = await websiteFromDirectory(tool.directoryUrl);
      if (fixed) tool.website = fixed;
    }
    const c = await deepContacts(tool.website, tool.name);
    if (c.website && !BAD_WEBSITE.test(c.website)) tool.website = c.website;
    if (c.contactPage) tool.contactPage = c.contactPage;
    if (c.emails.length) { tool.emails = c.emails; gained++; persist(tools); }
    process.stdout.write(`\r  fix ${i + 1}/${missing.length} gained ${gained}/${TARGET_GAIN} ${tool.name.slice(0, 24).padEnd(24)}`);
    await sleep(350);
  }
  console.log('\n');

  if (gained < TARGET_GAIN) {
    log(`\nPhase 2: Add new tools with email (${TARGET_GAIN - gained} still needed)...`);
    const erogram = loadErogram();
    const outreachDomains = new Set(tools.map((t) => normDomain(t.website)).filter(Boolean));
    const outreachNames = new Set(tools.map((t) => normName(t.name)));
    for (const t of tools) { const r = domainRoot(normDomain(t.website)); if (r.length > 3) outreachDomains.add(r); }

    let candidates;
    if (fs.existsSync(CANDIDATES_CACHE)) {
      candidates = JSON.parse(fs.readFileSync(CANDIDATES_CACHE, 'utf8'));
      log(`  loaded ${candidates.length} cached candidates`);
    } else {
      candidates = await collectDirectoryCandidates();
      fs.writeFileSync(CANDIDATES_CACHE, JSON.stringify(candidates, null, 2));
    }
    const fresh = candidates.filter((t) => {
      const curated = (t.sources || []).some((s) => ['nsfwtools.vip', 'aipornwiki.com', 'aiapps.com'].includes(s));
      if (!curated && !looksLikeAiTool(t.name, t.website)) return false;
      return !isExcluded(t, erogram, outreachDomains, outreachNames);
    });

    for (const c of fresh) {
      if (gained >= TARGET_GAIN) break;
      const enriched = await deepContacts(c.website, c.name, { fast: true });
      if (!enriched.emails.length) continue;
      const entry = {
        name: c.name, website: enriched.website || c.website, contactPage: enriched.contactPage,
        emails: enriched.emails, telegram: [], featured: false, recentlyAdded: false,
        sidenote: `Found on ${c.sources.join(', ')}`, sources: c.sources, directoryUrl: c.directoryUrl, promotedOn: [],
      };
      tools.push(entry);
      outreachDomains.add(normDomain(entry.website));
      outreachNames.add(normName(entry.name));
      gained++;
      persist(tools);
      process.stdout.write(`\r  new ${gained}/${TARGET_GAIN} ${c.name.slice(0, 28).padEnd(28)}`);
      await sleep(200);
    }
    console.log('\n');
  }

  persist(tools);

  const endWithEmail = tools.filter((t) => t.emails?.length).length;
  log(`Done. +${gained} emails gained (${startWithEmail} → ${endWithEmail}). Total tools: ${tools.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
