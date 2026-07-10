#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const EROGRAM = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const BANNED = /\b(putas?|schlampen|schlampe|huren|hure|fotze|fotzen|bitch|perras?|zorras?|safadas?|vadias?|sluts?|whores?)\b/i;

const NICHE = {
  latina: { de: "latina", es: "latinas", pt: "latinas" },
  blonde: { de: "blondinen", es: "rubias", pt: "loiras" },
  brunette: { de: "bruenette", es: "morenas", pt: "morenas" },
  redhead: { de: "rothaarige", es: "pelirrojas", pt: "ruivas" },
  "big-ass": { de: "grosser-arsch", es: "culos-grandes", pt: "rabudas" },
  "big-boobs": { de: "grosse-titten", es: "tetonas", pt: "peitudas" },
  "big-booty": { de: "grosser-po", es: "culos-grandes", pt: "rabudas" },
  "big-tits": { de: "grosse-titten", es: "tetonas", pt: "peitudas" },
  busty: { de: "busty", es: "pechugonas", pt: "peitudas" },
  milf: { de: "milf", es: "maduras", pt: "milf" },
  teen: { de: "teen", es: "jovenes", pt: "jovens" },
  asian: { de: "asiatische", es: "asiaticas", pt: "asiaticas" },
  ebony: { de: "ebony", es: "negras", pt: "negras" },
  goth: { de: "gothic", es: "goticas", pt: "goth" },
  thick: { de: "kurvig", es: "curvilíneas", pt: "grossas" },
  cosplay: { de: "cosplay", es: "cosplay", pt: "cosplay" },
  amateur: { de: "amateur", es: "amateur", pt: "amadoras" },
  fitness: { de: "fitness", es: "fitness", pt: "fitness" },
  lesbian: { de: "lesben", es: "lesbianas", pt: "lesbicas" },
  petite: { de: "petite", es: "petite", pt: "petite" },
  feet: { de: "fuss", es: "pies", pt: "pes" },
  lingerie: { de: "lingerie", es: "lenceria", pt: "lingerie" },
  anal: { de: "anal", es: "anal", pt: "anal" },
  bdsm: { de: "bdsm", es: "bdsm", pt: "bdsm" },
  joi: { de: "joi", es: "joi", pt: "joi" },
  alt: { de: "alt", es: "alt", pt: "alt" },
  curvy: { de: "kurvig", es: "curvilíneas", pt: "curvilíneas" },
  tattoo: { de: "tattoo", es: "tatuajes", pt: "tatuagens" },
  piercing: { de: "piercing", es: "piercing", pt: "piercing" },
  squirt: { de: "squirt", es: "squirt", pt: "squirt" },
  twerk: { de: "twerk", es: "twerk", pt: "twerk" },
  streamer: { de: "streamer", es: "streamer", pt: "streamer" },
  bbw: { de: "bbw", es: "gorditas", pt: "gordinhas" },
  chubby: { de: "kurvig", es: "gorditas", pt: "gordinhas" },
};

function niche(slug, locale) {
  return NICHE[slug]?.[locale] || slug;
}

function hottest(slug, locale) {
  const n = niche(slug, locale);
  if (locale === "de") return `heisseste-${n}-onlyfans-models`;
  if (locale === "es") return `modelos-${n}-onlyfans-mas-calientes`;
  return `melhores-${n}-onlyfans-modelos`;
}

function ofCat(slug, locale) {
  const n = niche(slug, locale);
  if (locale === "de") return `beste-${n}-onlyfans-accounts`;
  if (locale === "es") return `mejores-cuentas-${n}-onlyfans`;
  return `melhores-contas-${n}-onlyfans`;
}

function bestTg(slug, locale) {
  const n = niche(slug, locale);
  if (locale === "de") return `beste-${n}-telegram-gruppen`;
  if (locale === "es") return `mejores-grupos-${n}-telegram`;
  return `melhores-grupos-${n}-telegram`;
}

function ainsfw(key, locale) {
  const en = key.replace(/^ainsfw:/, "");
  const base = en.replace(/^ai-/, locale === "de" ? "ki-" : "ia-");
  if (locale === "de") return `${base}-test`;
  if (locale === "es") return `${base}-resena`;
  return `${base}-analise`;
}

