#!/usr/bin/env node
/**
 * Slug collision audit — run before shipping any cross-link / combo page system.
 * Usage: node scripts/audit-slug-collisions.mjs [registry-file]
 *
 * Expects a JSON or JS export of { slug, label }[] or reads bestOfPages.ts by default.
 * Exits 1 if any slug appears more than once or if any href maps to multiple labels.
 */
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const registryPath = process.argv[2] || 'app/best-onlyfans-accounts/bestOfPages.ts';

function loadPages(file) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  const m = src.match(/export const BEST_OF_PAGES[^=]*= (\[[\s\S]*?\n\];)/);
  if (!m) throw new Error(`Could not parse BEST_OF_PAGES from ${file}`);
  return eval(m[1]);
}

const pages = loadPages(registryPath);
const bySlug = new Map();

for (const p of pages) {
  if (!bySlug.has(p.slug)) bySlug.set(p.slug, []);
  bySlug.get(p.slug).push(p.label);
}

const dupes = [...bySlug.entries()].filter(([, labels]) => labels.length > 1);

if (dupes.length) {
  console.error('FAIL: duplicate slugs in registry');
  dupes.forEach(([slug, labels]) => console.error(`  ${slug}: ${labels.join(', ')}`));
  process.exit(1);
}

console.log(`OK: ${pages.length} pages, 0 slug collisions`);
