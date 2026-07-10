#!/usr/bin/env node
/** Regenerates counts in canonical-translation-spec.md from constants. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SPEC = path.join(ROOT, 'canonical-translation-spec.md');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function extractStringArray(src, varName) {
  const re = new RegExp(`export const ${varName} = \\[([\\s\\S]*?)\\];`);
  const m = src.match(re);
  if (!m) return [];
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

const groupsConst = read('app/groups/constants.ts');
const ofConst = read('app/onlyfanssearch/constants.ts');
const bestOf = read('app/best-onlyfans-accounts/bestOfPages.ts');

const categoryCount = extractStringArray(groupsConst, 'allCategories').filter((c) => c !== 'All').length;
const countryCount = extractStringArray(groupsConst, 'allCountries').filter((c) => c !== 'All').length;
const ofCatCount = [...ofConst.matchAll(/slug:\s*'([^']+)'/g)].length;
const bestOfCount = [...bestOf.matchAll(/"slug":\s*"([^"]+)"/g)].length;
const totalRows = 23 + 6 + 4;

let md = fs.readFileSync(SPEC, 'utf8');
md = md.replace(/^Generated: .+$/m, `Generated: ${new Date().toISOString().slice(0, 10)}`);
md = md.replace(/\| tg-best-cat \| .+ \| \d+ categories \|/, `| tg-best-cat | /best-telegram-groups/{category} | /best-telegram-groups/amateur | ${categoryCount} categories |`);
md = md.replace(/\| tg-best-country \| .+ \| \d+ countries \|/, `| tg-best-country | /best-telegram-groups/country/{country} | /best-telegram-groups/country/germany | ${countryCount} countries |`);
md = md.replace(/\| groups-country \| .+ \| \d+ countries \|/, `| groups-country | /groups/country/{country} | /groups/country/Germany | ${countryCount} countries |`);
md = md.replace(/\| bots-country \| .+ \| \d+ countries \|/, `| bots-country | /bots/country/{country} | /bots/country/Germany | ${countryCount} countries |`);
md = md.replace(/onlyfans suffix\? \(\d+ cats\)/, `onlyfans suffix? (${ofCatCount} cats)`);
md = md.replace(/\| 137 slug variants/, `| ${bestOfCount} slug variants`);
md = md.replace(/Total rows to translate: \*\*\d+\*\*/, `Total rows to translate: **${totalRows}**`);

fs.writeFileSync(SPEC, md);
console.log(`Updated ${SPEC} (cats=${ofCatCount}, best-of=${bestOfCount}, categories=${categoryCount}, countries=${countryCount})`);
