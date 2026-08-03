#!/usr/bin/env node
/**
 * Cross-match Erogram creators vs ranking.bio and find link gaps.
 * Run: node --env-file=.env.local scripts/crossmatch-rankingbio.mjs --offset 0 --limit 1000
 */
import fs from 'fs';
import https from 'https';
import mongoose from 'mongoose';

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
}

const OFFSET = Number(arg('offset', '0'));
const LIMIT = Number(arg('limit', '1000'));
const BATCH = String(Math.floor(OFFSET / LIMIT) + 1).padStart(3, '0');
const OUT_DIR = 'tmp/rankingbio';
const CHECK_CSV = `${OUT_DIR}/batch-${BATCH}-check.csv`;
const GAPS_CSV = `${OUT_DIR}/batch-${BATCH}-gaps.csv`;
const SUMMARY_JSON = `${OUT_DIR}/batch-${BATCH}-summary.json`;
const PROGRESS = `${OUT_DIR}/batch-${BATCH}-progress.json`;
const CONCURRENCY = 4;
const LIST_DELAY_MS = 120;
const LINK_DELAY_MS = 80;

fs.mkdirSync(OUT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        timeout: 20000,
        headers: { 'User-Agent': 'Mozilla/5.0 ErogramAudit/1.0', ...(opts.headers || {}) },
        method: opts.method || 'GET',
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode || 0, body, headers: res.headers }));
      }
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function postForm(path, data) {
  const body = new URLSearchParams(data).toString();
  return fetch(`https://ranking.bio${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': String(Buffer.byteLength(body)),
    },
    body,
  });
}

function parseLinks(html) {
  const re = /<div id="control_([^"]+)" class="mb-20">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  const links = [];
  let m;
  while ((m = re.exec(html))) {
    const block = m[2];
    const title = (block.match(/link-card__title">([^<]+)/) || [])[1]?.trim();
    if (!title) continue;
    const idmodel = (block.match(/data-idmodel="(\d+)"/) || [])[1];
    const idlink = (block.match(/data-idlink="(\d+)"/) || [])[1];
    const dataLink = (block.match(/data-link="([^"]+)"/) || [])[1];
    const platform = (block.match(/data-platform="([^"]+)"/) || [])[1];
    links.push({ title, idmodel, idlink, dataLink, platform, controlId: m[1] });
  }
  return links;
}

function classifyUrl(url) {
  const u = (url || '').toLowerCase();
  if (!u) return 'other';
  if (u.includes('onlyfans.com')) return 'onlyfans';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('fansly.com')) return 'fansly';
  if (u.includes('fanvue.com')) return 'fanvue';
  if (u.includes('t.me') || u.includes('telegram.')) return 'telegram';
  if (u.includes('pornhub.com')) return 'pornhub';
  if (u.includes('reddit.com')) return 'reddit';
  if (u.includes('linktr.ee') || u.includes('linktree')) return 'linktree';
  if (u.includes('allmylinks.com')) return 'allmylinks';
  if (u.includes('beacons.ai')) return 'beacons';
  if (u.includes('getallmylinks.com')) return 'getallmylinks';
  if (u.includes('snipfeed.co')) return 'snipfeed';
  if (u.includes('carrd.co')) return 'carrd';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('twitch.tv')) return 'twitch';
  if (u.includes('discord.')) return 'discord';
  if (u.includes('patreon.com')) return 'patreon';
  return 'other';
}

function norm(u) {
  return String(u || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}

function erogramFieldFor(type) {
  const map = {
    instagram: 'instagramUrl',
    twitter: 'twitterUrl',
    tiktok: 'tiktokUrl',
    fansly: 'fanslyUrl',
    fanvue: 'fanvueUrl',
    telegram: 'telegramUrl',
    pornhub: 'pornhubUrl',
    website: 'website',
    linktree: 'linktreeUrl',
    allmylinks: 'allmylinksUrl',
    beacons: 'beaconsUrl',
    reddit: 'redditUrl',
    patreon: 'patreonUrl',
  };
  return map[type];
}

function hasOnErogram(doc, type, url) {
  const field = erogramFieldFor(type);
  if (!field) return false;
  const val = doc?.[field] || '';
  if (norm(val)) {
    if (norm(val) === norm(url)) return true;
    if (type === 'instagram' && norm(doc?.instagramUsername)) {
      const handle = norm(url).replace(/^instagram\.com\//, '').split('/')[0];
      if (norm(doc.instagramUsername) === handle) return true;
    }
    return true;
  }
  return false;
}

async function checkListed(username) {
  const url = `https://ranking.bio/${encodeURIComponent(username).replace(/%2E/g, '.')}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 200) return { listed: true, status: 200, url };
      if (res.status === 404) return { listed: false, status: 404, url: '' };
      if (res.status >= 500) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      return { listed: false, status: res.status, url: '' };
    } catch {
      await sleep(800 * (attempt + 1));
    }
  }
  return { listed: null, status: 0, url: '' };
}

