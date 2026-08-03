#!/usr/bin/env node
/** Merge aiapps + nsfw.tools recently-added + best-2024 promoted into outreach index.html */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AIAPPS = path.join(__dirname, '../tmp/aiapps-nsfw-outreach.json');
const NSFW_RECENT = path.join(__dirname, '../tmp/nsfw-recent-outreach.json');
const NSFW_BEST = path.join(__dirname, '../tmp/nsfw-best-promoted.json');
const OUT_JSON = path.join(__dirname, '../tmp/outreach-merged.json');
const OUT_HTML = path.join(process.env.HOME, 'Desktop/outreach/index.html');

const PROMO_AIAPPS = 'aiapps.com';
const PROMO_RECENT = 'nsfw.tools Recently Added';
const PROMO_BEST = 'nsfw.tools Best 2024';

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

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function loadJson(path, fallback = []) {
  if (!fs.existsSync(path)) return fallback;
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function findMatch(ext, byDomain, byName, tools) {
  const n = normName(ext.name);
  const d = normDomain(ext.website);

  if (byName.has(n)) return byName.get(n);

  // Name aliases before domain (shared affiliate domains must not steal matches)
  if (n.includes('candy') || d === 'candy.ai') return byName.get('candyai');
  if (n.includes('celebmaker')) return byName.get('celebmakerai');
  if (n.includes('girlfriendgpt')) return byName.get('girlfriendgpt');
  if (n.includes('dreamcompanion') || d.includes('mydreamcompanion')) {
    return tools.find((t) => t.name === 'Dream Companion') || tools.find((t) => normName(t.name).includes('dreamcompanion'));
  }
  if (n.includes('ourdream') || d.startsWith('ourdream')) {
    return tools.find((t) => t.name === 'Our Dream') || tools.find((t) => normName(t.name).startsWith('ourdream'));
  }
  if (n.includes('deepundress')) return byName.get('deepundress');
  if (n.includes('mylovely')) return byName.get('mylovelyai');
  if (n === 'secretsai' || n === 'secrets') return byName.get('secretsai');
  if (n.includes('uncensoredai')) {
    if (d) {
      const sameDomain = tools.find((t) => normDomain(t.website) === d);
      if (sameDomain) return sameDomain;
    }
    return null;
  }
  if (n.includes('sugarlab')) return tools.find((t) => normName(t.name).includes('sugarlab'));

  if (d && byDomain.has(d)) return byDomain.get(d);

  return null;
}

function addPromo(tool, label) {
  if (!tool.promotedOn.includes(label)) tool.promotedOn.push(label);
}

function mergeEntries(keep, drop) {
  if (!keep.promotedOn) keep.promotedOn = [];
  for (const p of drop.promotedOn || []) addPromo(keep, p);
  keep.recentlyAdded = keep.recentlyAdded || drop.recentlyAdded;
  keep.featured = keep.featured || drop.featured;
  const emails = new Set([...(keep.emails || []), ...(drop.emails || [])]);
  keep.emails = [...emails].slice(0, 4);
  if (!keep.contactPage && drop.contactPage) keep.contactPage = drop.contactPage;
  if (!keep.website && drop.website) keep.website = drop.website;
  if (keep.name.length < drop.name.length && /[^a-z]/i.test(drop.name)) keep.name = drop.name;
}

function dedupeTools(tools) {
  const groups = new Map();
  for (const t of tools) {
    let key = normName(t.name);
    if (key.includes('dreamcompanion')) key = 'dreamcompanion';
    if (key.includes('newgirl')) key = 'newgirlai';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  const out = [];
  for (const [, group] of groups) {
    group.sort((a, b) => {
      const prefer = ['Dream Companion', 'Our Dream', 'GirlfriendGPT', 'Candy AI', 'CelebMakerAI', 'MyLovely AI', 'Secrets AI'];
      if (prefer.includes(a.name) && !prefer.includes(b.name)) return -1;
      if (prefer.includes(b.name) && !prefer.includes(a.name)) return 1;
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      if ((b.emails?.length || 0) !== (a.emails?.length || 0)) return (b.emails?.length || 0) - (a.emails?.length || 0);
      return a.name.localeCompare(b.name);
    });
    const keep = { ...group[0], promotedOn: [...(group[0].promotedOn || [])], emails: [...(group[0].emails || [])] };
    for (let i = 1; i < group.length; i++) mergeEntries(keep, group[i]);
    out.push(keep);
  }
  return out;
}

function sidenoteText(promotedOn) {
  if (promotedOn.length < 2) return '';
  const list = promotedOn.join(' and ');
  return `Promoted on ${list}`;
}

function buildHtml(tools) {
  const featured = tools.filter((t) => t.featured).length;
  const recent = tools.filter((t) => t.recentlyAdded).length;
  const multiPromo = tools.filter((t) => t.promotedOn.length > 1).length;
  const withEmail = tools.filter((t) => t.emails?.length).length;

  const rows = tools
    .map((t) => {
      const emails = t.emails?.length
        ? t.emails.map((e) => `<a href="mailto:${esc(e)}">${esc(e)}</a>`).join('<br>')
        : '<span class="muted">No email found</span>';
      const contact = t.contactPage
        ? `<a href="${esc(t.contactPage)}" target="_blank" rel="noopener">Contact page</a>`
        : '<span class="muted">-</span>';
      const feat = t.featured
        ? '<span class="badge featured">Yes</span>'
        : '<span class="badge">No</span>';
      const rec = t.recentlyAdded
        ? '<span class="badge recent">Yes</span>'
        : '<span class="badge">No</span>';
      const note = t.sidenote
        ? `<span class="note">${esc(t.sidenote)}</span>`
        : '<span class="muted">-</span>';
      const tg =
        t.telegram?.length
          ? t.telegram
              .map((x) =>
                x.startsWith('http')
                  ? `<a href="${esc(x)}" target="_blank" rel="noopener">${esc(x)}</a>`
                  : esc(x),
              )
              .join('<br>')
          : '<span class="muted">-</span>';
      return `<tr data-featured="${t.featured ? 'yes' : 'no'}" data-recent="${t.recentlyAdded ? 'yes' : 'no'}" data-multipromo="${t.promotedOn.length > 1 ? 'yes' : 'no'}"><td><strong>${esc(t.name)}</strong></td><td>${feat}</td><td>${rec}</td><td>${note}</td><td>${contact}</td><td>${emails}</td><td>${tg}</td></tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI NSFW Outreach Contacts</title>
<style>
*{box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:24px;background:#0f0f12;color:#eee;line-height:1.5}
h1{margin:0 0 4px;font-size:1.6rem}.sub{color:#999;margin:0 0 20px;font-size:.95rem}
.toolbar{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px;align-items:center}
input[type=search]{flex:1;min-width:200px;max-width:420px;padding:10px 14px;border:1px solid #333;border-radius:8px;background:#1a1a20;color:#fff}
select{padding:10px 14px;border:1px solid #333;border-radius:8px;background:#1a1a20;color:#fff;cursor:pointer}
#count{color:#888;font-size:.9rem}
table{width:100%;border-collapse:collapse;font-size:.92rem}th,td{border-bottom:1px solid #2a2a32;padding:12px 10px;text-align:left;vertical-align:top}
th{color:#aaa;font-weight:600;font-size:.8rem;text-transform:uppercase;letter-spacing:.04em}
tr:hover td{background:#17171d}a{color:#7eb8ff;text-decoration:none}a:hover{text-decoration:underline}
.badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:.78rem;background:#2a2a32;color:#bbb}
.badge.featured{background:#3d2e00;color:#ffc857;font-weight:600}
.badge.recent{background:#0d3320;color:#6ee7a0;font-weight:600}
.note{color:#c4b5fd;font-size:.88rem;line-height:1.45}
.muted{color:#666}tr.hidden{display:none}
</style>
</head>
<body>
<h1>AI NSFW Outreach Contacts</h1>
<p class="sub">${tools.length} tools | ${withEmail} with email | ${featured} featured | ${recent} recently added | ${multiPromo} multi-site promoted</p>
<div class="toolbar">
  <input id="q" type="search" placeholder="Search name or email..." autofocus>
  <select id="featuredFilter">
    <option value="all">All tools</option>
    <option value="yes">Featured only</option>
    <option value="no">Non-featured only</option>
  </select>
  <select id="recentFilter">
    <option value="all">All tools</option>
    <option value="yes">Recently added only</option>
    <option value="no">Not recently added</option>
  </select>
  <select id="multiFilter">
    <option value="all">All tools</option>
    <option value="yes">Multi-site promoted only</option>
  </select>
  <span id="count"></span>
</div>
<table>
<thead><tr><th>Tool</th><th>Featured</th><th>Recently Added</th><th>Sidenote</th><th>Contact page</th><th>Emails</th><th>Telegram</th></tr></thead>
<tbody id="rows">
${rows}
</tbody>
</table>
<script>
const q=document.getElementById('q');
const featuredFilter=document.getElementById('featuredFilter');
const recentFilter=document.getElementById('recentFilter');
const multiFilter=document.getElementById('multiFilter');
const countEl=document.getElementById('count');
const rows=[...document.querySelectorAll('#rows tr')];
function applyFilters(){
  const v=q.value.toLowerCase();
  const f=featuredFilter.value;
  const r=recentFilter.value;
  const m=multiFilter.value;
  let visible=0;
  rows.forEach(row=>{
    const matchSearch=!v||row.textContent.toLowerCase().includes(v);
    const matchFeatured=f==='all'||row.dataset.featured===f;
    const matchRecent=r==='all'||row.dataset.recent===r;
    const matchMulti=m==='all'||row.dataset.multipromo===m;
    const show=matchSearch&&matchFeatured&&matchRecent&&matchMulti;
    row.classList.toggle('hidden',!show);
    if(show) visible++;
  });
  countEl.textContent=visible+' shown';
}
q.addEventListener('input',applyFilters);
featuredFilter.addEventListener('change',applyFilters);
recentFilter.addEventListener('change',applyFilters);
multiFilter.addEventListener('change',applyFilters);
applyFilters();
</script>
</body>
</html>`;
}

function mergeExternalList(tools, external, promoLabel, matchedExternal) {
  const byDomain = new Map();
  const byName = new Map();
  for (const t of tools) {
    const d = normDomain(t.website);
    if (d) byDomain.set(d, t);
    byName.set(normName(t.name), t);
  }

  for (const ext of external) {
    const m = findMatch(ext, byDomain, byName, tools);
    if (m) {
      matchedExternal.add(normName(ext.name));
      addPromo(m, promoLabel);
      if (promoLabel === PROMO_RECENT) m.recentlyAdded = true;
      if (ext.emails?.length) {
        m.emails = [...new Set([...(m.emails || []), ...ext.emails])].slice(0, 4);
      }
      if (!m.contactPage && ext.contactPage) m.contactPage = ext.contactPage;
      continue;
    }
    const d = normDomain(ext.website);
    const n = normName(ext.name);
    tools.push({
      name: ext.name,
      featured: promoLabel === PROMO_BEST,
      recentlyAdded: promoLabel === PROMO_RECENT,
      website: ext.website,
      contactPage: ext.contactPage || '',
      emails: ext.emails || [],
      telegram: ext.telegram || [],
      promotedOn: [promoLabel],
      sidenote: '',
    });
    if (d) byDomain.set(d, tools[tools.length - 1]);
    byName.set(n, tools[tools.length - 1]);
  }
}

function finalizeTools(tools) {
  for (const t of tools) {
    t.featured = t.promotedOn.includes(PROMO_AIAPPS) || t.promotedOn.includes(PROMO_BEST);
    t.sidenote = sidenoteText(t.promotedOn);
  }
  tools.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.recentlyAdded !== b.recentlyAdded) return a.recentlyAdded ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function main() {
  const aiapps = loadJson(AIAPPS);
  const recentList = loadJson(NSFW_RECENT);
  const bestList = loadJson(NSFW_BEST);

  const tools = aiapps.map((t) => ({
    ...t,
    emails: Array.isArray(t.emails) ? t.emails : [],
    telegram: Array.isArray(t.telegram) ? t.telegram : [],
    recentlyAdded: false,
    promotedOn: t.featured ? [PROMO_AIAPPS] : [],
    sidenote: '',
  }));

  const matchedRecent = new Set();
  const matchedBest = new Set();

  mergeExternalList(tools, recentList, PROMO_RECENT, matchedRecent);
  mergeExternalList(tools, bestList, PROMO_BEST, matchedBest);

  const deduped = dedupeTools(tools);
  tools.length = 0;
  tools.push(...deduped);

  finalizeTools(tools);

  fs.writeFileSync(OUT_JSON, JSON.stringify(tools, null, 2));
  fs.mkdirSync(path.dirname(OUT_HTML), { recursive: true });
  fs.writeFileSync(OUT_HTML, buildHtml(tools));

  const featured = tools.filter((t) => t.featured).length;
  const best = tools.filter((t) => t.promotedOn.includes(PROMO_BEST)).length;
  const multi = tools.filter((t) => t.promotedOn.length > 1).length;
  console.log(`${tools.length} tools | ${featured} featured | ${best} on nsfw.tools Best 2024 | ${multi} multi-site promoted`);
  console.log(`HTML: ${OUT_HTML}`);
}

main();
