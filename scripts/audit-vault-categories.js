/* eslint-disable */
// READ-ONLY audit: suggest vault category fixes.
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const GENERIC = new Set(['Amateur', 'Adult', 'Telegram-Porn', 'NSFW-Telegram', 'All']);
const TEMPLATE_RE = /Looking for the best in its category|Connect with the .+ community on Telegram today/i;

const RULES = [
  { cat: 'Hentai', re: /hentai|里番|二次元|动漫|禁漫|同人|acg|\bmmd\b|\bvam\b|2d anime|anime porn|cartoon porn|r18/i },
  { cat: 'Onlyfans Leaks', re: /onlyfans\s*leak|of\s*leak|leaked\s*onlyfans|onlyfans\s*leaks|leaks?\s*onlyfans|of\s*资源|免费.*onlyfans/i },
  { cat: 'Onlyfans', re: /onlyfans|fansly|fanvue|\|\s*of\b|creator subscription|premium creator/i },
  { cat: 'Feet', re: /\bfeet\b|\bfoot\b|footfetish|foot fetish|soles|\btoes\b|足控|脚控/i },
  { cat: 'BDSM', re: /\bbdsm\b|bondage|dominatrix|femdom|femdomhub|slave|submissive|latex|spanking|mistress|femdom/i },
  { cat: 'MILF', re: /\bmilf\b|\bmilfs\b|cougar|熟女|人妻|mature woman/i },
  { cat: 'Lesbian', re: /\blesbian\b|girl on girl|女同|lesbo/i },
  { cat: 'Cosplay', re: /cosplay|福利姬|costume play/i },
  { cat: 'AI NSFW', re: /\bai nsfw\b|ai porn|ai girl|deepfake|stable diffusion/i },
  { cat: 'Cuckold', re: /cuckold|cuck\b|hotwife|绿帽/i },
  { cat: 'Anal', re: /\banal\b|backdoor|ass fuck|肛交/i },
  { cat: 'Blowjob', re: /blowjob|deepthroat|glory hole|口交|深喉/i },
  { cat: 'Big Ass', re: /big ass|big booty|pawg|thick ass|巨臀/i },
  { cat: 'Big Tits', re: /big tit|big boob|busty|巨乳/i },
  { cat: 'Ebony', re: /\bebony\b|black girl|african/i },
  { cat: 'Latina', re: /\blatina\b|latin girl|hispanic|castañeda|ramirez|rodríguez|colombian|mexican/i },
  { cat: 'Asian', re: /\basian\b|jav\b|korean av|chinese av|日韩|亚洲av|无码|白虎/i },
  { cat: 'Russian', re: /russian|русск|росси|украин|ukrain|slavic|[а-яё]{5,}/i },
  { cat: 'Fetish', re: /\bfetish\b|fetishh|kink\b|gloryy holee/i },
  { cat: 'Hardcore', re: /hardcore|extreme porn|rough sex/i },
  { cat: 'Masturbation', re: /masturbat|joi\b|jerk off instruction|自慰/i },
  { cat: 'Threesome', re: /threesome|3some|三人/i },
  { cat: 'Creampie', re: /creampie|内射/i },
  { cat: 'Public', re: /\bpublic\b|outdoor sex|exhibition|露出/i },
  { cat: 'Petite', re: /\bpetite\b|small girl|tiny girl/i },
  { cat: 'Blonde', re: /\blonde\b|blond girl/i },
  { cat: 'China', re: /china|chinese|中国|中文频道|大陆/i },
  { cat: 'Japan', re: /japan|japanese|日本/i },
  { cat: 'Brazil', re: /brazil|brazilian|brasil/i },
  { cat: 'Colombia', re: /colombia|colombian/i },
  { cat: 'Germany', re: /germany|german|deutsch/i },
  { cat: 'Spain', re: /spain|spanish|españa|español/i },
  { cat: 'USA', re: /\busa\b|american|united states/i },
  { cat: 'UK', re: /\buk\b|british|england/i },
  { cat: 'Ukraine', re: /ukraine|ukrainian/i },
  { cat: 'Italy', re: /italy|italian|italia/i },
  { cat: 'Argentina', re: /argentina|argentinian/i },
];

