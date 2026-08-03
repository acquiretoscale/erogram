#!/usr/bin/env node
/** Deep contact enrichment for AI NSFW outreach list */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IN_PATH = path.join(__dirname, '../tmp/aiapps-nsfw-outreach.json');
const OUT_CSV = path.join(__dirname, '../tmp/aiapps-nsfw-outreach.csv');
const OUT_JSON = path.join(__dirname, '../tmp/aiapps-nsfw-outreach.json');
const DL_CSV = path.join(process.env.HOME, 'Downloads/aiapps-nsfw-outreach.csv');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const MAX_EMAILS = 4;
const CONCURRENCY = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SKIP_EMAIL_DOMAINS = new Set([
  'example.com', 'sentry.io', 'ingest.us.sentry.io', 'wixpress.com', 'email.com',
  'test.com', 'domain.com', 'yoursite.com', 'yourdomain.com', 'google.com',
  'googleapis.com', 'gstatic.com', 'cloudflare.com', 'w3.org', 'schema.org',
  'facebook.com', 'twitter.com', 'instagram.com', 'youtube.com', 'linkedin.com',
  'apple.com', 'microsoft.com', 'amazonaws.com', 'jsdelivr.net', 'npmjs.org',
]);

const SKIP_LOCAL = new Set(['u003e', 'your', 'your-paypal', 'myemail', 'session-client']);

const CONTACT_PATHS = [
  '/contact', '/contact-us', '/contactus', '/contacts', '/get-in-touch',
  '/about', '/about-us', '/support', '/help', '/help-center', '/customer-support',
  '/privacy', '/privacy-policy', '/terms', '/terms-of-service', '/legal',
  '/imprint', '/impressum', '/press', '/partners', '/advertise', '/advertising',
  '/business', '/affiliates', '/faq', '/company',
];

async function fetchText(url, accept = 'text/html') {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: accept },
    redirect: 'follow',
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.text();
}

async function resolveWebsite(url) {
  if (!url) return { finalUrl: '', origin: '', domain: '' };
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });
    const final = res.url || url;
    const u = new URL(final);
    return { finalUrl: u.origin + '/', origin: u.origin, domain: u.hostname.replace(/^www\./, '') };
  } catch {
    try {
      const u = new URL(url);
      return { finalUrl: u.origin + '/', origin: u.origin, domain: u.hostname.replace(/^www\./, '') };
    } catch {
      return { finalUrl: '', origin: '', domain: '' };
    }
  }
}

function deobfuscateEmailText(text) {
  return text
    .replace(/\[\s*at\s*\]|\(\s*at\s*\)|\s+at\s+/gi, '@')
    .replace(/\[\s*dot\s*\]|\(\s*dot\s*\)|\s+dot\s+/gi, '.')
    .replace(/&#64;/g, '@')
    .replace(/&#46;/g, '.');
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}/g;
const MAILTO_RE = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24})/gi;
const TG_RE = /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([a-zA-Z0-9_+/-]+)/gi;

function isValidEmail(email, siteDomain) {
  const lower = email.toLowerCase().replace(/^u003e/, '').trim();
  if (!lower.includes('@') || lower.length > 80) return false;
  const [local, domain] = lower.split('@');
  if (!local || !domain || domain.includes('2f') || domain.includes('3d')) return false;
  if (SKIP_EMAIL_DOMAINS.has(domain)) return false;
  if ([...SKIP_LOCAL].some((s) => local.startsWith(s))) return false;
  if (local.includes('noreply') || local.includes('no-reply') || local.includes('donotreply')) return false;
  if (/\.(png|jpg|webp|svg|js|css|woff)$/.test(lower)) return false;
  if (domain.endsWith('.js') || domain.includes('sentry')) return false;
  // prefer site-related but allow business emails on other domains if clearly contact roles
  const role = ['support', 'contact', 'hello', 'info', 'help', 'sales', 'business', 'press', 'partners', 'team', 'admin', 'billing', 'legal', 'privacy', 'affiliate', 'ads', 'marketing', 'careers'];
  const domainMatch = siteDomain && (domain === siteDomain || domain.endsWith('.' + siteDomain) || siteDomain.endsWith(domain));
  const roleMatch = role.some((r) => local.startsWith(r) || local === r);
  if (!domainMatch && !roleMatch && !domain.includes(siteDomain?.split('.').slice(-2).join('.'))) {
    // still allow if domain looks like the brand
    if (siteDomain && !domain.includes(siteDomain.split('.')[0])) return false;
  }
  return true;
}

function extractEmails(html, siteDomain) {
  const raw = deobfuscateEmailText(html);
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

function extractTelegram(html) {
  const skip = new Set(['context', 'graph', 'media', 'keyframes', 'container', 'import', 'charset', 'share']);
  const out = new Set();
  let m;
  while ((m = TG_RE.exec(html))) {
    const h = m[1].split('/')[0].split('?')[0];
    if (h && h.length > 2 && !skip.has(h.toLowerCase()) && !h.startsWith('+')) {
      out.add(`https://t.me/${h}`);
    }
  }
  return [...out];
}

function findInternalLinks(html, origin) {
  const links = new Set();
  const re = /href=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    let href = m[1];
    if (href.startsWith('/')) href = origin + href;
    if (!href.startsWith(origin)) continue;
    const low = href.toLowerCase();
    if (/contact|about|support|help|privacy|terms|legal|press|partner|advert|business|imprint|company|faq/.test(low)) {
      links.add(href.split('#')[0].split('?')[0]);
    }
  }
  return [...links];
}

