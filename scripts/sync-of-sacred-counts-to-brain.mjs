#!/usr/bin/env node
/** Regenerate brain/marble/of-sacred-creator-counts.* from live Mongo. Owner-ordered sacred inventory. */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');
execSync('npx tsx tmp/count-of-categories.ts', { cwd: root, stdio: 'inherit' });
execSync('npx tsx tmp/count-of-totals.ts > tmp/of-totals.json', { cwd: root, shell: true });

const rows = JSON.parse(fs.readFileSync(path.join(root, 'tmp/of-category-counts.json'), 'utf8'));
const totals = JSON.parse(fs.readFileSync(path.join(root, 'tmp/of-totals.json'), 'utf8'));
const today = new Date().toISOString().slice(0, 10);

const meta = {
  id: 'of-sacred-creator-counts',
  generated: today,
  query: 'buildSlugCreatorMatch(slug) per OF_CATEGORIES slug',
  source: 'app/onlyfanssearch/constants.ts + lib/onlyfanssearch/keywordCategories.ts',
  refresh: 'npx tsx scripts/sync-of-sacred-counts-to-brain.mjs',
  dataFile: 'brain/marble/of-sacred-creator-counts.jsonl',
  dbTotal: totals.total,
  publicBrowsePool: totals.publicBrowse,
  categoriesTotal: rows.length,
  categoriesWithCreators: rows.filter((r) => r.count > 0).length,
  categoriesEmpty: rows.filter((r) => r.count === 0).length,
  emptySlugs: rows.filter((r) => r.count === 0).map((r) => r.slug),
};

const marbleDir = path.join(root, 'brain/marble');
fs.mkdirSync(marbleDir, { recursive: true });
fs.writeFileSync(path.join(marbleDir, 'of-sacred-creator-counts.meta.json'), JSON.stringify(meta, null, 2));
const lines = [...rows]
  .sort((a, b) => b.count - a.count)
  .map((r) => JSON.stringify({ slug: r.slug, name: r.name, count: r.count }));
fs.writeFileSync(path.join(marbleDir, 'of-sacred-creator-counts.jsonl'), `${lines.join('\n')}\n`);
console.log(`brain/marble updated: ${lines.length} categories, dbTotal=${totals.total}`);
