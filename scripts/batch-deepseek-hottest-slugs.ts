#!/usr/bin/env npx tsx
/**
 * Batch-generate hottest OF localized slugs via DeepSeek.
 *
 * Usage:
 *   npx tsx scripts/batch-deepseek-hottest-slugs.ts
 *   npx tsx scripts/batch-deepseek-hottest-slugs.ts --locale de
 *   npx tsx scripts/batch-deepseek-hottest-slugs.ts --dry-run
 */
import fs from 'fs';
import path from 'path';
import {
  HOTTEST_SLUG_LOCKED,
  buildHottestSlugSystemPrompt,
  buildHottestSlugUserPrompt,
  isBannedSlugToken,
  hasUntranslatedEnglish,
  normalizeSlugOutput,
  HOTTEST_SLUG_RANK_PREFIX,
  type HottestSlugLocale,
} from '../lib/bestOfPageContent/hottestSlugFramework';

const ROOT = path.resolve(__dirname, '..');
const STORE = path.join(ROOT, 'lib/bestOfPageContent/slugTranslations.ts');
const PAGES = path.join(ROOT, 'app/best-onlyfans-accounts/bestOfPages.ts');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const localeFilter = args.includes('--locale') ? (args[args.indexOf('--locale') + 1] as HottestSlugLocale) : null;
const LOCALES: HottestSlugLocale[] = localeFilter ? [localeFilter] : ['de', 'es', 'pt'];

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-6dc28d2672fe4b6ca195f34e5f462a7b';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

type SlugStore = Record<string, { de?: string; es?: string; pt?: string }>;

function readStore() {
  const src = fs.readFileSync(STORE, 'utf8');
  const start = src.indexOf('SLUG_TRANSLATIONS');
  const braceStart = src.indexOf('{', src.indexOf('=', start));
  let depth = 0;
  let end = braceStart;
  for (let i = braceStart; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  return {
    store: new Function(`return (${src.slice(braceStart, end + 1)});`)() as SlugStore,
    footer: src.slice(end + 1),
  };
}

function readPages() {
  const src = fs.readFileSync(PAGES, 'utf8');
  const block = src.slice(src.indexOf('BEST_OF_PAGES'));
  const re = /"slug": "([^"]+)"[\s\S]*?"label": "([^"]+)"/g;
  const pages: { slug: string; label: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) pages.push({ slug: m[1], label: m[2] });
  return pages;
}

function isOldPattern(cur: string, locale: HottestSlugLocale): boolean {
  if (!cur) return true;
  if (!cur.startsWith(HOTTEST_SLUG_RANK_PREFIX)) return true;
  // Any English nationality/adjective still in the slug → regenerate.
  if (hasUntranslatedEnglish(cur, locale)) return true;
  if (locale === 'pt') return cur.startsWith(`${HOTTEST_SLUG_RANK_PREFIX}melhores-`) || !cur.includes('modelos-onlyfans');
  if (locale === 'es') return !cur.includes('modelos-onlyfans');
  return false;
}

async function callDeepSeek(system: string, user: string) {
  const res = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.25,
      max_tokens: 4096,
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || '').trim();
}

function writeStore(store: SlugStore, footer: string) {
  if (fs.existsSync(STORE)) fs.copyFileSync(STORE, STORE.replace(/\.ts$/, '.bak.ts'));
  const entries = Object.entries(store)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([k, v]) =>
        `  ${JSON.stringify(k)}: { de: ${JSON.stringify(v.de || '')}, es: ${JSON.stringify(v.es || '')}, pt: ${JSON.stringify(v.pt || '')} },`,
    )
    .join('\n');
  fs.writeFileSync(
    STORE,
    `export const SLUG_TRANSLATIONS: Record<string, { de?: string; es?: string; pt?: string }> = {\n${entries}\n};\n${footer}`,
    'utf8',
  );
}

async function main() {
  const { store, footer } = readStore();
  const pages = readPages();

  for (const [slug, locs] of Object.entries(HOTTEST_SLUG_LOCKED)) {
    if (!store[slug]) store[slug] = {};
    Object.assign(store[slug], locs);
  }

  const BATCH = 15;

  for (const locale of LOCALES) {
    const missing = pages.filter((p) => {
      if (HOTTEST_SLUG_LOCKED[p.slug]?.[locale]) return false;
      return isOldPattern(store[p.slug]?.[locale] || '', locale);
    });

    if (missing.length === 0) {
      console.log(`[${locale}] nothing to generate`);
      continue;
    }

    console.log(`[${locale}] generating ${missing.length} slugs...`);

    for (let i = 0; i < missing.length; i += BATCH) {
      const chunk = missing.slice(i, i + BATCH);
      const items = chunk.map((p) => ({
        slug: p.slug,
        label: p.label,
        enSegment: `hottest-${p.slug}-onlyfans-models`,
      }));

      const system = buildHottestSlugSystemPrompt(locale);
      const user = buildHottestSlugUserPrompt(items, locale);

      if (dryRun) {
        console.log(`\n--- ${locale} batch ${i / BATCH + 1} ---\n${system.slice(0, 400)}...\n${user}\n`);
        continue;
      }

      let lines: string[] | undefined;
      for (let attempt = 0; attempt < 2; attempt++) {
        const raw = await callDeepSeek(system, user);
        lines = raw
          .split('\n')
          .map((l) => l.replace(/^\d+[\.)]\s*/, '').trim())
          .filter(Boolean)
          .map(normalizeSlugOutput);
        if (lines.length === chunk.length) break;
        console.warn(`[${locale}] retry — got ${lines.length}/${chunk.length} lines`);
      }

      if (!lines || lines.length !== chunk.length) {
        console.error(`[${locale}] batch failed at offset ${i}`);
        continue;
      }

      for (let j = 0; j < chunk.length; j++) {
        const slug = chunk[j].slug;
        const val = lines[j];
        if (isBannedSlugToken(val)) {
          console.error(`[${locale}] BANNED token in ${slug}: ${val}`);
          continue;
        }
        if (hasUntranslatedEnglish(val, locale)) {
          console.error(`[${locale}] ENGLISH LEFT in ${slug}: ${val}`);
          continue;
        }
        if (!store[slug]) store[slug] = {};
        store[slug][locale] = val;
        console.log(`  ${slug} → ${val}`);
      }

      await new Promise((r) => setTimeout(r, 400));
    }
  }

  if (!dryRun) {
    writeStore(store, footer);
    console.log('\nWrote', STORE);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
