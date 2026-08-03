#!/usr/bin/env node
/** Scrape contacts for nsfw.tools Best 2024 promoted tools (single page list only) */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(__dirname, '../tmp/nsfw-best-promoted-source.json');
const AIAPPS = path.join(__dirname, '../tmp/aiapps-nsfw-outreach.json');
const MERGED = path.join(__dirname, '../tmp/outreach-merged.json');
const OUT = path.join(__dirname, '../tmp/nsfw-best-promoted.json');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const MAX_EMAILS = 4;
const CONTACT_PATHS = [
  '/contact', '/contact-us', '/about', '/about-us', '/support', '/help', '/privacy', '/privacy-policy', '/terms',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    redirect: 'follow',
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.text();
}

const SKIP = new Set(['example.com', 'sentry.io', 'google.com', 'test.com']);

function extractEmails(html, siteDomain) {
  const found = new Set();
  const root = siteDomain.split('.')[0];
  for (const m of html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}/g) || []) {
    const lower = m.toLowerCase().replace(/^u003e/, '');
    const domain = lower.split('@')[1];
    if (!domain || SKIP.has(domain)) continue;
    if (lower.includes('noreply') || lower.includes('no-reply')) continue;
    const role = /^(support|contact|hello|info|help|sales|business|press|team|admin|privacy|legal|affiliate|marketing)@/.test(lower);
    if (!domain.includes(root) && !role) continue;
    found.add(lower);
  }
  for (const m of html.matchAll(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24})/gi)) {
    found.add(m[1].toLowerCase().replace(/^u003e/, ''));
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
      return { website: websiteUrl, contactPage: '', emails: [] };
    }
  }
  const emails = new Set();
  let contactPage = '';
  for (const p of ['', ...CONTACT_PATHS]) {
    try {
      const html = await fetchText(origin + p);
      extractEmails(html, domain).forEach((e) => emails.add(e));
      if (emails.size && !contactPage) contactPage = origin + p;
      await sleep(80);
    } catch { /* skip */ }
  }
  return { website: origin + '/', contactPage, emails: [...emails] };
}

function loadExistingEmails() {
  const map = new Map();
  for (const f of [AIAPPS, MERGED]) {
    if (!fs.existsSync(f)) continue;
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    const list = Array.isArray(data) ? data : data.new || [];
    for (const t of list) {
      const d = normDomain(t.website);
      if (d) map.set(d, t);
      map.set(normName(t.name), t);
    }
  }
  return map;
}

function findExisting(tool, existing) {
  const d = normDomain(tool.website);
  if (d && existing.has(d)) return existing.get(d);
  const n = normName(tool.name);
  if (existing.has(n)) return existing.get(n);
  if (n.includes('candy') || d === 'candy.ai') return existing.get('candyai');
  if (n.includes('celebmaker')) return existing.get('celebmakerai');
  if (n.includes('girlfriendgpt')) return existing.get('girlfriendgpt');
  if (n.includes('dreamcompanion') || d.includes('mydreamcompanion')) {
    for (const [k, v] of existing) if (typeof k === 'string' && k.includes('dreamcompanion')) return v;
  }
  if (n.includes('ourdream') || d.startsWith('ourdream')) {
    for (const [k, v] of existing) if (v.name === 'Our Dream') return v;
  }
  if (n.includes('deepundress')) return existing.get('deepundress');
  if (n.includes('mylovely')) return existing.get('mylovelyai');
  if (n === 'secretsai' || n === 'secrets') return existing.get('secretsai');
  return null;
}

async function main() {
  const source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  const existing = loadExistingEmails();
  const out = [];

  for (let i = 0; i < source.length; i++) {
    const t = { ...source[i], promotedOn: 'nsfw.tools Best 2024', contactPage: '', emails: [] };
    const match = findExisting(t, existing);
    if (match?.emails?.length) {
      t.emails = [...match.emails];
      t.contactPage = match.contactPage || '';
      // keep original website from source list
    } else {
      const c = await fetchContacts(t.website);
      t.website = c.website || t.website;
      t.contactPage = c.contactPage;
      t.emails = c.emails;
      await sleep(200);
    }
    out.push(t);
    process.stdout.write(`\r  ${i + 1}/${source.length} ${t.name.slice(0, 22).padEnd(22)} ${t.emails.length} emails`);
  }
  console.log('\n');
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`${out.filter((t) => t.emails.length).length}/${out.length} with email -> ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
