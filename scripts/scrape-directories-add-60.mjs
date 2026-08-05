#!/usr/bin/env node
/**
 * Scrape ~60 NEW AI NSFW tools from competitor directories (not on Erogram, not in outreach).
 * Deep contact enrich, merge into Desktop/outreach/outreach-merged.json + CSV, rebuild index.html tools tab.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(process.env.HOME, 'Desktop/outreach');
const HUB_HTML = path.join(OUT_DIR, 'index.html');
const DATA_TS = path.join(ROOT, 'app/ainsfw/data.ts');
const MERGED_JSON = path.join(OUT_DIR, 'outreach-merged.json');
const NEW_JSON = path.join(OUT_DIR, 'new-60-outreach.json');
const CSV_PATH = path.join(OUT_DIR, 'outreach-merged.csv');

const TARGET = 60;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
const MAX_EMAILS = 4;
const CONCURRENCY = 3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SKIP_DOMAINS = new Set([
  'example.com', 'sentry.io', 'wixpress.com', 'email.com', 'test.com', 'google.com',
  'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'youtube.com', 'linkedin.com',
  'apple.com', 'microsoft.com', 'cloudflare.com', 'duckduckgo.com', 'w3.org', 'schema.org',
  'gstatic.com', 'fonts.googleapis.com', 'ccbill.com', 'go.aimojo.club', 'nsfwtools.vip',
  'aipornwiki.com', 'aihaven.com', 'aiapps.com', 'nsfw.tools', 'nsfw-tools.com',
  'bestainsfw.com', 'bestnsfwai.io', 'ainsfwtools.com', 'companaya.com', 'erogram.pro',
]);

const SOCIAL_RE = /^(twitter|facebook|linkedin|instagram|youtube|t\.me|telegram|discord|reddit)\./i;
const AFFILIATE_RE = /(go\.|track\.|aff|redirect|clk\.|link\.)/i;

function normName(n) {
  return (n || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normDomain(url) {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function domainRoot(d) {
  const p = d.split('.');
  return p.length >= 2 ? p[p.length - 2] : p[0];
}

async function fetchText(url, accept = 'text/html') {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: accept },
    redirect: 'follow',
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function parseToolsFromHubHtml(html) {
  const tools = [];
  for (const m of html.matchAll(/<tr class="row-tools"[^>]*data-search="([^"]*)"[^>]*>([\s\S]*?)<\/tr>/g)) {
    const row = m[2];
    const name = row.match(/<strong>([^<]+)<\/strong>/)?.[1]?.trim() || '';
    const featured = row.includes('badge featured');
    const recentlyAdded = row.includes('badge recent">Yes');
    const sidenote = row.match(/class="note">([^<]+)/)?.[1]?.trim() || '';
    const contactPage = row.match(/href="(https?:\/\/[^"]+)"[^>]*target="_blank"[^>]*rel="noopener">Contact/)?.[1] || '';
    const emails = [...row.matchAll(/href="mailto:([^"]+)"/g)].map((x) => x[1].toLowerCase());
    const telegram = [...row.matchAll(/href="(https:\/\/t\.me\/[^"]+)"/g)].map((x) => x[1]);
    let website = contactPage ? normDomain(contactPage) : '';
    if (!website && emails[0]) website = emails[0].split('@')[1] || '';
    tools.push({
      name,
      featured,
      recentlyAdded,
      website: website ? `https://${website}/` : '',
      contactPage,
      emails: [...new Set(emails)].slice(0, MAX_EMAILS),
      telegram: [...new Set(telegram)],
      promotedOn: [],
      sidenote,
      sources: ['existing'],
    });
  }
  return tools;
}

function loadErogramExclusions() {
  const data = fs.readFileSync(DATA_TS, 'utf8');
  const domains = new Set();
  const names = new Set();
  for (const m of data.matchAll(/name:\s*'([^']+)'[\s\S]*?vendor:\s*'([^']+)'/g)) {
    names.add(normName(m[1]));
    const d = normDomain(m[2]);
    if (d) {
      domains.add(d);
      domains.add(domainRoot(d));
    }
  }
  return { domains, names };
}

function loadExistingOutreach() {
  if (fs.existsSync(MERGED_JSON)) {
    return JSON.parse(fs.readFileSync(MERGED_JSON, 'utf8'));
  }
  if (fs.existsSync(HUB_HTML)) {
    return parseToolsFromHubHtml(fs.readFileSync(HUB_HTML, 'utf8'));
  }
  throw new Error('No outreach data found');
}

function isExcluded(tool, erogram, outreachDomains, outreachNames) {
  const d = normDomain(tool.website);
  const n = normName(tool.name);
  const root = domainRoot(d);
  if (!d && !n) return true;
  if (outreachNames.has(n)) return true;
  if (d && outreachDomains.has(d)) return true;
  if (root.length > 3 && outreachDomains.has(root)) return true;
  if (d && erogram.domains.has(d)) return true;
  if (root.length > 3 && erogram.domains.has(root)) return true;
  if (n && erogram.names.has(n)) return true;
  // fuzzy name match
  for (const en of erogram.names) {
    if (en.length > 4 && n.length > 4 && (n.includes(en) || en.includes(n))) return true;
  }
  for (const on of outreachNames) {
    if (on.length > 4 && n.length > 4 && (n.includes(on) || on.includes(n))) return true;
  }
  return false;
}

function pickExternalLink(html, pageDomain, slugHint = '') {
  const candidates = [];
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    const href = m[1];
    const d = normDomain(href);
    if (!d || SKIP_DOMAINS.has(d) || d.endsWith('.vip') || SOCIAL_RE.test(d)) continue;
    if (AFFILIATE_RE.test(href)) continue;
    if (d.includes('nsfwtools') || d.includes('aipornwiki') || d.includes('aihaven')) continue;
    let score = 0;
    if (slugHint && d.includes(slugHint.replace(/-/g, '').slice(0, 8))) score += 30;
    if (d === pageDomain) score += 20;
    if (/visit|official|website|app\./i.test(href)) score += 10;
    if (/contact|privacy|terms|login|signup|auth/.test(href)) score -= 5;
    candidates.push({ href, d, score });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.href || '';
}

function parseJsonLdUrl(html) {
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(m[1]);
      const url = j?.itemReviewed?.url || j?.url;
      if (url?.startsWith('http')) return url;
    } catch { /* skip */ }
  }
  return '';
}