const PRIORITY = new Map(RULES.map((r, i) => [r.cat, i]));

function nameSignals(name) {
  const hits = [];
  for (const { cat, re } of RULES) if (re.test(name || '')) hits.push(cat);
  return hits;
}

function descSignals(desc) {
  if (!desc) return [];
  const hits = [];
  // Onlyfans in desc always counts (even SEO templates mention it)
  if (/onlyfans\.com|onlyfans telegram|dedicated onlyfans/i.test(desc)) hits.push('Onlyfans');
  if (/onlyfans\s*leak|of\s*leak|leaked onlyfans/i.test(desc)) hits.push('Onlyfans Leaks');
  if (TEMPLATE_RE.test(desc)) return hits;
  for (const { cat, re } of RULES) if (re.test(desc)) hits.push(cat);
  return hits;
}

function pickBest(candidates) {
  const uniq = [...new Set(candidates.filter(Boolean))];
  if (!uniq.length) return null;
  uniq.sort((a, b) => (PRIORITY.get(a) ?? 999) - (PRIORITY.get(b) ?? 999));
  return uniq[0];
}

function cleanTags(primary, existing, signals) {
  const keep = new Set([primary, 'Telegram-Porn']);
  for (const s of signals) if (s && s !== primary) keep.add(s);
  // keep up to 2 relevant existing specifics that aren't contradictions
  const existingSpecific = (existing || []).filter((c) => c && !GENERIC.has(c) && c !== primary);
  for (const c of existingSpecific) keep.add(c);
  // drop obvious junk pairings
  if (primary === 'BDSM') keep.delete('Hentai');
  if (primary === 'Feet') { keep.delete('Onlyfans'); keep.delete('Hentai'); }
  if (primary === 'Hentai') keep.delete('Amateur');
  if (primary === 'Onlyfans' || primary === 'Onlyfans Leaks') {
    keep.delete('Feet');
    keep.delete('BDSM');
  }
  return [...keep].sort();
}