async function resolveProfileLinks(username) {
  const res = await fetch(`https://ranking.bio/${encodeURIComponent(username).replace(/%2E/g, '.')}`);
  if (res.status !== 200) return [];
  const cards = parseLinks(res.body);
  const rbLinks = [];
  for (const card of cards) {
    let url = card.dataLink || '';
    if (card.idlink && card.idmodel) {
      try {
        const r = await postForm('/api_clickout', { idlink: card.idlink, idmodel: card.idmodel });
        const parsed = JSON.parse(r.body);
        if (typeof parsed === 'string') url = parsed.replace(/\\\//g, '/');
      } catch {}
      await sleep(LINK_DELAY_MS);
    }
    if (!url) continue;
    rbLinks.push({ title: card.title, type: classifyUrl(url), url });
  }
  return rbLinks;
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: limit }, () => worker()));
  return out;
}

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
const schema = new mongoose.Schema({}, { strict: false, collection: 'onlyfanscreators' });
const OnlyFansCreator = mongoose.model(`RbCrossMatch${BATCH}`, schema);

const allCreators = await OnlyFansCreator.find({ deleted: { $ne: true } })
  .select(
    'username name clicks instagramUrl instagramUsername twitterUrl tiktokUrl fanslyUrl fanvueUrl privacyUrl pornhubUrl telegramUrl website linktreeUrl allmylinksUrl beaconsUrl redditUrl patreonUrl'
  )
  .sort({ clicks: -1, username: 1 })
  .lean();

const batchCreators = allCreators.slice(OFFSET, OFFSET + LIMIT);
await mongoose.disconnect();

console.error(`Batch ${BATCH}: creators ${OFFSET + 1}-${OFFSET + batchCreators.length} of ${allCreators.length}`);

const progress = fs.existsSync(PROGRESS) ? JSON.parse(fs.readFileSync(PROGRESS, 'utf8')) : { done: {} };
const checkRows = ['idx,offset_rank,clicks,username,listed,status,ranking_bio_url'];
const gapRows = ['idx,offset_rank,clicks,username,rb_title,type,url,erogram_field,missing_on_erogram'];

let listedCount = 0;
let gapCount = 0;
const typeCounts = {};
const gapTypeCounts = {};

for (let i = 0; i < batchCreators.length; i++) {
  const c = batchCreators[i];
  const idx = OFFSET + i + 1;
  const key = c.username;

  if (progress.done[key]?.listed === false) {
    checkRows.push(`${idx},${i + 1},${c.clicks || 0},${c.username},false,404,`);
    continue;
  }

  if (progress.done[key]?.listed === true && progress.done[key]?.gapsDone) {
    listedCount++;
    for (const g of progress.done[key].gaps || []) {
      gapRows.push(
        `${idx},${i + 1},${c.clicks || 0},${c.username},"${g.title.replace(/"/g, '""')}",${g.type},"${g.url.replace(/"/g, '""')}",${g.erogramField || ''},yes`
      );
      gapTypeCounts[g.type] = (gapTypeCounts[g.type] || 0) + 1;
      gapCount++;
    }
    checkRows.push(`${idx},${i + 1},${c.clicks || 0},${c.username},true,200,https://ranking.bio/${c.username}`);
    continue;
  }

  if (i && i % 25 === 0) {
    process.stderr.write(`check ${i}/${batchCreators.length}\n`);
    fs.writeFileSync(PROGRESS, JSON.stringify(progress, null, 2));
  }

  await sleep(LIST_DELAY_MS);
  const listed = await checkListed(c.username);
  if (listed.listed === true) {
    listedCount++;
    checkRows.push(`${idx},${i + 1},${c.clicks || 0},${c.username},true,200,https://ranking.bio/${c.username}`);

    const rbLinks = await resolveProfileLinks(c.username);
    const gaps = [];
    for (const link of rbLinks) {
      typeCounts[link.type] = (typeCounts[link.type] || 0) + 1;
      if (link.type === 'onlyfans') continue;
      const field = erogramFieldFor(link.type);
      if (!hasOnErogram(c, link.type, link.url)) {
        gaps.push({ title: link.title, type: link.type, url: link.url, erogramField: field || '' });
        gapRows.push(
          `${idx},${i + 1},${c.clicks || 0},${c.username},"${link.title.replace(/"/g, '""')}",${link.type},"${link.url.replace(/"/g, '""')}",${field || ''},yes`
        );
        gapTypeCounts[link.type] = (gapTypeCounts[link.type] || 0) + 1;
        gapCount++;
      }
    }
    progress.done[key] = { listed: true, gapsDone: true, gapCount: gaps.length, gaps };
  } else {
    checkRows.push(`${idx},${i + 1},${c.clicks || 0},${c.username},${listed.listed === false ? 'false' : 'unknown'},${listed.status},`);
    progress.done[key] = { listed: listed.listed === false ? false : null, status: listed.status };
  }
}

fs.writeFileSync(CHECK_CSV, `${checkRows.join('\n')}\n`);
fs.writeFileSync(GAPS_CSV, `${gapRows.join('\n')}\n`);

const summary = {
  batch: BATCH,
  offset: OFFSET,
  limit: LIMIT,
  totalCreators: allCreators.length,
  batchSize: batchCreators.length,
  listed: listedCount,
  listedPct: batchCreators.length ? Math.round((listedCount / batchCreators.length) * 1000) / 10 : 0,
  gapRows: gapCount,
  gapTypeCounts,
  rankingBioLinkTypes: typeCounts,
  checkCsv: CHECK_CSV,
  gapsCsv: GAPS_CSV,
};

fs.writeFileSync(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(PROGRESS, JSON.stringify(progress, null, 2));

console.log(JSON.stringify(summary, null, 2));
