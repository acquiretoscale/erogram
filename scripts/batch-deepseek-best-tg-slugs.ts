#!/usr/bin/env npx tsx
/**
 * Batch-generate Best TG localized slugs via DeepSeek (native language — NO English leftovers).
 *
 *   npx tsx scripts/batch-deepseek-best-tg-slugs.ts
 *   npx tsx scripts/batch-deepseek-best-tg-slugs.ts --locale pt
 */
import fs from 'fs';
import path from 'path';
import {
  BEST_TG_SLUG_LOCKED,
  BEST_TG_CATEGORIES,
  buildBestTgSlugSystemPrompt,
  buildBestTgSlugUserPrompt,
  isBannedSlugToken,
  hasUntranslatedEnglish,
  normalizeSlugOutput,
  BEST_TG_SLUG_RANK_PREFIX,
  type BestTgSlugLocale,
} from '../lib/bestTelegramGroups/bestTgSlugFramework';

const ROOT = path.resolve(__dirname, '..');
const STORE = path.join(ROOT, 'lib/bestTelegramGroups/slugTranslations.ts');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const localeFilter = args.includes('--locale') ? (args[args.indexOf('--locale') + 1] as BestTgSlugLocale) : null;
const LOCALES: BestTgSlugLocale[] = localeFilter ? [localeFilter] : ['de', 'es', 'pt'];

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-6dc28d2672fe4b6ca195f34e5f462a7b';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

type SlugStore = Record<string, { de?: string; es?: string; pt?: string }>;

function readStore() {
  const src = fs.readFileSync(STORE, 'utf8');
  const start = src.indexOf('BEST_TG_SLUG_TRANSLATIONS');
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

function needsRegen(cur: string): boolean {
  if (!cur) return true;
  if (!cur.startsWith(BEST_TG_SLUG_RANK_PREFIX)) return true;
  if (hasUntranslatedEnglish(cur)) return true;
  if (cur.includes('-telegram-telegram-')) return true;
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
    `export const BEST_TG_SLUG_TRANSLATIONS: Record<string, { de?: string; es?: string; pt?: string }> = {\n${entries}\n};\n${footer}`,
    'utf8',
  );
}

async function main() {
  const { store, footer } = readStore();

  for (const [slug, locs] of Object.entries(BEST_TG_SLUG_LOCKED)) {
    if (!store[slug]) store[slug] = {};
    Object.assign(store[slug], locs);
  }

  const BATCH = 12;

  for (const locale of LOCALES) {
    const missing = BEST_TG_CATEGORIES.filter((p) => {
      if (BEST_TG_SLUG_LOCKED[p.slug]?.[locale]) return false;
      return needsRegen(store[p.slug]?.[locale] || '');
    });

    if (missing.length === 0) {
      console.log(`[${locale}] nothing to generate`);
      continue;
    }

    console.log(`[${locale}] generating ${missing.length} slugs...`);

    for (let i = 0; i < missing.length; i += BATCH) {
      const chunk = missing.slice(i, i + BATCH);
      const system = buildBestTgSlugSystemPrompt(locale);
      const user = buildBestTgSlugUserPrompt(chunk, locale);

      if (dryRun) {
        console.log(`\n--- ${locale} ---\n${user}\n`);
        continue;
      }

      let lines: string[] | undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
        const raw = await callDeepSeek(system, user);
        lines = raw
          .split('\n')
          .map((l) => l.replace(/^\d+[\.)]\s*/, '').trim())
          .filter(Boolean)
          .map(normalizeSlugOutput);
        if (lines.length === chunk.length) break;
        console.warn(`[${locale}] retry — got ${lines.length}/${chunk.length}`);
      }

      if (!lines || lines.length !== chunk.length) {
        console.error(`[${locale}] batch failed at ${i}`);
        continue;
      }

      for (let j = 0; j < chunk.length; j++) {
        const slug = chunk[j].slug;
        const val = lines[j];
        if (isBannedSlugToken(val)) {
          console.error(`[${locale}] BANNED ${slug}: ${val}`);
          continue;
        }
        if (hasUntranslatedEnglish(val)) {
          console.error(`[${locale}] ENGLISH LEFT ${slug}: ${val}`);
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
