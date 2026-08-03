#!/usr/bin/env node
/** Deep email hunt for outreach tools still missing contacts */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MERGED = path.join(__dirname, '../tmp/outreach-merged.json');
const AIAPPS = path.join(__dirname, '../tmp/aiapps-nsfw-outreach.json');
const RECENT = path.join(__dirname, '../tmp/nsfw-recent-outreach.json');
const BEST = path.join(__dirname, '../tmp/nsfw-best-promoted.json');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const MAX_EMAILS = 4;
const CONCURRENCY = 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SKIP_EMAIL_DOMAINS = new Set([
  'example.com', 'sentry.io', 'wixpress.com', 'email.com', 'test.com', 'google.com',
  'facebook.com', 'twitter.com', 'instagram.com', 'youtube.com', 'linkedin.com',
  'apple.com', 'microsoft.com', 'cloudflare.com', 'duckduckgo.com', 'w3.org',
]);

const CONTACT_PATHS = [
  '/contact', '/contact-us', '/contactus', '/contacts', '/get-in-touch', '/support',
  '/help', '/help-center', '/about', '/about-us', '/privacy', '/privacy-policy',
  '/terms', '/terms-of-service', '/legal', '/imprint', '/impressum', '/press',
  '/partners', '/advertise', '/advertising', '/business', '/affiliates', '/faq', '/company',
  '/dmca', '/abuse', '/feedback', '/careers', '/billing',
];

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}/g;
const MAILTO_RE = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24})/gi;

