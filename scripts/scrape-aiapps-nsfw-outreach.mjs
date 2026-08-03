#!/usr/bin/env node
/**
 * Scrape AIapps AI NSFW category for outreach list.
 * Output: tmp/aiapps-nsfw-outreach.csv + .json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../tmp');
const CSV_PATH = path.join(OUT_DIR, 'aiapps-nsfw-outreach.csv');
const JSON_PATH = path.join(OUT_DIR, 'aiapps-nsfw-outreach.json');

const UA = 'Mozilla/5.0 (compatible; ErogramOutreach/1.0)';
const CONCURRENCY = 8;
const DELAY_MS = 120;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, accept = 'text/html') {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: accept },
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function isAiNsfwMarkdown(md) {
  const sub = md.match(/\*\*Subcategories:\*\* ([^\n]+)/i)?.[1] || '';
  const cat = md.match(/\*\*Category:\*\* ([^\n]+)/i)?.[1]?.trim() || '';
  return sub.includes('AI NSFW') || cat === 'AI NSFW';
}

function parseCategoryPage(html) {
  const map = new Map();
  const linkRe = /<a href="\/items\/([^"]+)\/">([\s\S]*?)<\/a>/g;
  let m;
  while ((m = linkRe.exec(html))) {
    const slug = m[1];
    const block = m[2];
    const nameMatch = block.match(/<h3[^>]*>([^<]+)<\/h3>/);
    const featured = block.includes('Featured</div>');
    if (!map.has(slug)) {
      map.set(slug, {
        slug,
        name: nameMatch ? nameMatch[1].trim() : slug,
        featured,
        aiappsUrl: `https://www.aiapps.com/items/${slug}/`,
        website: '',
        emails: '',
        telegram: '',
        contactPage: '',
      });
    } else if (featured) {
      map.get(slug).featured = true;
    }
  }
  return map;
}

function parseItemMarkdown(md, slug) {
  if (!isAiNsfwMarkdown(md)) return null;
  const name = md.match(/^# (.+)/m)?.[1]?.trim() || slug;
  const featured = /\*\*Featured:\*\* yes/i.test(md);
  const website = md.match(/\*\*URL:\*\* (https?:\/\/[^\s]+)/i)?.[1]?.trim() || '';
  return { slug, name, featured, website, aiappsUrl: `https://www.aiapps.com/items/${slug}/` };
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const TG_HANDLE_RE = /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([a-zA-Z0-9_+/]+)/g;

const SKIP_EMAIL_DOMAINS = new Set([
  'example.com', 'sentry.io', 'wixpress.com', 'gmail.com', 'email.com',
  'ccbill.com', 'google.com', 'cloudflare.com', 'w3.org', 'schema.org',
]);

const SKIP_TG = new Set(['context', 'graph', 'media', 'keyframes', 'container', 'import', 'charset']);

function cleanEmails(raw) {
  const out = new Set();
  for (const e of raw || []) {
    const lower = e.toLowerCase().replace(/^u003e/, '');
    const domain = lower.split('@')[1];
    if (!domain || SKIP_EMAIL_DOMAINS.has(domain)) continue;
    if (lower.includes('noreply') || lower.includes('no-reply') || lower.includes('your@')) continue;
    if (/\.(png|jpg|webp|svg)$/.test(lower)) continue;
    out.add(lower);
  }
  return [...out];
}

function cleanTelegram(html) {
  const out = new Set();
  let m;
  while ((m = TG_HANDLE_RE.exec(html))) {
    const handle = m[1].split('/')[0].split('?')[0];
    if (handle && handle.length > 2 && !SKIP_TG.has(handle.toLowerCase())) {
      out.add(`https://t.me/${handle}`);
    }
  }
  return [...out];
}

async function fetchContactsFromSite(websiteUrl) {
  if (!websiteUrl) return { emails: [], telegram: [], contactPage: '' };
  let base;
  try {
    base = new URL(websiteUrl);
  } catch {
    return { emails: [], telegram: [], contactPage: '' };
  }
  const origin = base.origin;
  const paths = ['/', '/contact', '/contact-us', '/about', '/support'];
  const emails = new Set();
  const telegram = new Set();
  let contactPage = '';

  for (const p of paths) {
    const url = origin + p;
    try {
      const html = await fetchText(url);
      cleanEmails(html.match(EMAIL_RE)).forEach((e) => emails.add(e));
      cleanTelegram(html).forEach((t) => telegram.add(t));
      if ((emails.size || telegram.size) && !contactPage) contactPage = url;
      await sleep(80);
    } catch {
      /* skip */
    }
  }
  return { emails: [...emails], telegram: [...telegram], contactPage };
}