function parseNextDataSite(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[1]);
    const site = j?.props?.pageProps?.site;
    if (site?.name && site?.url) return { name: site.name, website: site.url };
  } catch { /* skip */ }
  return null;
}

async function scrapeNsfwToolsVip() {
  const xml = await fetchText('https://nsfwtools.vip/sitemap-tools.xml');
  const urls = [...xml.matchAll(/<loc>(https:\/\/nsfwtools\.vip\/tool\/[^<]+)<\/loc>/g)].map((m) => m[1]);
  const out = [];
  let i = 0;
  for (const url of urls) {
    i++;
    try {
      const html = await fetchText(url);
      const slug = url.split('/tool/')[1];
      const name = html.match(/<h1[^>]*>([^<]+)/)?.[1]?.replace(/\s*–.*/, '').trim() || slug;
      const website = pickExternalLink(html, '', slug) || '';
      if (website) out.push({ name, website, sources: ['nsfwtools.vip'], directoryUrl: url });
    } catch { /* skip */ }
    if (i % 20 === 0) process.stdout.write(`\r  nsfwtools.vip ${i}/${urls.length}`);
    await sleep(80);
  }
  console.log(`\n  nsfwtools.vip: ${out.length} tools with websites`);
  return out;
}

async function scrapeAiPornWiki() {
  const xml = await fetchText('https://aipornwiki.com/sitemap.xml');
  const urls = [...xml.matchAll(/<loc>(https:\/\/aipornwiki\.com\/site\/[^<]+)<\/loc>/g)].map((m) => m[1]);
  const out = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const html = await fetchText(url);
      const fromNext = parseNextDataSite(html);
      const website = fromNext?.website || parseJsonLdUrl(html);
      const name = fromNext?.name || html.match(/<title>Is ([^?]+)/)?.[1]?.trim() || url.split('/').pop();
      if (website) out.push({ name, website, sources: ['aipornwiki.com'], directoryUrl: url });
    } catch { /* skip */ }
    if ((i + 1) % 15 === 0) process.stdout.write(`\r  aipornwiki ${i + 1}/${urls.length}`);
    await sleep(100);
  }
  console.log(`\n  aipornwiki.com: ${out.length} tools`);
  return out;
}

async function scrapeNsfwToolsShopify() {
  const res = await fetch('https://nsfw.tools/products.json?limit=250', { headers: { 'User-Agent': UA } });
  const data = await res.json();
  const out = [];
  for (const p of data.products || []) {
    const vendor = (p.vendor || '').trim();
    if (!vendor) continue;
    let website = vendor.startsWith('http') ? vendor : `https://${vendor}`;
    try { website = new URL(website).origin + '/'; } catch { continue; }
    out.push({
      name: p.title,
      website,
      sources: ['nsfw.tools'],
      directoryUrl: `https://nsfw.tools/products/${p.handle}`,
    });
  }
  console.log(`  nsfw.tools: ${out.length} products`);
  return out;
}

