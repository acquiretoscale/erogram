/**
 * Detects and strips spam/boilerplate descriptions commonly found in
 * scraped Telegram group data. If the remaining "useful" text is below
 * a threshold, the description is considered junk and should be blanked.
 */

const BOILERPLATE_PATTERNS = [
  /🔞\s*(for (adults|persons)|age restriction|only).{0,200}?(content|materials?|photos?|videos?|images?|nude|porn|sex)\./gi,
  /⚠️.{0,300}?(content|materials?|adult|porn|sex)\./gi,
  /this (telegram )?channel may contain.{0,200}?\./gi,
  /for (adults|persons over 18|persons over eighteen).{0,100}?\./gi,
  /age restriction 18\+/gi,
  /all models are of legal age/gi,
  /applications? (are|is) accepted automatically/gi,
  /заявки принимаются автоматически/gi,
  /подписываясь.{0,100}?подтверждаете.{0,100}?18/gi,
  /подписываясь на канал.{0,200}?$/gim,
  /переходя или подписываясь.{0,200}?$/gim,
  /мы не нарушаем правил/gi,
  /весь (контент|материал) (берётся|взят) из открытых источников/gi,
  /всем моделям \d+\+/gi,
  /мы соблюдаем правила telegram/gi,
  /®️\s*contenido enviado.{0,200}?no copyright intented\.?/gi,
  /no copyright intented\.?/gi,
  /fan page/gi,
  /канал является авторским блогом/gi,
  /вход строго 18\+/gi,
  /join\s*(now|us|here|free|channel|group)!?/gi,
  /subscribe\s*(now|here|free|to)?!?/gi,
  /best\s*(group|channel|porn|content)!?/gi,
  /don['']?t miss!?/gi,
  /click\s*(here|below|the link|join)!?/gi,
  /link\s*(below|here|👇|⬇)/gi,
  /daily\s*(updates?|content|uploads?|videos?|photos?)!?/gi,
  /\d+\s*\+?\s*(years?|лет)\s*(old)?/gi,
  /18\+/g,
  /21\+/g,
  /contenido\s*(para|de)\s*adultos?/gi,
  /solo\s*(para|mayores)/gi,
  /mayores de \d+/gi,
];

const URL_PATTERN = /https?:\/\/\S+/gi;
const MENTION_PATTERN = /@[a-zA-Z0-9_]+/g;
const TELEGRAM_LINK = /t\.me\/\S+/gi;
const EMOJI_PATTERN = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1FA00}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{1F1E0}-\u{1F1FF}\u{2300}-\u{23FF}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{25AA}-\u{25FE}\u{2934}\u{2935}\u{23CF}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}]/gu;

const CYRILLIC_BLOCK = /[\u0400-\u04FF]{10,}/g;
const CJK_BLOCK = /[\u4E00-\u9FFF\u3400-\u4DBF]{5,}/g;
const ARABIC_BLOCK = /[\u0600-\u06FF\u0750-\u077F]{10,}/g;
const PERSIAN_BLOCK = /[\u0600-\u06FF]{10,}/g;

/**
 * Strip all known spam/boilerplate from a description and return the
 * cleaned text. If the result is mostly empty, returns ''.
 *
 * @param desc  Raw description text
 * @param opts  Options — minUseful sets the char threshold (default 30)
 * @returns     Cleaned description or '' if it's all spam
 */
export function cleanSpamDescription(desc: string, opts?: { minUseful?: number }): string {
  if (!desc) return '';
  const minUseful = opts?.minUseful ?? 30;

  let text = desc;

  for (const pattern of BOILERPLATE_PATTERNS) {
    pattern.lastIndex = 0;
    text = text.replace(pattern, ' ');
  }

  text = text.replace(URL_PATTERN, ' ');
  text = text.replace(MENTION_PATTERN, ' ');
  text = text.replace(TELEGRAM_LINK, ' ');

  text = text.replace(CYRILLIC_BLOCK, ' ');
  text = text.replace(CJK_BLOCK, ' ');
  text = text.replace(ARABIC_BLOCK, ' ');
  text = text.replace(PERSIAN_BLOCK, ' ');

  text = text.replace(EMOJI_PATTERN, ' ');

  text = text
    .replace(/купить рекламу/gi, ' ')
    .replace(/реклам[аыуе]?\s*[:—\-]?\s*/gi, ' ')
    .replace(/по рекламе/gi, ' ')
    .replace(/сотрудничество/gi, ' ')
    .replace(/ссылка (на канал|для (друга|друзей|приглашения))/gi, ' ')
    .replace(/пригласить друзей?/gi, ' ')
    .replace(/наш (основной )?канал/gi, ' ')
    .replace(/канал\s*:/gi, ' ')
    .replace(/por tg/gi, ' ')
    .replace(/OF\s*:/gi, ' ');

  text = text.replace(/\s+/g, ' ').trim();

  if (text.length < minUseful) return '';
  return text;
}

/**
 * Quick check: is this description mostly spam/junk?
 * Catches emoji-only, link-only, boilerplate walls, and mixed-language spam.
 */
export function isSpamDescription(desc: string): boolean {
  if (!desc) return false;

  const trimmed = desc.trim();
  if (trimmed.length === 0) return false;

  // Check if description is almost entirely emojis/symbols (even short ones)
  const withoutEmoji = trimmed.replace(EMOJI_PATTERN, '').replace(/\s+/g, '').trim();
  if (withoutEmoji.length < 5 && trimmed.length >= 3) return true;

  // Check if description is just links/mentions
  const withoutLinksAndMentions = trimmed
    .replace(URL_PATTERN, '').replace(TELEGRAM_LINK, '').replace(MENTION_PATTERN, '')
    .replace(EMOJI_PATTERN, '').replace(/\s+/g, '').trim();
  if (withoutLinksAndMentions.length < 10 && trimmed.length >= 10) return true;

  // Short descriptions under 40 chars that survived above checks are kept
  if (trimmed.length < 40) return false;

  const cleaned = cleanSpamDescription(desc, { minUseful: 0 });
  if (desc.length >= 500 && cleaned.length / desc.length < 0.40) return true;
  if (desc.length >= 200 && cleaned.length / desc.length < 0.25) return true;
  if (desc.length >= 100 && cleaned.length < 30) return true;
  if (desc.length >= 40 && cleaned.length < 10) return true;
  return false;
}

/**
 * Computes a "spam score" (0-100). Higher = more spam.
 * Useful for sorting or displaying spam likelihood.
 */
export function spamScore(desc: string): number {
  if (!desc) return 100;
  const original = desc.length;
  if (original === 0) return 100;

  const cleaned = cleanSpamDescription(desc, { minUseful: 0 });
  const ratio = cleaned.length / original;
  return Math.round((1 - ratio) * 100);
}
