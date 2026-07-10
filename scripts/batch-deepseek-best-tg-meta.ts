#!/usr/bin/env npx tsx
/**
 * Batch-generate Best TG meta descriptions (EN/DE/ES/PT) via DeepSeek.
 *
 *   npx tsx scripts/batch-deepseek-best-tg-meta.ts
 */
import fs from 'fs';
import path from 'path';
import {
  BEST_TG_CATEGORIES,
  BEST_TG_META_LOCKED,
  buildBestTgMetaSystemPrompt,
  buildBestTgMetaUserPrompt,
  parseMetaJson,
  validateMetaSet,
  isOldMetaPattern,
  type BestTgMetaSet,
} from '../lib/bestTelegramGroups/bestTgMetaFramework';

const ROOT = path.resolve(__dirname, '..');
const STORE = path.join(ROOT, 'lib/bestTelegramGroups/metaDescriptions.ts');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const forceAll = args.includes('--all');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-6dc28d2672fe4b6ca195f34e5f462a7b';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

type MetaStore = Record<string, BestTgMetaSet>;

function readStore(): { store: MetaStore; footer: string } {
  const src = fs.readFileSync(STORE, 'utf8');
  const start = src.indexOf('META_DESCRIPTIONS');
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
    store: new Function(`return (${src.slice(braceStart, end + 1)});`)() as MetaStore,
    footer: src.slice(end + 1),
  };
}

function writeStore(store: MetaStore, footer: string) {
  if (fs.existsSync(STORE)) fs.copyFileSync(STORE, STORE.replace(/\.ts$/, '.bak.ts'));
  const entries = Object.entries(store)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, m]) => {
      return `  ${JSON.stringify(slug)}: {\n    en: ${JSON.stringify(m.en)},\n    de: ${JSON.stringify(m.de)},\n    es: ${JSON.stringify(m.es)},\n    pt: ${JSON.stringify(m.pt)}\n  },`;
    })
    .join('\n');
  const footerClean = footer.replace(/^;\s*/, '').trimStart();
  const iface = `export interface BestTgMetaSet { en: string; de: string; es: string; pt: string; }\n\n`;
  fs.writeFileSync(
    STORE,
    `${iface}export const META_DESCRIPTIONS: Record<string, BestTgMetaSet> = {\n${entries}\n};\n\n${footerClean}`,
    'utf8',
  );
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
      temperature: 0.35,
      max_tokens: 8192,
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || '').trim();
}

async function main() {
  const { store, footer } = readStore();

  Object.assign(store, BEST_TG_META_LOCKED);

  const todo = BEST_TG_CATEGORIES.filter((c) => forceAll || isOldMetaPattern(store[c.slug]));
  if (todo.length === 0) {
    console.log('nothing to generate');
    return;
  }

  console.log(`generating meta for ${todo.length} categories...`);
  const system = buildBestTgMetaSystemPrompt();
  const BATCH = 6;

  for (let i = 0; i < todo.length; i += BATCH) {
    const chunk = todo.slice(i, i + BATCH);
    const user = buildBestTgMetaUserPrompt(chunk);

    if (dryRun) {
      console.log(user);
      continue;
    }

    let rows: BestTgMetaSet[] | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await callDeepSeek(system, user);
        rows = parseMetaJson(raw);
        if (rows.length === chunk.length) break;
        console.warn(`retry — got ${rows.length}/${chunk.length}`);
      } catch (e) {
        console.warn(`parse retry:`, (e as Error).message);
      }
    }

    if (!rows || rows.length !== chunk.length) {
      console.error(`batch failed at ${i}`);
      continue;
    }

    for (let j = 0; j < chunk.length; j++) {
      const key = chunk[j].slug;
      const row = rows[j];
      const meta: BestTgMetaSet = {
        en: row.en?.trim() || '',
        de: row.de?.trim() || '',
        es: row.es?.trim() || '',
        pt: row.pt?.trim() || '',
      };
      const err = validateMetaSet(key, meta);
      if (err) {
        console.error(`skip ${key}: ${err}`);
        continue;
      }
      store[key] = meta;
      console.log(`  ${key} ✓`);
    }

    await new Promise((r) => setTimeout(r, 500));
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
