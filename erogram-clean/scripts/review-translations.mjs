#!/usr/bin/env node
/**
 * Review & fix DE/ES locale translations using Qwen3-Max.
 * Sends each section separately to avoid payload limits.
 *
 * Usage: QWEN_API_KEY=sk-xxx node scripts/review-translations.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = resolve(__dirname, '../lib/i18n/locales');

const API_KEY = process.env.QWEN_API_KEY;
if (!API_KEY) {
  console.error('ERROR: Set QWEN_API_KEY env var');
  process.exit(1);
}

const API_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';

async function callQwen(systemPrompt, userPrompt, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen3-max',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
          max_tokens: 8192,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await res.json();

      if (data.error) {
        throw new Error(`API: ${data.error.message}`);
      }

      const content = data.choices?.[0]?.message?.content?.trim() || '';
      console.log(`    tokens=${data.usage?.total_tokens || '?'}`);
      return content;
    } catch (err) {
      if (attempt < retries) {
        console.log(`    Retry ${attempt + 1}/${retries} after error: ${err.message}`);
        await new Promise(r => setTimeout(r, 3000));
      } else {
        throw err;
      }
    }
  }
}

function buildSystemPrompt(langName) {
  return `You are an expert ${langName} SEO translator and proofreader for Erogram.pro, an adult Telegram groups directory.

TASK: Review the ${langName} translation against English source. Fix ONLY what needs fixing:

1. TRANSLATION ERRORS — wrong meaning, mistranslations
2. UNNATURAL PHRASING — anything robotic or overly literal; use how native ${langName} speakers actually talk and search
3. SEO — meta titles/descriptions/headings must use keywords ${langName} speakers search on Google
4. BRAND NAMES — keep Erogram, Telegram, NSFW, Premium exactly as-is
5. PLACEHOLDERS — keep {category}, {country}, {seconds}, {month}, {year}, {count}, {type} exactly as-is
6. JSON KEYS — never change keys, only values

If a translation is already good, keep it exactly as-is. Do NOT rewrite correct text.

Return ONLY valid JSON. No markdown fences, no explanations.`;
}

function extractJson(text) {
  let cleaned = text.trim();
  // Strip thinking tags if present
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(cleaned);
}

function diffSection(original, reviewed, path = '') {
  let changes = 0;
  if (typeof original === 'string' && typeof reviewed === 'string') {
    if (original !== reviewed) {
      console.log(`    FIXED: ${path}`);
      console.log(`      WAS: ${original.substring(0, 100)}${original.length > 100 ? '...' : ''}`);
      console.log(`      NOW: ${reviewed.substring(0, 100)}${reviewed.length > 100 ? '...' : ''}`);
      changes++;
    }
  } else if (Array.isArray(original) && Array.isArray(reviewed)) {
    for (let i = 0; i < Math.max(original.length, reviewed.length); i++) {
      changes += diffSection(original[i], reviewed[i], `${path}[${i}]`);
    }
  } else if (typeof original === 'object' && typeof reviewed === 'object' && original && reviewed) {
    for (const k of new Set([...Object.keys(original), ...Object.keys(reviewed)])) {
      changes += diffSection(original[k], reviewed[k], path ? `${path}.${k}` : k);
    }
  }
  return changes;
}

async function reviewSection(sectionKey, enSection, translatedSection, langName) {
  const userPrompt = `ENGLISH SOURCE for "${sectionKey}":
${JSON.stringify(enSection, null, 2)}

CURRENT ${langName.toUpperCase()} TRANSLATION for "${sectionKey}":
${JSON.stringify(translatedSection, null, 2)}

Return the corrected "${sectionKey}" JSON object only.`;

  const response = await callQwen(buildSystemPrompt(langName), userPrompt);
  return extractJson(response);
}

async function reviewLanguage(langCode, langName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`REVIEWING: ${langName} (${langCode})`);
  console.log('='.repeat(60));

  const enJson = JSON.parse(readFileSync(resolve(LOCALES_DIR, 'en.json'), 'utf8'));
  const translatedJson = JSON.parse(readFileSync(resolve(LOCALES_DIR, `${langCode}.json`), 'utf8'));

  // Backup
  const backupPath = resolve(LOCALES_DIR, `${langCode}_backup.json`);
  writeFileSync(backupPath, JSON.stringify(translatedJson, null, 2), 'utf8');
  console.log(`  Backup: ${backupPath}`);

  const sections = Object.keys(enJson);
  const reviewed = {};
  let totalChanges = 0;

  for (const section of sections) {
    if (!translatedJson[section]) {
      console.log(`\n  [${section}] — MISSING in ${langCode}, skipping`);
      continue;
    }
    console.log(`\n  [${section}] — reviewing...`);

    try {
      const fixed = await reviewSection(section, enJson[section], translatedJson[section], langName);
      reviewed[section] = fixed;
      const changes = diffSection(translatedJson[section], fixed, section);
      totalChanges += changes;
      if (changes === 0) console.log(`    No changes needed.`);
    } catch (err) {
      console.error(`    ERROR: ${err.message} — keeping original`);
      reviewed[section] = translatedJson[section];
    }

    // Rate limit pause between sections
    await new Promise(r => setTimeout(r, 1000));
  }

  // Write updated file
  writeFileSync(resolve(LOCALES_DIR, `${langCode}.json`), JSON.stringify(reviewed, null, 2), 'utf8');
  console.log(`\n  TOTAL CHANGES: ${totalChanges}`);
  console.log(`  Written: ${langCode}.json`);

  return totalChanges;
}

async function main() {
  console.log('Qwen3-Max Translation Review');
  console.log(`Endpoint: ${API_URL}\n`);

  const deChanges = await reviewLanguage('de', 'German');
  const esChanges = await reviewLanguage('es', 'Spanish');

  console.log(`\n${'='.repeat(60)}`);
  console.log('DONE');
  console.log(`  German:  ${deChanges ?? 'FAILED'} fixes`);
  console.log(`  Spanish: ${esChanges ?? 'FAILED'} fixes`);
  console.log(`  Backups: de_backup.json, es_backup.json`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
