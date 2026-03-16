import OpenAI from 'openai';

const qwen = new OpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
});

export type TranslationLang = 'de' | 'es';

const LANG_NAMES: Record<TranslationLang, string> = {
  de: 'German',
  es: 'Spanish',
};

/**
 * Translate text using Qwen3-max with SEO-optimized prompting.
 * Low temperature for consistency, explicit SEO instructions.
 */
export async function translateText(
  text: string,
  targetLang: TranslationLang,
  context?: string,
): Promise<string> {
  if (!text.trim()) return text;

  const langName = LANG_NAMES[targetLang];
  const contextNote = context ? `\nContent type: ${context}` : '';

  const res = await qwen.chat.completions.create({
    model: 'qwen3-max',
    messages: [
      {
        role: 'system',
        content: `You are an expert SEO-focused translator specializing in ${langName} web content.

Rules:
- Translate to natural, native ${langName} that real speakers would use in search queries
- Preserve all proper nouns, brand names (Erogram, Telegram), and technical terms
- Do NOT translate URL slugs or code
- Use native phrasing over literal translation — prioritize how a ${langName} speaker would naturally search for this topic
- Keep the same tone and intent as the original
- Return ONLY the translated text, no explanations or notes${contextNote}`,
      },
      { role: 'user', content: text },
    ],
    temperature: 0.3,
    max_tokens: 4096,
  });

  return res.choices[0]?.message?.content?.trim() ?? text;
}

/**
 * Batch translate multiple strings (saves API calls via single prompt).
 * Returns array in same order as input.
 */
export async function translateBatch(
  texts: string[],
  targetLang: TranslationLang,
  context?: string,
): Promise<string[]> {
  if (texts.length === 0) return [];
  if (texts.length === 1) return [await translateText(texts[0], targetLang, context)];

  const langName = LANG_NAMES[targetLang];
  const contextNote = context ? `\nContent type: ${context}` : '';
  const numbered = texts.map((t, i) => `[${i}] ${t}`).join('\n');

  const res = await qwen.chat.completions.create({
    model: 'qwen3-max',
    messages: [
      {
        role: 'system',
        content: `You are an expert SEO-focused translator specializing in ${langName} web content.

Rules:
- Translate each numbered line to natural, native ${langName}
- Preserve all proper nouns, brand names (Erogram, Telegram), and technical terms
- Use native phrasing over literal translation
- Return ONLY the translated lines in the same [N] format, one per line
- Do NOT add any explanations${contextNote}`,
      },
      { role: 'user', content: numbered },
    ],
    temperature: 0.3,
    max_tokens: 8192,
  });

  const output = res.choices[0]?.message?.content?.trim() ?? '';
  const lines = output.split('\n');
  const result: string[] = new Array(texts.length).fill('');

  for (const line of lines) {
    const match = line.match(/^\[(\d+)\]\s*(.+)$/);
    if (match) {
      const idx = parseInt(match[1], 10);
      if (idx >= 0 && idx < texts.length) {
        result[idx] = match[2].trim();
      }
    }
  }

  // Fallback: if parsing failed for any entry, keep original
  return result.map((r, i) => r || texts[i]);
}
