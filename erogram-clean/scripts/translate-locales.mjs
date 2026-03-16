/**
 * Translate en.json → de.json + es.json using Qwen3-max.
 * Splits into chunks to avoid payload limits.
 * Run: QWEN_API_KEY=sk-xxx node scripts/translate-locales.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, '..', 'lib', 'i18n', 'locales');

const API_KEY = process.env.QWEN_API_KEY;
const BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';

if (!API_KEY) {
  console.error('Missing QWEN_API_KEY in environment');
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callQwen(systemPrompt, userContent, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen3-max',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          temperature: 0.3,
          max_tokens: 8192,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(JSON.stringify(data.error));
      return data.choices[0].message.content.trim();
    } catch (err) {
      console.error(`  Attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt < retries) {
        const delay = attempt * 3000;
        console.log(`  Retrying in ${delay / 1000}s...`);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
}

function buildSystemPrompt(langName) {
  return `You are an expert SEO-focused translator specializing in ${langName} web content for an adult Telegram groups directory called Erogram.

Rules:
- Translate the JSON values to natural, native ${langName} that real speakers would use in web searches
- Keep ALL JSON keys exactly as they are (English keys, do not translate keys)
- Preserve brand names: Erogram, Telegram, NSFW
- Use native phrasing over literal translation
- Keep {category} and {country} placeholders as-is
- For FAQ answers, make them sound natural in ${langName} while preserving the information
- Return ONLY valid JSON, no markdown code fences, no explanations`;
}

function parseJsonResponse(raw, label) {
  let cleaned = raw;
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  // Remove thinking tags if present
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>\s*/g, '');
  cleaned = cleaned.trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error(`Failed to parse JSON for ${label}`);
    console.error('Raw output (first 500 chars):', raw.substring(0, 500));
    throw e;
  }
}

async function translateChunk(sectionKey, sectionValue, targetLang) {
  const langName = targetLang === 'de' ? 'German' : 'Spanish';
  const systemPrompt = buildSystemPrompt(langName);

  const payload = { [sectionKey]: sectionValue };
  const userContent = JSON.stringify(payload, null, 2);

  console.log(`  Translating section "${sectionKey}" (${userContent.length} chars)...`);

  const result = await callQwen(systemPrompt, userContent);
  const parsed = parseJsonResponse(result, `${targetLang}/${sectionKey}`);

  if (parsed[sectionKey]) {
    return parsed[sectionKey];
  }
  return Object.values(parsed)[0] ?? parsed;
}

async function translateLocale(enJson, targetLang) {
  const langName = targetLang === 'de' ? 'German' : 'Spanish';
  console.log(`\nTranslating to ${langName}...\n`);

  const topKeys = Object.keys(enJson);
  const translated = {};

  for (const key of topKeys) {
    translated[key] = await translateChunk(key, enJson[key], targetLang);
    await sleep(1000);
  }

  return translated;
}

async function main() {
  const enPath = path.join(LOCALES_DIR, 'en.json');
  const enJson = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

  const topKeys = Object.keys(enJson);
  console.log(`Starting translation with Qwen3-max...`);
  console.log(`en.json has ${topKeys.length} sections: ${topKeys.join(', ')}\n`);

  // Translate sequentially to be safe
  const deJson = await translateLocale(enJson, 'de');

  fs.writeFileSync(
    path.join(LOCALES_DIR, 'de.json'),
    JSON.stringify(deJson, null, 2) + '\n',
  );
  console.log('\n✓ de.json written');

  const esJson = await translateLocale(enJson, 'es');

  fs.writeFileSync(
    path.join(LOCALES_DIR, 'es.json'),
    JSON.stringify(esJson, null, 2) + '\n',
  );
  console.log('\n✓ es.json written');

  console.log('\nDone! Review the output files in lib/i18n/locales/');
}

main().catch((err) => {
  console.error('Translation failed:', err);
  process.exit(1);
});
