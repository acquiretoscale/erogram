import fs from 'fs';
import path from 'path';

const DEEPSEEK_KEY = 'sk-6dc28d2672fe4b6ca195f34e5f462a7b';
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

const strings = JSON.parse(fs.readFileSync('/tmp/ainsfw-strings.json', 'utf8'));

async function translateBatch(lang, langName) {
  const systemPrompt = `You are a professional translator for Erogram.pro, an adult AI tools directory. Translate ONLY the values of the JSON object from English to ${langName}. Keep all JSON keys unchanged. Keep brand names (DreamGF, FantasyGF, CrushOn.AI, Clothoff.net, Nudify AI, SpicyChat, JuicyChat.AI, PepHop, NudeFab, Seduced, CreatePorn, RedQuill, Hyperdreams, Kink AI, Erogram.pro, Muah.AI) unchanged. Keep technical terms like "AI", "NSFW" unchanged. Output ONLY valid JSON, nothing else.`;

  const userPrompt = `Translate these UI strings to ${langName}:\n\n${JSON.stringify(strings, null, 2)}`;

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    console.error(`DeepSeek error for ${lang}:`, res.status, await res.text());
    return null;
  }

  const data = await res.json();
  let content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return null;

  // Strip markdown code fences if present
  content = content.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');

  try {
    return JSON.parse(content);
  } catch (e) {
    console.error(`Failed to parse ${lang} JSON:`, e.message);
    console.error('Raw:', content.slice(0, 500));
    return null;
  }
}

async function main() {
  console.log('Translating to German...');
  const de = await translateBatch('de', 'German');
  if (de) {
    console.log(`  DE: ${Object.keys(de).length} keys`);
    fs.writeFileSync('/tmp/ainsfw-de.json', JSON.stringify(de, null, 2));
  } else {
    console.error('DE translation failed');
    process.exit(1);
  }

  console.log('Translating to Spanish...');
  const es = await translateBatch('es', 'Spanish');
  if (es) {
    console.log(`  ES: ${Object.keys(es).length} keys`);
    fs.writeFileSync('/tmp/ainsfw-es.json', JSON.stringify(es, null, 2));
  } else {
    console.error('ES translation failed');
    process.exit(1);
  }

  // Now merge into locale files
  const LOCALE_DIR = path.join(process.cwd(), 'lib', 'i18n', 'locales');

  for (const [lang, translated] of [['en', strings], ['de', de], ['es', es]]) {
    const filePath = path.join(LOCALE_DIR, `${lang}.json`);
    const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    existing.ainsfw = translated;

    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2) + '\n');
    console.log(`Updated ${lang}.json with ainsfw section (${Object.keys(translated).length} keys)`);
  }

  console.log('\nDone. All 3 locale files updated.');
}

main();
