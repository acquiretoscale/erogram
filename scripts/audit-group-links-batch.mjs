/**
 * Read-only Telegram link audit. Default: oldest 75 public (non-vault) groups.
 *   node --env-file=.env.local scripts/audit-group-links-batch.mjs
 *   node --env-file=.env.local scripts/audit-group-links-batch.mjs --limit 75 --offset 0
 */
import { MongoClient } from 'mongodb';
import * as cheerio from 'cheerio';

const LIMIT = Number(process.argv.find((_, i, a) => a[i - 1] === '--limit') || 75);
const OFFSET = Number(process.argv.find((_, i, a) => a[i - 1] === '--offset') || 0);
const SLEEP_MS = 450;

const { MONGODB_URI } = process.env;
if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function checkLink(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
        Accept: 'text/html',
      },
      redirect: 'follow',
    });
    const html = await res.text();
    const lower = html.toLowerCase();
    const $ = cheerio.load(html);
    const extra = $('.tgme_page_extra').text().trim();

    if (res.status === 404) return { status: 'dead', hint: 'HTTP 404' };
    if (/invite link expired|link has expired|link is invalid|this invite link is no longer/i.test(html)) {
      return { status: 'dead', hint: 'expired invite' };
    }
    if (/sorry.*doesn.?t exist|if you have telegram/i.test(lower) && !extra && !html.includes('tgme_page_title')) {
      return { status: 'dead', hint: 'no page' };
    }
    if (/members|subscribers/i.test(extra)) return { status: 'ok', hint: extra.slice(0, 60) };
    if ($('.tgme_page_title').text().trim()) return { status: 'ok', hint: 'has title' };
    if (res.ok && html.includes('tgme_page')) return { status: 'ok', hint: 'tgme page' };
    if (!res.ok) return { status: 'unknown', hint: `HTTP ${res.status}` };
    return { status: 'unknown', hint: 'ambiguous' };
  } catch (e) {
    return { status: 'unknown', hint: e.message?.slice(0, 40) || 'error' };
  }
}

const client = new MongoClient(MONGODB_URI);
await client.connect();
const groups = client.db().collection('groups');
const base = { status: 'approved', isAdvertisement: { $ne: true }, premiumOnly: { $ne: true } };

const rows = await groups
  .find(base)
  .sort({ publishedAt: 1, createdAt: 1 })
  .skip(OFFSET)
  .limit(LIMIT)
  .project({ slug: 1, name: 1, telegramLink: 1, views: 1, createdAt: 1 })
  .toArray();

const out = [];
for (let i = 0; i < rows.length; i++) {
  const g = rows[i];
  const link = g.telegramLink || '';
  if (!link.startsWith('https://t.me/')) {
    out.push({ slug: g.slug, name: g.name, link, views: g.views || 0, status: 'skip', hint: 'bad url' });
    continue;
  }
  if (i > 0) await sleep(SLEEP_MS);
  const r = await checkLink(link);
  out.push({ slug: g.slug, name: g.name, link, views: g.views || 0, ...r });
  process.stderr.write(`${i + 1}/${rows.length} ${g.slug} ${r.status}\n`);
}

console.log(JSON.stringify({ offset: OFFSET, limit: LIMIT, rows: out }, null, 2));
await client.close();