async function scrapeAiHaven() {
  const xml = await fetchText('https://aihaven.com/sitemap.xml');
  const urls = [...xml.matchAll(/<loc>(https:\/\/aihaven\.com\/aitools\/[^<]+\/)<\/loc>/g)]
    .map((m) => m[1])
    .filter((u) => !u.endsWith('/aitools/'));
  const out = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const html = await fetchText(url);
      const slug = url.split('/aitools/')[1].replace(/\/$/, '');
      const name = html.match(/<h1[^>]*>([^<]+)/)?.[1]?.trim()
        || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const website = pickExternalLink(html, '', slug) || '';
      if (website) out.push({ name, website, sources: ['aihaven.com'], directoryUrl: url });
    } catch { /* skip */ }
    if ((i + 1) % 20 === 0) process.stdout.write(`\r  aihaven ${i + 1}/${urls.length}`);
    await sleep(100);
  }
  console.log(`\n  aihaven.com: ${out.length} tools`);
  return out;
}

async function scrapeAiAppsCategoryPages() {
  const out = [];
  const tools = new Map();
  const pages = [
    'https://www.aiapps.com/categories/ai-nsfw/',
    'https://www.aiapps.com/categories/ai-nsfw/for/content-creators/',
  ];
  for (const page of pages) {
    const html = await fetchText(page);
    for (const m of html.matchAll(/<a href="\/items\/([^"]+)\/">([\s\S]*?)<\/a>/g)) {
      const slug = m[1];
      const name = m[2].match(/<h3[^>]*>([^<]+)<\/h3>/)?.[1]?.trim() || slug;
      if (!tools.has(slug)) tools.set(slug, { slug, name });
    }
  }
  let i = 0;
  for (const t of tools.values()) {
    i++;
    try {
      const md = await fetchText(`https://www.aiapps.com/items/${t.slug}/`, 'text/markdown');
      const website = md.match(/\*\*URL:\*\* (https?:\/\/[^\s]+)/i)?.[1]?.trim() || '';
      if (website) out.push({ name: t.name, website, sources: ['aiapps.com'], directoryUrl: `https://www.aiapps.com/items/${t.slug}/` });
    } catch { /* skip */ }
    await sleep(80);
  }
  console.log(`  aiapps.com categories: ${out.length} tools`);
  return out;
}

function dedupeCandidates(list) {
  const byDomain = new Map();
  for (const t of list) {
    const d = normDomain(t.website);
    if (!d) continue;
    const prev = byDomain.get(d);
    if (!prev) byDomain.set(d, t);
    else prev.sources = [...new Set([...(prev.sources || []), ...(t.sources || [])])];
  }
  return [...byDomain.values()];
}

// --- contact enrichment (same process as enrich-outreach-missing.mjs) ---

const CONTACT_PATHS = [
  '/contact', '/contact-us', '/contactus', '/contacts', '/get-in-touch', '/support',
  '/help', '/help-center', '/about', '/about-us', '/privacy', '/privacy-policy',
  '/terms', '/terms-of-service', '/legal', '/imprint', '/press', '/partners',
  '/advertise', '/business', '/faq', '/company', '/dmca', '/abuse',
];

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}/g;
const MAILTO_RE = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24})/gi;

function deobfuscate(text) {
  return text
    .replace(/\[\s*at\s*\]|\(\s*at\s*\)|\s+at\s+/gi, '@')
    .replace(/\[\s*dot\s*\]|\(\s*dot\s*\)|\s+dot\s+/gi, '.')
    .replace(/&#64;/g, '@').replace(/&#46;/g, '.');
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
  const domainMatch = siteDomain && (domain === siteDomain || domain.endsWith('.' + siteDomain) || domain.includes(root));
  const roleMatch = role.some((r) => local.startsWith(r) || local === r);
  if (!domainMatch && !roleMatch && siteDomain && root.length > 3 && !domain.includes(root)) return false;
  return true;
}

function extractEmails(html, siteDomain) {
  const raw = deobfuscate(html);
  const found = new Set();
  for (const m of raw.match(EMAIL_RE) || []) {
    if (isValidEmail(m, siteDomain)) found.add(m.toLowerCase().replace(/^u003e/, ''));
  }
  let mm;
  while ((mm = MAILTO_RE.exec(html))) {
    if (isValidEmail(mm[1], siteDomain)) found.add(mm[1].toLowerCase());
  }
  return [...found];
}

function rankEmails(emails, siteDomain) {
  const score = (e) => {
    const [, domain] = e.split('@');
    let s = 0;
    if (domain === siteDomain || domain.endsWith('.' + siteDomain)) s += 50;
    if (/^(support|contact|hello|info|help|business|sales|press|partners|team|admin)@/.test(e)) s += 30;
    return s;
  };
  return [...emails].sort((a, b) => score(b) - score(a)).slice(0, MAX_EMAILS);
}

async function resolveWebsite(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
    const u = new URL(res.url);
    return { origin: u.origin, domain: u.hostname.replace(/^www\./, ''), website: u.origin + '/' };
  } catch {
    try {
      const u = new URL(url);
      return { origin: u.origin, domain: u.hostname.replace(/^www\./, ''), website: u.origin + '/' };
    } catch {
      return { origin: '', domain: '', website: url };
    }
  }
}

