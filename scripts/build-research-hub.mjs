#!/usr/bin/env node
/** Unified research hub: AI NSFW outreach + AI directories + OF competitors + niche gaps */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_HTML = path.join(process.env.HOME, 'Desktop/Lists/research-hub.html');

const TOOLS_JSON = path.join(ROOT, 'tmp/outreach-merged.json');
const DIRS_JSON = path.join(ROOT, 'tmp/nsfw-directory-pricing.json');
const OF_COMP_JSON = path.join(ROOT, 'tmp/of-competitors.json');
const GAPS_JSON = path.join(ROOT, 'tmp/of-niche-gaps.json');

function load(p, fallback = []) {
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function tierBadge(tier) {
  const cls = tier === 'high' ? 'tier-high' : tier === 'medium' ? 'tier-med' : tier === 'low' ? 'tier-low' : 'tier-one';
  const label = tier === 'high' ? '5+ dirs' : tier === 'medium' ? '3-4 dirs' : tier === 'low' ? '2 dirs' : '1 dir';
  return `<span class="badge ${cls}">${label}</span>`;
}

function buildToolRows(tools) {
  return tools
    .map((t) => {
      const emails = t.emails?.length
        ? t.emails.map((e) => `<a href="mailto:${esc(e)}">${esc(e)}</a>`).join('<br>')
        : '<span class="muted">No email</span>';
      const contact = t.contactPage
        ? `<a href="${esc(t.contactPage)}" target="_blank" rel="noopener">Contact</a>`
        : '<span class="muted">-</span>';
      const feat = t.featured ? '<span class="badge featured">Yes</span>' : '<span class="badge">No</span>';
      const rec = t.recentlyAdded ? '<span class="badge recent">Yes</span>' : '<span class="badge">No</span>';
      const note = t.sidenote ? `<span class="note">${esc(t.sidenote)}</span>` : '<span class="muted">-</span>';
      const tg = t.telegram?.length
        ? t.telegram.map((x) => `<a href="${esc(x)}" target="_blank" rel="noopener">${esc(x)}</a>`).join('<br>')
        : '<span class="muted">-</span>';
      return `<tr class="row-tools" data-search="${esc((t.name + ' ' + (t.emails || []).join(' ')).toLowerCase())}"><td><strong>${esc(t.name)}</strong></td><td>${feat}</td><td>${rec}</td><td>${note}</td><td>${contact}</td><td>${emails}</td><td>${tg}</td></tr>`;
    })
    .join('\n');
}

function buildDirRows(dirs) {
  return dirs
    .map((d) => {
      const submit = d.submit_url && d.submit_url !== 'none' && d.submit_url !== 'unknown'
        ? `<a href="${esc(d.submit_url)}" target="_blank" rel="noopener">Submit</a>`
        : '<span class="muted">-</span>';
      return `<tr class="row-dirs" data-search="${esc((d.site_name + ' ' + d.notes).toLowerCase())}"><td><strong>${esc(d.site_name)}</strong></td><td><a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.url.replace(/^https?:\/\//, ''))}</a></td><td>${submit}</td><td>${esc(d.entry_price_lowest)}</td><td>${esc(d.top_tier_price)}</td><td>${esc(d.billing_model)}</td><td class="notes">${esc(d.notes)}</td></tr>`;
    })
    .join('\n');
}

function buildCompRows(comps) {
  return comps
    .map((c) => {
      const st = c.status === 'verified'
        ? '<span class="badge recent">Verified</span>'
        : c.status === 'checked'
          ? '<span class="badge">Checked</span>'
          : '<span class="badge">Listed</span>';
      return `<tr class="row-comps" data-search="${esc((c.name + ' ' + c.url).toLowerCase())}"><td><strong>${esc(c.name)}</strong></td><td><a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.url.replace(/^https?:\/\//, ''))}</a></td><td>${esc(c.type)}</td><td>${c.categories ?? '-'}</td><td>${st}</td></tr>`;
    })
    .join('\n');
}

function coverageBadge(c) {
  if (!c) return '<span class="badge">unknown</span>';
  if (c.type === 'official') return `<span class="badge recent">official (${c.count})</span>`;
  if (c.type === 'alias-official') return `<span class="badge recent">alias → ${esc(c.match)}</span>`;
  if (c.type === 'db-only' || c.type === 'db-fuzzy') {
    const m = c.match ? ` → ${c.match}` : '';
    return `<span class="badge featured">in DB${m} (${c.count})</span>`;
  }
  return '<span class="badge tier-high">not in DB</span>';
}

function buildGapRows(gaps) {
  return gaps
    .map((g) => {
      const comps = g.competitors.join(', ');
      const cov = g.coverage?.type || 'missing';
      return `<tr class="row-gaps" data-search="${esc((g.label + ' ' + g.slug + ' ' + comps + ' ' + cov).toLowerCase())}" data-tier="${esc(g.tier)}" data-cov="${esc(cov)}"><td><code>${esc(g.slug)}</code></td><td>${esc(g.label)}</td><td>${coverageBadge(g.coverage)}</td><td>${tierBadge(g.tier)}</td><td>${g.competitorCount}</td><td class="notes">${esc(comps)}</td></tr>`;
    })
    .join('\n');
}

function main() {
  const tools = load(TOOLS_JSON);
  const dirs = load(DIRS_JSON);
  const ofComp = load(OF_COMP_JSON, { competitors: [] });
  const gapsData = load(GAPS_JSON, { missing: [], ourCategories: [] });
  const gaps = gapsData.missing || [];
  const trulyMissing = gaps.filter((g) => g.coverage?.type === 'missing').length;
  const inDbOnly = gaps.filter((g) => g.coverage?.type === 'db-only' || g.coverage?.type === 'db-fuzzy').length;
  const haveOfficial = gaps.filter((g) => g.coverage?.type === 'official' || g.coverage?.type === 'alias-official').length;

  const featured = tools.filter((t) => t.featured).length;
  const withEmail = tools.filter((t) => t.emails?.length).length;
  const highGaps = gaps.filter((g) => g.tier === 'high' && g.coverage?.type === 'missing').length;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Erogram Research Hub</title>
<style>
*{box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:24px;background:#0f0f12;color:#eee;line-height:1.5}
h1{margin:0 0 4px;font-size:1.6rem}.sub{color:#999;margin:0 0 16px;font-size:.95rem}
.tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}
.tab{padding:10px 16px;border:1px solid #333;border-radius:999px;background:#1a1a20;color:#ccc;cursor:pointer;font-size:.9rem}
.tab.active{background:#243044;border-color:#4a6fa5;color:#fff}
.panel{display:none}.panel.active{display:block}
.toolbar{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px;align-items:center}
input[type=search],select{padding:10px 14px;border:1px solid #333;border-radius:8px;background:#1a1a20;color:#fff;font-size:.9rem}
input[type=search]{flex:1;min-width:220px;max-width:480px}
#count{color:#888;font-size:.9rem}
table{width:100%;border-collapse:collapse;font-size:.88rem;margin-bottom:8px}
th,td{border-bottom:1px solid #2a2a32;padding:10px 8px;text-align:left;vertical-align:top}
th{color:#aaa;font-weight:600;font-size:.75rem;text-transform:uppercase;letter-spacing:.04em;position:sticky;top:0;background:#0f0f12}
tr:hover td{background:#17171d}a{color:#7eb8ff;text-decoration:none}a:hover{text-decoration:underline}
.badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:.75rem;background:#2a2a32;color:#bbb;white-space:nowrap}
.badge.featured{background:#3d2e00;color:#ffc857;font-weight:600}
.badge.recent{background:#0d3320;color:#6ee7a0;font-weight:600}
.tier-high{background:#3b1a1a;color:#fca5a5}.tier-med{background:#3d2e00;color:#fcd34d}.tier-low{background:#1e293b;color:#93c5fd}.tier-one{background:#2a2a32;color:#aaa}
.note{color:#c4b5fd;font-size:.85rem;line-height:1.4}.notes{color:#aaa;font-size:.82rem;line-height:1.45;max-width:420px}
.muted{color:#666}tr.hidden{display:none}code{font-size:.82rem;color:#fcd34d}
.stats{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px}
.stat{background:#1a1a20;border:1px solid #2a2a32;border-radius:10px;padding:10px 14px;font-size:.85rem;color:#bbb}
.stat strong{color:#fff;font-size:1.1rem;display:block}
.table-wrap{overflow:auto;max-height:72vh;border:1px solid #2a2a32;border-radius:10px}
h2{font-size:1.05rem;margin:0 0 10px}
</style>
</head>
<body>
<h1>Erogram Research Hub</h1>
<p class="sub">AI NSFW outreach, AI directory pricing, OnlyFans search competitors, and niche gaps vs Erogram (Jul 30, 2026)</p>
<div class="stats">
  <div class="stat"><strong>${tools.length}</strong>AI tools to reach out</div>
  <div class="stat"><strong>${dirs.length}</strong>AI NSFW directories checked</div>
  <div class="stat"><strong>${ofComp.competitors?.length || 0}</strong>OnlyFans search competitors</div>
  <div class="stat"><strong>${gaps.length}</strong>competitor niches (filtered)</div>
  <div class="stat"><strong>${trulyMissing}</strong>not in our DB at all</div>
  <div class="stat"><strong>${inDbOnly}</strong>in DB, no official page</div>
  <div class="stat"><strong>${(gapsData.ourCategories || []).length}</strong>Erogram OF categories today</div>
</div>
<div class="tabs">
  <button class="tab active" data-panel="tools">AI NSFW Tools Outreach</button>
  <button class="tab" data-panel="dirs">AI NSFW Directories</button>
  <button class="tab" data-panel="comps">OnlyFans Competitors</button>
  <button class="tab" data-panel="gaps">Missing OF Niches</button>
</div>

<section id="tools" class="panel active">
<h2>AI NSFW Tools to Reach Out (${tools.length})</h2>
<p class="sub">${withEmail} with email | ${featured} featured on aiapps / nsfw.tools</p>
<div class="toolbar"><input id="q-tools" type="search" placeholder="Search tool or email..."><span id="count-tools" class="count"></span></div>
<div class="table-wrap"><table><thead><tr><th>Tool</th><th>Featured</th><th>Recent</th><th>Sidenote</th><th>Contact</th><th>Emails</th><th>Telegram</th></tr></thead><tbody>${buildToolRows(tools)}</tbody></table></div>
</section>

<section id="dirs" class="panel">
<h2>AI NSFW Directories We Checked (${dirs.length})</h2>
<div class="toolbar"><input id="q-dirs" type="search" placeholder="Search directory..."><span id="count-dirs" class="count"></span></div>
<div class="table-wrap"><table><thead><tr><th>Site</th><th>URL</th><th>Submit</th><th>Entry</th><th>Top tier</th><th>Billing</th><th>Notes</th></tr></thead><tbody>${buildDirRows(dirs)}</tbody></table></div>
</section>

<section id="comps" class="panel">
<h2>OnlyFans Search / Directory Competitors (${ofComp.competitors?.length || 0})</h2>
<p class="sub">6 verified with full category lists scraped; 44 more checked or listed from industry roundups</p>
<div class="toolbar"><input id="q-comps" type="search" placeholder="Search competitor..."><span id="count-comps" class="count"></span></div>
<div class="table-wrap"><table><thead><tr><th>Name</th><th>URL</th><th>Type</th><th>Categories</th><th>Status</th></tr></thead><tbody>${buildCompRows(ofComp.competitors || [])}</tbody></table></div>
</section>

<section id="gaps" class="panel">
<h2>OnlyFans Niches Competitors Have (${gaps.length} after filters)</h2>
<p class="sub">Excluded: trans, gay, LGBT, femboy, male/masculine/man, Indian. Official cats: ${(gapsData.ourCategories || []).join(', ')}. ${highGaps} high-tier gaps with zero DB creators.</p>
<div class="toolbar">
  <input id="q-gaps" type="search" placeholder="Search niche...">
  <select id="tier-gaps"><option value="all">All tiers</option><option value="high">High (5+ dirs)</option><option value="medium">Medium (3-4)</option><option value="low">Low (2)</option><option value="single">Single source</option></select>
  <select id="cov-gaps"><option value="all">All coverage</option><option value="missing">Not in DB</option><option value="db-only">In DB only</option><option value="db-fuzzy">In DB fuzzy</option><option value="official">Official page</option><option value="alias-official">Alias of official</option></select>
  <span id="count-gaps" class="count"></span>
</div>
<div class="table-wrap"><table><thead><tr><th>Slug</th><th>Label</th><th>Our data</th><th>Tier</th><th># Dirs</th><th>Seen on</th></tr></thead><tbody>${buildGapRows(gaps)}</tbody></table></div>
</section>

<script>
const tabs=[...document.querySelectorAll('.tab')];
const panels=[...document.querySelectorAll('.panel')];
tabs.forEach(btn=>btn.addEventListener('click',()=>{
  tabs.forEach(t=>t.classList.remove('active'));
  panels.forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(btn.dataset.panel).classList.add('active');
}));
function wire(qId, rowsSel, countId, tierSel, covSel){
  const q=document.getElementById(qId);
  const tier=tierSel?document.getElementById(tierSel):null;
  const cov=covSel?document.getElementById(covSel):null;
  const rows=[...document.querySelectorAll(rowsSel)];
  const countEl=document.getElementById(countId);
  function apply(){
    const v=(q?.value||'').toLowerCase();
    const t=tier?tier.value:'all';
    const c=cov?cov.value:'all';
    let n=0;
    rows.forEach(r=>{
      const okSearch=!v||r.dataset.search.includes(v);
      const okTier=t==='all'||r.dataset.tier===t;
      const okCov=c==='all'||r.dataset.cov===c;
      const show=okSearch&&okTier&&okCov;
      r.classList.toggle('hidden',!show);
      if(show)n++;
    });
    if(countEl) countEl.textContent=n+' shown';
  }
  q?.addEventListener('input',apply);
  tier?.addEventListener('change',apply);
  cov?.addEventListener('change',apply);
  apply();
}
wire('q-tools','.row-tools','count-tools');
wire('q-dirs','.row-dirs','count-dirs');
wire('q-comps','.row-comps','count-comps');
wire('q-gaps','.row-gaps','count-gaps','tier-gaps','cov-gaps');
</script>
</body>
</html>`;

  fs.mkdirSync(path.dirname(OUT_HTML), { recursive: true });
  fs.writeFileSync(OUT_HTML, html);
  console.log(`Research hub: ${OUT_HTML}`);
  console.log(`${tools.length} tools | ${dirs.length} AI dirs | ${ofComp.competitors?.length || 0} OF competitors | ${gaps.length} niche gaps`);
}

main();
