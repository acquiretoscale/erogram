#!/usr/bin/env node
/** Deep email scrape for recently-added + best-promoted tools missing contacts */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RECENT = path.join(__dirname, '../tmp/nsfw-recent-outreach.json');
const BEST = path.join(__dirname, '../tmp/nsfw-best-promoted.json');
const AIAPPS = path.join(__dirname, '../tmp/aiapps-nsfw-outreach.json');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const MAX_EMAILS = 4;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CONTACT_PATHS = [
  '/contact', '/contact-us', '/contactus', '/about', '/about-us', '/support', '/help',
  '/help-center', '/privacy', '/privacy-policy', '/terms', '/legal', '/imprint', '/press',
  '/partners', '/advertise', '/business', '/affiliates', '/faq', '/company',
];

const SKIP_DOMAINS = new Set([
  'example.com', 'sentry.io', 'google.com', 'test.com', 'wixpress.com', 'cloudflare.com',
]);

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

function deobfuscate(text) {
  return text.replace(/\[\s*at\s*\]/gi, '@').replace(/\[\s*dot\s*\]/gi, '.').replace(/&#64;/g, '@');
}

function extractEmails(html, siteDomain) {
  const found = new Set();
  const raw = deobfuscate(html);
  const root = siteDomain.split('.')[0];
  for (const m of raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}/g) || []) {
    const lower = m.toLowerCase().replace(/^u003e/, '');
    const domain = lower.split('@')[1];
    if (!domain || SKIP_DOMAINS.has(domain)) continue;
    if (lower.includes('noreply') || lower.includes('no-reply')) continue;
    const role = /^(support|contact|hello|info|help|sales|business|press|team|admin|privacy|legal|affiliate|marketing|feedback|careers|billing)@/.test(lower);
    if (!domain.includes(root) && !role) continue;
    found.add(lower);
  }
  for (const m of html.matchAll(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24})/gi)) {
    found.add(m[1].toLowerCase().replace(/^u003e/, ''));
  }
  return [...found];
}

function findInternalLinks(html, origin) {
  const links = new Set();
  for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
    let href = m[1];
    if (href.startsWith('/')) href = origin + href;
    if (!href.startsWith(origin)) continue;
    if (/contact|about|support|help|privacy|terms|legal|press|partner|advert|business|faq|company/i.test(href)) {
      links.add(href.split('#')[0].split('?')[0]);
    }
  }
  return [...links];
}

async function searchWebEmails(domain, name) {
  const found = new Set();
  const q = `"${domain}" support@ OR contact@ OR hello@ OR info@`;
  try {
    const html = await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`);
    extractEmails(html, domain).forEach((e) => found.add(e));
    await sleep(1200);
  } catch { /* skip */ }
  try {
    const html = await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(`${name} ${domain} contact email`)}`);
    extractEmails(html, domain).forEach((e) => found.add(e));
  } catch { /* skip */ }
  return [...found];
}

async function deepContacts(websiteUrl, name) {
  const { origin, domain, website } = await resolveWebsite(websiteUrl);
  if (!origin) return { website: websiteUrl, contactPage: '', emails: [] };

  const emails = new Set();
  let contactPage = '';
  const visited = new Set();

  async function scan(url) {
    if (visited.has(url) || visited.size > 20) return;
    visited.add(url);
    try {
      const html = await fetchText(url);
      const found = extractEmails(html, domain);
      found.forEach((e) => emails.add(e));
      if (found.length && !contactPage) contactPage = url;
      if (/contact|support|help|about/i.test(url)) contactPage = contactPage || url;
      for (const link of findInternalLinks(html, origin)) await scan(link);
      await sleep(100);
    } catch { /* skip */ }
  }

  for (const p of CONTACT_PATHS) await scan(origin + p);
  await scan(origin);

  if (emails.size < MAX_EMAILS) {
    const web = await searchWebEmails(domain, name);
    web.forEach((e) => emails.add(e));
  }

  return {
    website,
    contactPage: contactPage || (emails.size ? origin + '/contact' : ''),
    emails: [...emails].slice(0, MAX_EMAILS),
  };
}

function normDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

async function enrichList(list) {
  const todo = list.filter((t) => !t.emails?.length);
  console.log(`Deep scrape ${todo.length}/${list.length} missing emails...`);
  let i = 0;
  for (const t of todo) {
    i++;
    const c = await deepContacts(t.website, t.name);
    t.website = c.website || t.website;
    if (c.contactPage) t.contactPage = c.contactPage;
    if (c.emails.length) t.emails = c.emails;
    process.stdout.write(`\r  ${i}/${todo.length} ${t.name.slice(0, 28).padEnd(28)} ${t.emails.length} emails`);
    await sleep(300);
  }
  console.log('\n');
}

async function patchAiapps(domain, emails, contactPage) {
  if (!fs.existsSync(AIAPPS) || !emails.length) return;
  const list = JSON.parse(fs.readFileSync(AIAPPS, 'utf8'));
  for (const t of list) {
    if (normDomain(t.website) === domain) {
      if (!t.emails?.length) t.emails = emails;
      if (!t.contactPage && contactPage) t.contactPage = contactPage;
    }
  }
  fs.writeFileSync(AIAPPS, JSON.stringify(list, null, 2));
}

async function main() {
  const recent = JSON.parse(fs.readFileSync(RECENT, 'utf8'));
  const best = JSON.parse(fs.readFileSync(BEST, 'utf8'));

  await enrichList(recent);
  await enrichList(best);

  fs.writeFileSync(RECENT, JSON.stringify(recent, null, 2));
  fs.writeFileSync(BEST, JSON.stringify(best, null, 2));

  const secrets = recent.find((t) => t.name.includes('Secrets'));
  if (secrets?.emails?.length) await patchAiapps('secrets.ai', secrets.emails, secrets.contactPage);

  console.log(`Recent: ${recent.filter((t) => t.emails.length).length}/${recent.length} with email`);
  console.log(`Best: ${best.filter((t) => t.emails.length).length}/${best.length} with email`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
