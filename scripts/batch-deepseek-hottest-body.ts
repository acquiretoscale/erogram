#!/usr/bin/env npx tsx
/**
 * Batch-generate hottest OF hero body (heroIntro + bottomBody) via DeepSeek.
 *
 * Uses the SAME anti-English-leak framework as the slug generator:
 *   - sends the ALREADY-LOCALIZED niche term (never the raw English label)
 *   - forbids the English label by name in the prompt
 *   - post-generation guard `bodyHasUntranslatedNiche` → auto-retry, else skip
 *
 * Usage:
 *   npx tsx scripts/batch-deepseek-hottest-body.ts --dry-run
 *   npx tsx scripts/batch-deepseek-hottest-body.ts --locale es
 *   npx tsx scripts/batch-deepseek-hottest-body.ts            # es + pt
 */
import fs from 'fs';
import path from 'path';
import {
  buildHottestBodySystemPrompt,
  buildHottestBodyUserPrompt,
  bodyHasUntranslatedNiche,
  type HottestSlugLocale,
} from '../lib/bestOfPageContent/hottestSlugFramework';
import { TAG_LABEL_TRANSLATIONS } from '../lib/tags/labelTranslations';

const ROOT = path.resolve(__dirname, '..');
const STORE = path.join(ROOT, 'lib/bestOfPageContent/bodyTranslations.ts');
const PAGES = path.join(ROOT, 'app/best-onlyfans-accounts/bestOfPages.ts');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const localeFilter = args.includes('--locale') ? (args[args.indexOf('--locale') + 1] as HottestSlugLocale) : null;
const LOCALES: HottestSlugLocale[] = localeFilter ? [localeFilter] : ['es', 'pt'];

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-6dc28d2672fe4b6ca195f34e5f462a7b';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

interface BodySet { heroIntro: string; bottomBody: string; }
type Store = Record<string, { de?: BodySet; es?: BodySet; pt?: BodySet }>;

function readStore(): { store: Store; header: string; footer: string } {
  const src = fs.readFileSync(STORE, 'utf8');
  const start = src.indexOf('BODY_TRANSLATIONS');
  const braceStart = src.indexOf('{', src.indexOf('=', start));
  let depth = 0;
  let end = braceStart;
  for (let i = braceStart; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  const store = new Function(`return (${src.slice(braceStart, end + 1)});`)() as Store;
  return { store, header: src.slice(0, braceStart), footer: src.slice(end + 1) };
}

function readPages(): { slug: string; label: string }[] {
  const src = fs.readFileSync(PAGES, 'utf8');
  const block = src.slice(src.indexOf('BEST_OF_PAGES'));
  const re = /"slug": "([^"]+)"[\s\S]*?"label": "([^"]+)"/g;
  const out: { slug: string; label: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) out.push({ slug: m[1], label: m[2] });
  return out;
}

async function callDeepSeek(system: string, user: string): Promise<string> {
  const res = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.4,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || '').trim();
}

function writeStore(store: Store, header: string, footer: string) {
  if (fs.existsSync(STORE)) fs.copyFileSync(STORE, STORE.replace(/\.ts$/, '.bak.ts'));
  const entries = Object.entries(store)
    .map(([slug, v]) => `  ${JSON.stringify(slug)}: ${JSON.stringify(v)},`)
    .join('\n');
  fs.writeFileSync(STORE, `${header}{\n${entries}\n}${footer}`, 'utf8');
}

async function main() {
  const { store, header, footer } = readStore();
  const pages = readPages();

  for (const locale of LOCALES) {
    const missing = pages.filter((p) => {
      const native = TAG_LABEL_TRANSLATIONS[p.slug]?.[locale];
      if (!native) return false; // no localized label yet → nothing to anchor on
      return !store[p.slug]?.[locale]?.heroIntro?.trim();
    });

    if (!missing.length) { console.log(`[${locale}] nothing to generate`); continue; }
    console.log(`[${locale}] generating ${missing.length} hero bodies...`);

    for (const p of missing) {
      const native = TAG_LABEL_TRANSLATIONS[p.slug]![locale]!;
      const system = buildHottestBodySystemPrompt(locale);
      const user = buildHottestBodyUserPrompt({ slug: p.slug, enLabel: p.label, nativeNiche: native }, locale);

      if (dryRun) {
        console.log(`\n--- ${locale} / ${p.slug} (native: ${native}, forbid: ${p.label}) ---\n${user}\n`);
        continue;
      }

      let ok: BodySet | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        let parsed: BodySet;
        try {
          parsed = JSON.parse(await callDeepSeek(system, user));
        } catch { console.warn(`[${locale}] ${p.slug} bad JSON, retry`); continue; }
        const leak =
          bodyHasUntranslatedNiche(parsed.heroIntro || '', p.label, native) ||
          bodyHasUntranslatedNiche(parsed.bottomBody || '', p.label, native);
        if (leak) { console.warn(`[${locale}] ${p.slug} ENGLISH LEAK ("${p.label}"), retry`); continue; }
        if (!parsed.heroIntro?.trim()) { console.warn(`[${locale}] ${p.slug} empty, retry`); continue; }
        ok = { heroIntro: parsed.heroIntro.trim(), bottomBody: (parsed.bottomBody || '').trim() };
        break;
      }

      if (!ok) { console.error(`[${locale}] ${p.slug} FAILED after 3 attempts — skipped`); continue; }
      if (!store[p.slug]) store[p.slug] = {};
      store[p.slug][locale] = ok;
      console.log(`  ${p.slug} ✓ (${native})`);
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  if (!dryRun) { writeStore(store, header, footer); console.log('\nWrote', STORE); }
}

main().catch((e) => { console.error(e); process.exit(1); });