async function poolMap(items, fn, concurrency) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
      await sleep(DELAY_MS);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

async function getSitemapSlugs() {
  const xml = await fetchText('https://www.aiapps.com/sitemap.xml');
  return [...new Set([...xml.matchAll(/<loc>https:\/\/www\.aiapps\.com\/items\/([^<]+)\/<\/loc>/g)].map((m) => m[1]))];
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('1/3 Collecting tools from category pages...');
  const tools = new Map();

  const pages = [
    'https://www.aiapps.com/categories/ai-nsfw/',
    'https://www.aiapps.com/categories/ai-nsfw/for/content-creators/',
  ];

  for (const url of pages) {
    const html = await fetchText(url);
    for (const [slug, t] of parseCategoryPage(html)) {
      if (!tools.has(slug)) tools.set(slug, t);
      else if (t.featured) tools.get(slug).featured = true;
    }
  }

  console.log(`   Listing pages: ${tools.size} tools`);

  // Fill gaps via sitemap markdown scan (strict AI NSFW tag only)
  if (tools.size < 90) {
    console.log('   Scanning sitemap for more AI NSFW tagged items...');
    const slugs = (await getSitemapSlugs()).filter((s) => !tools.has(s));
    let found = 0;
    await poolMap(
      slugs,
      async (slug) => {
        try {
          const md = await fetchText(`https://www.aiapps.com/items/${slug}/`, 'text/markdown');
          const t = parseItemMarkdown(md, slug);
          if (t) {
            tools.set(slug, { ...t, emails: '', telegram: '', contactPage: '' });
            found++;
          }
        } catch {
          /* skip */
        }
      },
      CONCURRENCY
    );
    console.log(`   Sitemap added ${found} more (total ${tools.size})`);
  }

  const list = [...tools.values()].sort((a, b) => a.name.localeCompare(b.name));

  console.log('2/3 Enriching from AIapps item pages...');
  await poolMap(
    list,
    async (tool) => {
      try {
        const md = await fetchText(tool.aiappsUrl, 'text/markdown');
        const parsed = parseItemMarkdown(md, tool.slug);
        if (parsed) {
          tool.name = parsed.name;
          tool.featured = parsed.featured;
          tool.website = parsed.website;
        }
      } catch {
        /* keep listing data */
      }
    },
    CONCURRENCY
  );

  console.log('3/3 Fetching website contacts...');
  await poolMap(
    list,
    async (tool) => {
      const c = await fetchContactsFromSite(tool.website);
      tool.emails = c.emails.join('; ');
      tool.telegram = c.telegram.join('; ');
      tool.contactPage = c.contactPage;
    },
    4
  );

  const header = 'Name,Featured,Website,AIapps URL,Emails,Telegram,Contact Page';
  const rows = list.map((t) =>
    [
      `"${(t.name || '').replace(/"/g, '""')}"`,
      t.featured ? 'FEATURED' : 'NON-FEATURED',
      `"${(t.website || '').replace(/"/g, '""')}"`,
      `"${t.aiappsUrl}"`,
      `"${(t.emails || '').replace(/"/g, '""')}"`,
      `"${(t.telegram || '').replace(/"/g, '""')}"`,
      `"${(t.contactPage || '').replace(/"/g, '""')}"`,
    ].join(',')
  );

  fs.writeFileSync(CSV_PATH, [header, ...rows].join('\n'));
  fs.writeFileSync(JSON_PATH, JSON.stringify(list, null, 2));

  console.log('\nDone.');
  console.log(`Tools: ${list.length}`);
  console.log(`Featured: ${list.filter((t) => t.featured).length}`);
  console.log(`With email: ${list.filter((t) => t.emails).length}`);
  console.log(`With Telegram: ${list.filter((t) => t.telegram).length}`);
  console.log(`CSV: ${CSV_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
