/* eslint-disable */
// ONE-SHOT FIX: replaces leftover English category names inside the DE/ES/PT
// hero-intro / bottom-body / meta-description strings with the correct
// localized label from lib/tags/labelTranslations.ts (same table used by /tags).
// No subagents, no per-page manual work — regex sweep across the two data files.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function loadTsModule(relPath) {
  const abs = path.join(__dirname, '..', relPath);
  const src = fs.readFileSync(abs, 'utf8');
  const out = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
  });
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', out.outputText)(mod, mod.exports, require);
  return mod.exports;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const { TAG_LABEL_TRANSLATIONS } = loadTsModule('lib/tags/labelTranslations.ts');

// slug -> English label, extracted directly from bestOfPages.ts source (avoids
// pulling in its Next.js-only imports).
const bestOfSrc = fs.readFileSync(path.join(__dirname, '..', 'app/best-onlyfans-accounts/bestOfPages.ts'), 'utf8');
const slugToLabel = {};
for (const m of bestOfSrc.matchAll(/"slug":\s*"([^"]+)",[\s\S]*?"label":\s*"([^"]+)"/g)) {
  slugToLabel[m[1]] = m[2];
}
console.log('Loaded', Object.keys(slugToLabel).length, 'best-of slugs.');

const LOCALES = ['de', 'es', 'pt'];

// ---------------------------------------------------------------------------
// 1) bodyTranslations.ts — one entry per line: "slug": { de: {...}, pt: {...} }
// ---------------------------------------------------------------------------
const bodyPath = path.join(__dirname, '..', 'lib/bestOfPageContent/bodyTranslations.ts');
let bodyChanges = 0;
{
  const lines = fs.readFileSync(bodyPath, 'utf8').split('\n');
  const newLines = lines.map((line) => {
    const slugMatch = line.match(/^\s*"([\w-]+)":\s*\{/);
    if (!slugMatch) return line;
    const slug = slugMatch[1];
    const enLabel = slugToLabel[slug];
    if (!enLabel) return line;
    const wordRe = new RegExp(`\\b${escapeRegExp(enLabel)}\\b`, 'gi');
    let newLine = line;
    for (const loc of LOCALES) {
      const localized = TAG_LABEL_TRANSLATIONS[slug]?.[loc];
      if (!localized) continue;
      const blockRe = new RegExp(
        `(${loc}:\\s*\\{\\s*heroIntro:\\s*")((?:[^"\\\\]|\\\\.)*)("\\s*,\\s*bottomBody:\\s*")((?:[^"\\\\]|\\\\.)*)("\\s*\\})`
      );
      newLine = newLine.replace(blockRe, (_full, p1, hero, mid, body, p5) => {
        const newHero = hero.replace(wordRe, localized);
        const newBody = body.replace(wordRe, localized);
        if (newHero !== hero || newBody !== body) bodyChanges++;
        return p1 + newHero + mid + newBody + p5;
      });
    }
    return newLine;
  });
  fs.writeFileSync(bodyPath, newLines.join('\n'));
}
console.log('bodyTranslations.ts: fixed', bodyChanges, 'locale blocks.');

// ---------------------------------------------------------------------------
// 2) metaDescriptions.ts — multi-line block per slug: "slug": { en: "", de: "", ... }
// ---------------------------------------------------------------------------
const metaPath = path.join(__dirname, '..', 'lib/bestOfPageContent/metaDescriptions.ts');
let metaChanges = 0;
{
  let src = fs.readFileSync(metaPath, 'utf8');
  src = src.replace(/"([\w-]+)":\s*\{([^}]*)\}/g, (fullMatch, slug, block) => {
    const enLabel = slugToLabel[slug];
    if (!enLabel) return fullMatch;
    const wordRe = new RegExp(`\\b${escapeRegExp(enLabel)}\\b`, 'gi');
    let newBlock = block;
    for (const loc of LOCALES) {
      const localized = TAG_LABEL_TRANSLATIONS[slug]?.[loc];
      if (!localized) continue;
      const lineRe = new RegExp(`(${loc}:\\s*")((?:[^"\\\\]|\\\\.)*)(")`);
      newBlock = newBlock.replace(lineRe, (_m, p1, text, p3) => {
        const newText = text.replace(wordRe, localized);
        if (newText !== text) metaChanges++;
        return p1 + newText + p3;
      });
    }
    return `"${slug}": {${newBlock}}`;
  });
  fs.writeFileSync(metaPath, src);
}
console.log('metaDescriptions.ts: fixed', metaChanges, 'locale strings.');
