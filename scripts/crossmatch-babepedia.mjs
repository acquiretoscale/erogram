#!/usr/bin/env node
/**
 * Cross-match Erogram OnlyFans creators against babepedia.com/onlyfans/{username}
 * Run: node --env-file=.env.local scripts/crossmatch-babepedia.mjs
 */
import fs from 'fs';
import mongoose from 'mongoose';

const OUT = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : 'tmp/erogram-babepedia-crossmatch-v2.csv';
const PROGRESS = OUT.replace(/\.csv$/, '-progress.json');
const CONCURRENCY = 2;
const DELAY_MS = 1400;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseJina(text, username) {
  if (text.includes('RateLimitTriggeredError') || text.includes('"code":429')) {
    return { status: 429, listed: null };
  }
  const title = (text.match(/^Title:\s*(.+)$/m) || [])[1] || '';
  if (title.includes('Page Not Found') || text.includes('404: Not Found')) {
    return { status: 404, listed: false };
  }
  const listed = title.includes('OnlyFans profile') || /#\s+.+\(@/.test(text);
  if (!listed) return { status: 404, listed: false };

  const babeMatch = text.match(/check out ([^\n,]+?) on Babepedia/i);
  const fansMatch = text.match(/favorited\/liked by ([0-9,]+) fans/i);
  const paidMatch = text.match(/It costs \$(\d+(?:\.\d+)?)/i);
  const isFree = /Subscribe on OnlyFans for Free/i.test(text);

  return {
    status: 200,
    listed: true,
    babepediaOfUrl: `https://www.babepedia.com/onlyfans/${username}`,
    babepediaBabeName: babeMatch ? babeMatch[1].trim() : '',
    babepediaFans: fansMatch ? fansMatch[1].replace(/,/g, '') : '',
    babepediaPrice: isFree ? 0 : paidMatch ? Number(paidMatch[1]) : '',
  };
}

async function checkUsername(username) {
  const url = `https://r.jina.ai/https://www.babepedia.com/onlyfans/${encodeURIComponent(username)}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'text/plain' },
        signal: AbortSignal.timeout(60000),
      });
      const text = await res.text();
      const parsed = parseJina(text, username);
      if (parsed.status === 429) {
        const retry = Number((text.match(/"retryAfter":(\d+)/) || [])[1] || 4);
        await sleep(retry * 1000 + 500);
        continue;
      }
      return parsed;
    } catch (e) {
      if (attempt === 4) return { status: 0, listed: null, error: String(e.message || e) };
      await sleep(1500 * (attempt + 1));
    }
  }
  return { status: 0, listed: null, error: 'exhausted retries' };
}

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
const schema = new mongoose.Schema({}, { strict: false, collection: 'onlyfanscreators' });
const OnlyFansCreator = mongoose.model('BabeCrossMatch', schema);
const creators = await OnlyFansCreator.find({ deleted: { $ne: true } })
  .select('username name clicks categories isFree price')
  .sort({ clicks: -1, username: 1 })
  .lean();
await mongoose.disconnect();

const done = new Set();
let startIdx = 0;
if (fs.existsSync(PROGRESS)) {
  const prog = JSON.parse(fs.readFileSync(PROGRESS, 'utf8'));
  startIdx = prog.nextIdx || 0;
}
if (!fs.existsSync(OUT) || startIdx === 0) {
  fs.writeFileSync(
    OUT,
    'username,name,clicks,categories,isFree,price,listed,babepedia_of_url,babepedia_babe_name,babepedia_fans,babepedia_price,status\n',
  );
}

let idx = startIdx;
async function worker() {
  while (idx < creators.length) {
    const i = idx++;
    const c = creators[i];
    await sleep(DELAY_MS);
    const r = await checkUsername(c.username);
    const line = [
      c.username,
      `"${String(c.name || '').replace(/"/g, '""')}"`,
      c.clicks || 0,
      `"${(c.categories || []).join('; ').replace(/"/g, '""')}"`,
      !!c.isFree,
      c.price || 0,
      r.listed === true,
      r.babepediaOfUrl || '',
      `"${String(r.babepediaBabeName || '').replace(/"/g, '""')}"`,
      r.babepediaFans || '',
      r.babepediaPrice ?? '',
      r.status || 0,
    ].join(',') + '\n';
    fs.appendFileSync(OUT, line);
    done.add(c.username);
    if (done.size % 25 === 0) {
      const rows = fs.readFileSync(OUT, 'utf8').trim().split('\n').slice(1);
      const listed = rows.filter((l) => l.split(',')[6] === 'true').length;
      fs.writeFileSync(
        PROGRESS,
        JSON.stringify({ nextIdx: startIdx + done.size, doneCount: startIdx + done.size, total: creators.length, listed }),
      );
      process.stderr.write(`progress ${startIdx + done.size}/${creators.length} listed=${listed}\n`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const rows = fs.readFileSync(OUT, 'utf8').trim().split('\n').slice(1);
const listed = rows.filter((l) => l.split(',')[6] === 'true').length;
const summary = { complete: true, total: creators.length, rows: rows.length, listed, notListed: rows.filter((l) => l.split(',')[6] === 'false').length };
fs.writeFileSync(PROGRESS, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