async function deepContacts(websiteUrl, name) {
  const { origin, domain, website } = await resolveWebsite(websiteUrl);
  if (!origin) return { website: websiteUrl, contactPage: '', emails: [], telegram: [] };

  const emails = new Set();
  let contactPage = '';
  const visited = new Set();

  async function scan(url) {
    if (visited.has(url) || visited.size > 22) return;
    visited.add(url);
    try {
      const html = await fetchText(url);
      const found = extractEmails(html, domain);
      found.forEach((e) => emails.add(e));
      if (found.length && !contactPage) contactPage = url;
      if (/contact|support|help|about|privacy/i.test(url)) contactPage = contactPage || url;
      for (const m of html.matchAll(/href="(\/[^"]+)"/g)) {
        const link = origin + m[1].split('#')[0].split('?')[0];
        if (/contact|about|support|help|privacy|terms|legal|press|partner|advert|business|faq|abuse|dmca/i.test(link)) {
          await scan(link);
        }
      }
      await sleep(90);
    } catch { /* skip */ }
  }

  for (const p of CONTACT_PATHS) await scan(origin + p);
  await scan(origin);

  return {
    website,
    contactPage: contactPage || (emails.size ? origin + '/contact' : ''),
    emails: rankEmails(emails, domain),
    telegram: [],
  };
}

function patchHubToolsSection(html, tools) {
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const withEmail = tools.filter((t) => t.emails?.length).length;
  const featured = tools.filter((t) => t.featured).length;

  const rows = tools.map((t) => {
    const emails = t.emails?.length
      ? t.emails.map((e) => `<a href="mailto:${esc(e)}">${esc(e)}</a>`).join('<br>')
      : '<span class="muted">No email</span>';
    const contact = t.contactPage
      ? `<a href="${esc(t.contactPage)}" target="_blank" rel="noopener">Contact</a>`
      : t.website
        ? `<a href="${esc(t.website)}" target="_blank" rel="noopener">Website</a>`
        : '<span class="muted">-</span>';
    const feat = t.featured ? '<span class="badge featured">Yes</span>' : '<span class="badge">No</span>';
    const rec = t.recentlyAdded ? '<span class="badge recent">Yes</span>' : '<span class="badge">No</span>';
    const note = t.sidenote ? `<span class="note">${esc(t.sidenote)}</span>` : '<span class="muted">-</span>';
    const tg = t.telegram?.length
      ? t.telegram.map((x) => `<a href="${esc(x)}" target="_blank" rel="noopener">${esc(x)}</a>`).join('<br>')
      : '<span class="muted">-</span>';
    return `<tr class="row-tools" data-search="${esc((t.name + ' ' + (t.emails || []).join(' ')).toLowerCase())}"><td><strong>${esc(t.name)}</strong></td><td>${feat}</td><td>${rec}</td><td>${note}</td><td>${contact}</td><td>${emails}</td><td>${tg}</td></tr>`;
  }).join('\n');

  let out = html.replace(
    /<div class="stat"><strong>\d+<\/strong>AI tools to reach out<\/div>/,
    `<div class="stat"><strong>${tools.length}</strong>AI tools to reach out</div>`,
  );
  out = out.replace(/<h2>AI NSFW Tools to Reach Out \(\d+\)<\/h2>/, `<h2>AI NSFW Tools to Reach Out (${tools.length})</h2>`);
  out = out.replace(
    /<p class="sub">\d+ with email \| \d+ featured on aiapps \/ nsfw\.tools<\/p>/,
    `<p class="sub">${withEmail} with email | ${featured} featured on aiapps / nsfw.tools</p>`,
  );
  out = out.replace(
    /(<section id="tools"[\s\S]*?<tbody>)[\s\S]*?(<\/tbody>)/,
    `$1${rows}$2`,
  );
  out = out.replace(/\(Jul 30, 2026\)/, `(Aug 5, 2026)`);
  return out;
}