function rankEmails(emails, siteDomain) {
  const priority = (e) => {
    const [local, domain] = e.split('@');
    let score = 0;
    if (domain === siteDomain || domain.endsWith('.' + siteDomain)) score += 50;
    if (/^(support|contact|hello|info|help|business|sales|press|partners|team|admin|affiliate|ads|marketing)@/.test(e)) score += 30;
    if (domain.includes(siteDomain?.split('.')[0] || '___')) score += 10;
    return score;
  };
  return [...emails].sort((a, b) => priority(b) - priority(a)).slice(0, MAX_EMAILS);
}

async function searchWebEmails(domain, name) {
  const found = new Set();
  const queries = [
    `"${domain}" contact email`,
    `"${domain}" support@ OR contact@ OR hello@`,
    `${name} ${domain} email contact`,
  ];
  for (const q of queries) {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
      const html = await fetchText(url);
      for (const e of extractEmails(html, domain)) found.add(e);
      if (found.size >= MAX_EMAILS) break;
      await sleep(1200);
    } catch {
      /* skip */
    }
  }
  return [...found];
}

async function searchSocialLinks(domain) {
  const urls = [];
  try {
    const html = await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(`site:${domain} telegram OR twitter OR linktree`)}`);
    const linkRe = /uddg=([^&"]+)/g;
    let m;
    while ((m = linkRe.exec(html))) {
      try {
        const u = decodeURIComponent(m[1]);
        if (/twitter\.com|x\.com|t\.me|telegram|linktr\.ee|instagram\.com|linkedin\.com/.test(u)) urls.push(u);
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return [...new Set(urls)].slice(0, 5);
}

async function deepContacts(websiteUrl, name) {
  const { origin, domain } = await resolveWebsite(websiteUrl);
  if (!origin) return { contactPage: '', emails: [], telegram: [], website: '' };

  const emails = new Set();
  const telegram = new Set();
  let contactPage = '';
  const visited = new Set();

  async function scanPage(url) {
    if (visited.has(url) || visited.size > 25) return;
    visited.add(url);
    try {
      const html = await fetchText(url);
      const found = extractEmails(html, domain);
      const tg = extractTelegram(html);
      found.forEach((e) => emails.add(e));
      tg.forEach((t) => telegram.add(t));
      if (found.length && !contactPage) contactPage = url;
      if (/contact|support|help|about|get-in-touch/i.test(url) && !contactPage) contactPage = url;

      for (const link of findInternalLinks(html, origin)) {
        if (!visited.has(link)) await scanPage(link);
      }
      await sleep(100);
    } catch { /* skip */ }
  }

  for (const p of CONTACT_PATHS) {
    await scanPage(origin + p);
  }
  await scanPage(origin);

  // social / link pages from web search
  if (emails.size < MAX_EMAILS) {
    const socials = await searchSocialLinks(domain);
    for (const s of socials) {
      try {
        const html = await fetchText(s);
        extractEmails(html, domain).forEach((e) => emails.add(e));
        extractTelegram(html).forEach((t) => telegram.add(t));
        if (extractEmails(html, domain).length && !contactPage) contactPage = s;
      } catch { /* skip */ }
    }
  }

  // web search fallback
  if (emails.size < MAX_EMAILS) {
    const web = await searchWebEmails(domain, name);
    web.forEach((e) => emails.add(e));
  }

  if (!contactPage && emails.size) contactPage = origin + '/contact';

  return {
    website: origin,
    contactPage,
    emails: rankEmails(emails, domain),
    telegram: [...telegram].slice(0, 3),
  };
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
  let list = JSON.parse(fs.readFileSync(IN_PATH, 'utf8'));
  // dedupe by slug
  const seen = new Map();
  for (const t of list) {
    if (!seen.has(t.slug)) seen.set(t.slug, t);
  }
  list = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));

  console.log(`Deep contact scan for ${list.length} tools...`);
  let done = 0;

  await poolMap(
    list,
    async (tool) => {
      const c = await deepContacts(tool.website, tool.name);
      tool.website = c.website || tool.website;
      tool.contactPage = c.contactPage;
      tool.emails = c.emails;
      tool.telegram = c.telegram;
      done++;
      const eCount = c.emails.length;
      process.stdout.write(`\r  ${done}/${list.length} | ${tool.name.slice(0, 30).padEnd(30)} | ${eCount} emails`);
    },
    CONCURRENCY
  );

  console.log('\n');

  const header = 'Name,Featured,Website,Contact Page,Email 1,Email 2,Email 3,Email 4,Telegram';
  const rows = list.map((t) => {
    const e = Array.isArray(t.emails) ? t.emails : (t.emails || '').split('; ').filter(Boolean);
    return [
      `"${(t.name || '').replace(/"/g, '""')}"`,
      t.featured ? 'FEATURED' : 'NON-FEATURED',
      `"${(t.website || '').replace(/"/g, '""')}"`,
      `"${(t.contactPage || '').replace(/"/g, '""')}"`,
      ...Array.from({ length: MAX_EMAILS }, (_, i) => `"${(e[i] || '').replace(/"/g, '""')}"`),
      `"${(Array.isArray(t.telegram) ? t.telegram : (t.telegram || '').split('; ')).filter(Boolean).join('; ').replace(/"/g, '""')}"`,
    ].join(',');
  });

  fs.writeFileSync(OUT_CSV, [header, ...rows].join('\n'));
  fs.writeFileSync(OUT_JSON, JSON.stringify(list, null, 2));
  fs.copyFileSync(OUT_CSV, DL_CSV);

  const withEmail = list.filter((t) => (t.emails?.length || 0) > 0).length;
  const multi = list.filter((t) => (t.emails?.length || 0) >= 2).length;
  console.log(`Done. With email: ${withEmail}/${list.length} | 2+ emails: ${multi}`);
  console.log(`CSV: ${OUT_CSV}`);
  console.log(`Downloads: ${DL_CSV}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