function deobfuscate(text) {
  return text
    .replace(/\[\s*at\s*\]|\(\s*at\s\)|\s+at\s+/gi, '@')
    .replace(/\[\s*dot\s*\]|\(\s*dot\s\)|\s+dot\s+/gi, '.')
    .replace(/&#64;/g, '@')
    .replace(/&#46;/g, '.')
    .replace(/(\w)\s*\(\s*at\s*\)\s*(\w)/gi, '$1@$2');
}

function normDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function normName(n) {
  return n.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isValidEmail(email, siteDomain) {
  const lower = email.toLowerCase().replace(/^u003e|^mailto:/, '').trim();
  if (!lower.includes('@') || lower.length > 80) return false;
  const [local, domain] = lower.split('@');
  if (!local || !domain || SKIP_EMAIL_DOMAINS.has(domain)) return false;
  if (local.includes('noreply') || local.includes('no-reply') || local.includes('donotreply')) return false;
  if (/\.(png|jpg|webp|svg|js|css|woff)$/.test(lower)) return false;
  const role = ['support', 'contact', 'hello', 'info', 'help', 'sales', 'business', 'press', 'partners', 'team', 'admin', 'billing', 'legal', 'privacy', 'affiliate', 'ads', 'marketing', 'abuse', 'feedback', 'careers', 'dmca', 'compliance'];
  const root = siteDomain?.split('.')[0] || '';
  const domainMatch = siteDomain && (domain === siteDomain || domain.endsWith('.' + siteDomain) || domain.includes(root));
  const roleMatch = role.some((r) => local.startsWith(r) || local === r);
  if (!domainMatch && !roleMatch) {
    if (siteDomain && root.length > 3 && !domain.includes(root)) return false;
  }
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

function findInternalLinks(html, origin) {
  const links = new Set();
  for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
    let href = m[1];
    if (href.startsWith('/')) href = origin + href;
    if (!href.startsWith(origin)) continue;
    if (/contact|about|support|help|privacy|terms|legal|press|partner|advert|business|imprint|company|faq|abuse|dmca|feedback/i.test(href)) {
      links.add(href.split('#')[0].split('?')[0]);
    }
  }
  return [...links];
}

function rankEmails(emails, siteDomain) {
  const score = (e) => {
    const [local, domain] = e.split('@');
    let s = 0;
    if (domain === siteDomain || domain.endsWith('.' + siteDomain)) s += 50;
    if (/^(support|contact|hello|info|help|business|sales|press|partners|team|admin|affiliate|ads|marketing)@/.test(e)) s += 30;
    if (domain.includes(siteDomain?.split('.')[0] || '___')) s += 10;
    if (/^(abuse|dmca|privacy|legal)@/.test(e)) s += 5;
    return s;
  };
  return [...emails].sort((a, b) => score(b) - score(a)).slice(0, MAX_EMAILS);
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    redirect: 'follow',
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.text();
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

async function searchWebEmails(domain, name) {
  const found = new Set();
  const queries = [
    `"${domain}" contact email`,
    `"${domain}" support@ OR contact@ OR hello@ OR info@`,
    `"${name}" "${domain}" email`,
    `site:${domain} email contact support`,
  ];
  for (const q of queries) {
    try {
      const html = await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`);
      extractEmails(html, domain).forEach((e) => found.add(e));
      if (found.size >= MAX_EMAILS) break;
      await sleep(1500);
    } catch { /* skip */ }
  }
  return [...found];
}

async function searchSocialLinks(domain) {
  const urls = [];
  try {
    const html = await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(`site:${domain} linktree OR telegram OR contact`)}`);
    for (const m of html.matchAll(/uddg=([^&"]+)/g)) {
      try {
        const u = decodeURIComponent(m[1]);
        if (/linktr\.ee|t\.me|telegram|twitter\.com|x\.com|instagram\.com|linkedin\.com|facebook\.com/.test(u)) urls.push(u);
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return [...new Set(urls)].slice(0, 6);
}

async function deepContacts(websiteUrl, name) {
  const { origin, domain, website } = await resolveWebsite(websiteUrl);
  if (!origin) return { website: websiteUrl, contactPage: '', emails: [], telegram: [] };

  const emails = new Set();
  const visited = new Set();
  let contactPage = '';

  async function scan(url) {
    if (visited.has(url) || visited.size > 30) return;
    visited.add(url);
    try {
      const html = await fetchText(url);
      const found = extractEmails(html, domain);
      found.forEach((e) => emails.add(e));
      if (found.length && !contactPage) contactPage = url;
      if (/contact|support|help|about|feedback/i.test(url)) contactPage = contactPage || url;
      for (const link of findInternalLinks(html, origin)) await scan(link);
      await sleep(120);
    } catch { /* skip */ }
  }

  for (const p of CONTACT_PATHS) await scan(origin + p);
  await scan(origin);

  if (emails.size < MAX_EMAILS) {
    for (const s of await searchSocialLinks(domain)) {
      try {
        const html = await fetchText(s);
        extractEmails(html, domain).forEach((e) => emails.add(e));
        if (extractEmails(html, domain).length && !contactPage) contactPage = s;
      } catch { /* skip */ }
    }
  }

  if (emails.size < MAX_EMAILS) {
    const web = await searchWebEmails(domain, name);
    web.forEach((e) => emails.add(e));
  }

  return {
    website,
    contactPage: contactPage || (emails.size ? origin + '/contact' : ''),
    emails: rankEmails(emails, domain),
  };
}

function patchSources(tool) {
  const d = normDomain(tool.website);
  const n = normName(tool.name);
  for (const file of [AIAPPS, RECENT, BEST]) {
    if (!fs.existsSync(file)) continue;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const list = Array.isArray(data) ? data : data.new || [];
    let changed = false;
    for (const t of list) {
      if (normDomain(t.website) === d || normName(t.name) === n) {
        if (tool.emails?.length) t.emails = tool.emails;
        if (tool.contactPage) t.contactPage = tool.contactPage;
        if (tool.website) t.website = tool.website;
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(file, JSON.stringify(Array.isArray(data) ? list : { ...data, new: list }, null, 2));
    }
  }
}

async function poolMap(items, fn, n) {
  const out = new Array(items.length);
  let i = 0;
  async function w() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: n }, w));
  return out;
}

async function main() {
  const tools = JSON.parse(fs.readFileSync(MERGED, 'utf8'));
  const missing = tools.filter((t) => !t.emails?.length);
  console.log(`Deep hunt for ${missing.length} tools missing email...`);

  let found = 0;
  await poolMap(
    missing,
    async (tool, idx) => {
      const c = await deepContacts(tool.website, tool.name);
      if (c.website) tool.website = c.website;
      if (c.contactPage) tool.contactPage = c.contactPage;
      if (c.emails.length) {
        tool.emails = c.emails;
        found++;
        patchSources(tool);
      }
      process.stdout.write(`\r  ${idx + 1}/${missing.length} ${tool.name.slice(0, 28).padEnd(28)} ${c.emails.length} emails`);
      await sleep(400);
      return tool;
    },
    CONCURRENCY,
  );
  console.log('\n');

  fs.writeFileSync(MERGED, JSON.stringify(tools, null, 2));
  console.log(`Found emails for ${found}/${missing.length} previously missing`);
  console.log(`Total with email: ${tools.filter((t) => t.emails?.length).length}/${tools.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