function readStore(file, constName) {
  const src = fs.readFileSync(file, "utf8");
  const start = src.indexOf(constName);
  const braceStart = src.indexOf("{", src.indexOf("=", start));
  let depth = 0;
  let end = braceStart;
  for (let i = braceStart; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  return new Function(`return (${src.slice(braceStart, end + 1)});`)();
}

function writeStore(file, constName, store, footer) {
  if (fs.existsSync(file)) fs.copyFileSync(file, file.replace(/\.ts$/, ".bak.ts"));
  const entries = Object.entries(store)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  ${JSON.stringify(k)}: { de: ${JSON.stringify(v.de || "")}, es: ${JSON.stringify(v.es || "")}, pt: ${JSON.stringify(v.pt || "")} },`)
    .join("\n");
  fs.writeFileSync(file, `export const ${constName}: Record<string, { de?: string; es?: string; pt?: string }> = {\n${entries}\n};\n${footer}`, "utf8");
}

function isBad(s) {
  return BANNED.test(s || "");
}

const hottestFile = path.join(EROGRAM, "lib/bestOfPageContent/slugTranslations.ts");
const hottestOld = readStore(hottestFile, "SLUG_TRANSLATIONS");
const hottestNew = {};
for (const slug of Object.keys(hottestOld)) {
  hottestNew[slug] = { de: hottest(slug, "de"), es: hottest(slug, "es"), pt: hottest(slug, "pt") };
}
writeStore(hottestFile, "SLUG_TRANSLATIONS", hottestNew, `export function getLocalizedSlug(slug: string, locale: 'de' | 'es' | 'pt') {
  return SLUG_TRANSLATIONS[slug]?.[locale] ?? null;
}
export function resolveBestOfSlugFromPublicSegment(segment: string): string | null {
  for (const [slug, tr] of Object.entries(SLUG_TRANSLATIONS)) {
    if (tr.de === segment || tr.es === segment || tr.pt === segment) return slug;
  }
  return null;
}
`);

const ofFile = path.join(EROGRAM, "lib/bestOnlyfansAccounts/slugTranslations.ts");
const ofOld = readStore(ofFile, "OF_CATEGORY_SLUG_TRANSLATIONS");
const ofNew = {};
for (const slug of Object.keys(ofOld)) ofNew[slug] = { de: ofCat(slug, "de"), es: ofCat(slug, "es"), pt: ofCat(slug, "pt") };
writeStore(ofFile, "OF_CATEGORY_SLUG_TRANSLATIONS", ofNew, `export function getLocalizedOfCategorySlug(slug: string, locale: 'de' | 'es' | 'pt') {
  return OF_CATEGORY_SLUG_TRANSLATIONS[slug]?.[locale] ?? null;
}
export function resolveOfCategorySlugFromPublicSegment(segment: string): string | null {
  if (OF_CATEGORY_SLUG_TRANSLATIONS[segment]) return segment;
  for (const [slug, tr] of Object.entries(OF_CATEGORY_SLUG_TRANSLATIONS)) {
    if (tr.de === segment || tr.es === segment || tr.pt === segment) return slug;
  }
  return null;
}
`);

const tgFile = path.join(EROGRAM, "lib/bestTelegramGroups/slugTranslations.ts");
const tgOld = readStore(tgFile, "BEST_TG_SLUG_TRANSLATIONS");
const tgNew = {};
for (const slug of Object.keys(tgOld)) tgNew[slug] = { de: bestTg(slug, "de"), es: bestTg(slug, "es"), pt: bestTg(slug, "pt") };
writeStore(tgFile, "BEST_TG_SLUG_TRANSLATIONS", tgNew, `export function getLocalizedBestTgSlug(slug: string, locale: 'de' | 'es' | 'pt') {
  return BEST_TG_SLUG_TRANSLATIONS[slug]?.[locale] ?? null;
}
export function resolveBestTgSlugFromPublicSegment(segment: string): string | null {
  if (BEST_TG_SLUG_TRANSLATIONS[segment]) return segment;
  for (const [slug, tr] of Object.entries(BEST_TG_SLUG_TRANSLATIONS)) {
    if (tr.de === segment || tr.es === segment || tr.pt === segment) return slug;
  }
  return null;
}
`);

const listFile = path.join(EROGRAM, "lib/i18n/listingSlugTranslations.ts");
const listOld = readStore(listFile, "LISTING_SLUG_TRANSLATIONS");
const listNew = { ...listOld };
let ainsfwFixed = 0;
for (const [key, val] of Object.entries(listOld)) {
  if (!key.startsWith("ainsfw:")) continue;
  if (isBad(val.de) || isBad(val.es) || isBad(val.pt)) {
    listNew[key] = {
      de: val.de?.trim() ? ainsfw(key, "de") : "",
      es: val.es?.trim() ? ainsfw(key, "es") : "",
      pt: val.pt?.trim() ? ainsfw(key, "pt") : "",
    };
    ainsfwFixed++;
  }
}
const listSrc = fs.readFileSync(listFile, "utf8");
const footerStart = listSrc.indexOf("export type ListingSlugType");
writeStore(listFile, "LISTING_SLUG_TRANSLATIONS", listNew, listSrc.slice(footerStart));

console.log(`hottest-of: ${Object.keys(hottestNew).length}, of-category: ${Object.keys(ofNew).length}, best-tg: ${Object.keys(tgNew).length}, ainsfw fixed: ${ainsfwFixed}`);

for (const f of [hottestFile, ofFile, tgFile, listFile]) {
  const m = fs.readFileSync(f, "utf8").match(/\b(putas?|schlampen|fotze|fotzen|huren|safadas|bitch)\b/gi);
  if (m) console.error(`BAD ${path.basename(f)}: ${m.length}`);
  else console.log(`OK ${path.basename(f)}`);
}