function writeCsv(tools) {
  const header = 'Name,Featured,Recently Added,Website,Contact Page,Email 1,Email 2,Email 3,Email 4,Telegram,Sources';
  const rows = tools.map((t) => {
    const e = t.emails || [];
    return [
      `"${(t.name || '').replace(/"/g, '""')}"`,
      t.featured ? 'Yes' : 'No',
      t.recentlyAdded ? 'Yes' : 'No',
      `"${(t.website || '').replace(/"/g, '""')}"`,
      `"${(t.contactPage || '').replace(/"/g, '""')}"`,
      ...Array.from({ length: MAX_EMAILS }, (_, i) => `"${(e[i] || '').replace(/"/g, '""')}"`),
      `"${(t.telegram || []).join('; ').replace(/"/g, '""')}"`,
      `"${(t.sources || []).join(', ').replace(/"/g, '""')}"`,
    ].join(',');
  });
  fs.writeFileSync(CSV_PATH, [header, ...rows].join('\n'));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('1/5 Loading exclusions...');
  const erogram = loadErogramExclusions();
  const existing = loadExistingOutreach();
  const outreachDomains = new Set(existing.map((t) => normDomain(t.website)).filter(Boolean));
  const outreachNames = new Set(existing.map((t) => normName(t.name)));
  for (const t of existing) {
    const r = domainRoot(normDomain(t.website));
    if (r.length > 3) outreachDomains.add(r);
  }
  console.log(`   Erogram: ${erogram.domains.size} domains | Outreach: ${existing.length} tools`);

  console.log('2/5 Scraping competitor directories...');
  const raw = [
    ...(await scrapeNsfwToolsVip()),
    ...(await scrapeAiPornWiki()),
    ...(await scrapeNsfwToolsShopify()),
    ...(await scrapeAiHaven()),
  ];
  let deduped = dedupeCandidates(raw);
  if (deduped.filter((t) => !isExcluded(t, erogram, outreachDomains, outreachNames)).length < TARGET) {
    raw.push(...(await scrapeAiAppsCategoryPages()));
  }
  deduped = dedupeCandidates(raw);
  console.log(`   Raw candidates: ${raw.length} | Unique domains: ${deduped.length}`);

  const newTools = [];
  for (const t of deduped) {
    if (isExcluded(t, erogram, outreachDomains, outreachNames)) continue;
    newTools.push({
      ...t,
      featured: false,
      recentlyAdded: false,
      sidenote: `Found on ${(t.sources || []).join(', ')}`,
      contactPage: '',
      emails: [],
      telegram: [],
      promotedOn: [],
    });
    if (newTools.length >= TARGET) break;
  }
  console.log(`   New tools to enrich: ${newTools.length} (target ${TARGET})`);
  if (newTools.length < TARGET) {
    console.warn(`   Warning: only found ${newTools.length} new tools (wanted ${TARGET})`);
  }

  console.log('3/5 Deep contact enrichment...');
  let done = 0;
  for (const tool of newTools) {
    done++;
    const c = await deepContacts(tool.website, tool.name);
    tool.website = c.website || tool.website;
    tool.contactPage = c.contactPage;
    tool.emails = c.emails;
    tool.telegram = c.telegram;
    process.stdout.write(`\r   ${done}/${newTools.length} ${tool.name.slice(0, 28).padEnd(28)} ${c.emails.length} emails`);
    await sleep(300);
  }
  console.log('\n');

  const merged = [...existing, ...newTools].sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(MERGED_JSON, JSON.stringify(merged, null, 2));
  fs.writeFileSync(NEW_JSON, JSON.stringify(newTools, null, 2));
  writeCsv(merged);

  console.log('4/5 Updating Research Hub HTML...');
  if (fs.existsSync(HUB_HTML)) {
    const html = fs.readFileSync(HUB_HTML, 'utf8');
    fs.writeFileSync(HUB_HTML, patchHubToolsSection(html, merged));
  }

  const withEmail = newTools.filter((t) => t.emails?.length).length;
  console.log('5/5 Done.');
  console.log(`   Added: ${newTools.length} | New batch with email: ${withEmail}/${newTools.length}`);
  console.log(`   Total outreach: ${merged.length} | Total with email: ${merged.filter((t) => t.emails?.length).length}`);
  console.log(`   JSON: ${MERGED_JSON}`);
  console.log(`   CSV:  ${CSV_PATH}`);
  console.log(`   Hub:  ${HUB_HTML}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