function reviewGroup(g) {
  const existingCats = (g.categories || []).filter((c) => c && c !== 'All');
  const currentPrimary = g.category && g.category !== 'All' ? g.category : existingCats[0] || 'Amateur';
  const ns = nameSignals(g.name);
  const ds = descSignals(g.description);
  const existingSpecific = existingCats.filter((c) => !GENERIC.has(c));

  let suggestedPrimary = currentPrimary;
  let reason = '';

  if (GENERIC.has(currentPrimary) && existingSpecific.length) {
    suggestedPrimary = pickBest([...ns, ...existingSpecific]) || currentPrimary;
    reason = `Generic primary "${currentPrimary}" → promote tag "${suggestedPrimary}"`;
  } else if (ns.length && !ns.includes(currentPrimary)) {
    const nameBest = pickBest(ns);
    if (nameBest && (GENERIC.has(currentPrimary) || PRIORITY.get(nameBest) < (PRIORITY.get(currentPrimary) ?? 999))) {
      suggestedPrimary = nameBest;
      reason = `Name signals "${nameBest}" (was "${currentPrimary}")`;
    }
  } else if (ds.length && GENERIC.has(currentPrimary)) {
    const dBest = pickBest(ds);
    if (dBest) {
      suggestedPrimary = dBest;
      reason = `Description signals "${dBest}"`;
    }
  }

  // name overrides wrong specific primary
  if (!GENERIC.has(currentPrimary) && ns.length) {
    const nameBest = pickBest(ns);
    if (nameBest && nameBest !== currentPrimary && PRIORITY.get(nameBest) < (PRIORITY.get(currentPrimary) ?? 999)) {
      suggestedPrimary = nameBest;
      reason = `Name overrides primary: "${currentPrimary}" → "${nameBest}"`;
    }
  }

  const allSignals = [...new Set([...ns, ...ds, ...existingSpecific])];
  const suggestedCats = cleanTags(suggestedPrimary, existingCats, allSignals);

  const primaryChanged = suggestedPrimary !== currentPrimary;
  const catsChanged = JSON.stringify([...existingCats].sort()) !== JSON.stringify(suggestedCats.sort());
  const needsChange = primaryChanged || catsChanged;

  let change = 'OK';
  if (needsChange) {
    change = primaryChanged
      ? `${currentPrimary} → ${suggestedPrimary}`
      : `keep ${currentPrimary}`;
    if (catsChanged) change += ` | tags: [${existingCats.join(', ')}] → [${suggestedCats.join(', ')}]`;
  }

  return {
    _id: g._id.toString(),
    name: g.name,
    currentPrimary,
    currentCategories: existingCats.join(', ') || '(none)',
    suggestedPrimary,
    suggestedCategories: suggestedCats.join(', '),
    change,
    needsChange,
    reason: reason || (catsChanged ? 'Tag cleanup' : ''),
  };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const col = mongoose.connection.db.collection('groups');
  const groups = await col
    .find(
      { premiumOnly: true, status: 'approved', deletedAt: null, isAdvertisement: { $ne: true } },
      { projection: { name: 1, slug: 1, category: 1, categories: 1, description: 1 } },
    )
    .toArray();

  const reviews = groups.map(reviewGroup);
  const changed = reviews.filter((r) => r.needsChange);

  const beforeCounts = new Map();
  const afterCounts = new Map();
  for (const r of reviews) {
    beforeCounts.set(r.currentPrimary, (beforeCounts.get(r.currentPrimary) || 0) + 1);
    afterCounts.set(r.suggestedPrimary, (afterCounts.get(r.suggestedPrimary) || 0) + 1);
  }

  const shiftMap = new Map();
  for (const r of changed.filter((x) => x.currentPrimary !== x.suggestedPrimary)) {
    const key = `${r.currentPrimary} → ${r.suggestedPrimary}`;
    shiftMap.set(key, (shiftMap.get(key) || 0) + 1);
  }

  console.log('=== VAULT CATEGORY AUDIT (v2) ===');
  console.log(`Total: ${reviews.length} | Need change: ${changed.length} (${((changed.length / reviews.length) * 100).toFixed(1)}%)`);
  console.log(`Primary-only changes: ${changed.filter((r) => r.currentPrimary !== r.suggestedPrimary).length}`);
  console.log(`Tag-only cleanup: ${changed.filter((r) => r.currentPrimary === r.suggestedPrimary).length}`);

  console.log('\n=== TOP PRIMARY SHIFTS ===');
  [...shiftMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([k, n]) => console.log(`${String(n).padStart(4)}  ${k}`));

  console.log('\n=== PRIMARY COUNTS: BEFORE | AFTER | CHANGE ===');
  const all = new Set([...beforeCounts.keys(), ...afterCounts.keys()]);
  [...all]
    .map((n) => ({ niche: n, before: beforeCounts.get(n) || 0, after: afterCounts.get(n) || 0 }))
    .sort((a, b) => b.after - a.after)
    .forEach(({ niche, before, after }) => {
      const d = after - before;
      console.log(`${String(before).padStart(4)} → ${String(after).padStart(4)}  (${d >= 0 ? '+' : ''}${d})  ${niche}`);
    });

  const csvPath = '/Users/themaf/Desktop/@ErogramPRO/scripts/vault-category-audit.csv';
  const esc = (s) => `"${String(s || '').replace(/"/g, '""')}"`;
  const header = 'name,currentPrimary,currentCategories,suggestedPrimary,suggestedCategories,change,reason\n';
  const rows = reviews
    .sort((a, b) => (b.needsChange - a.needsChange) || a.currentPrimary.localeCompare(b.currentPrimary))
    .map((r) => [r.name, r.currentPrimary, r.currentCategories, r.suggestedPrimary, r.suggestedCategories, r.change, r.reason].map(esc).join(','))
    .join('\n');
  fs.writeFileSync(csvPath, header + rows);
  console.log(`\nCSV: ${csvPath}`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
