import fs from 'fs';
import path from 'path';

export const ROOT = process.cwd();
export const SCRAPE_PATH = path.join(process.env.HOME, 'Desktop', 'EROGRAM Downloads', 'ai-tools-200.json');
export const DATA_TS = path.join(ROOT, 'app', 'ainsfw', 'data.ts');
export const MANIFEST_PATH = path.join(ROOT, 'scripts', 'ainsfw-batch-add.json');
export const DESCRIPTIONS_PATH = path.join(ROOT, 'scripts', 'ainsfw-batch-descriptions.json');
export const IMAGES_PATH = path.join(ROOT, 'scripts', 'ainsfw-batch-images.json');
export const R2_PUBLIC = (process.env.R2_PUBLIC_URL || 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev').replace(/\/$/, '');

const SKIP_RE = /sex doll|fleshlight|lovense|kiiroo|lelo|autoblow|vr slr|realdoll|silicone|doll partner|toy store|fansly|onlyfans|manyvids|justfor\.fans|loyalfans|fancentro|milfvr|tranzvr|brasilvr|sex emulator|sex simulator|sex world|adultworld|grand bang|girlvania|jerko?dolls|activedolls|robot doll|nakedoll|racydoll|yourdoll|oksexdoll|hx doll|kuma doll|love nestle|venus love|sex doll queen|silicon wives|supor adult|dg lab|the handy|syncmo|feelme|bestvibe|bionixxx|eden fantasys|greatsexsecrets|kaufmich|flirtwith/i;
const GAME_RE = /3d girlz|agentredgirl|ai fuck dolls|bdsmstimulation|comix harem|costume fighter|cumflation|cyber sexuals|dream sexworld|family cheaters|familysimulators|futanarium|gay harem|lustix|otherworlderotic|pornostimulation|pornstar harem|princess of arda|sexgamedevil|simsexfamily|yiff party/i;

export function slugPart(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function toolSlug(category, name) {
  return `${slugPart(name)}-${slugPart(category)}`;
}

export function norm(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function domainFrom(url) {
  try {
    const h = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
    return h.split('.').slice(-2).join('.');
  } catch {
    return '';
  }
}

export function parseLiveTools() {
  const src = fs.readFileSync(DATA_TS, 'utf8');
  const live = [];
  const blockRe = /\{\s*slug:[\s\S]*?sourceUrl:\s*'([^']*)',?\s*\}/g;
  let b;
  while ((b = blockRe.exec(src))) {
    const block = b[0];
    const nameM = block.match(/name:\s*'((?:[^'\\]|\\.)*)'/);
    const catM = block.match(/category:\s*'([^']+)'/);
    const slugM = block.match(/slug:\s*slugify\('([^']+)',\s*'((?:[^'\\]|\\.)*)'\)/);
    const tryM = block.match(/tryNowUrl:\s*'([^']*)'/);
    const srcM = block.match(/sourceUrl:\s*'([^']*)'/);
    if (!nameM || !catM) continue;
    const name = nameM[1].replace(/\\'/g, "'");
    live.push({
      name,
      category: catM[1],
      slug: slugM ? toolSlug(slugM[1], slugM[2].replace(/\\'/g, "'")) : toolSlug(catM[1], name),
      norm: norm(name),
      domains: [tryM?.[1], srcM?.[1]].filter(Boolean).map(domainFrom),
    });
  }
  return live;
}

export function isLiveTool(tool, live) {
  const n = norm(tool.name);
  const d = domainFrom(tool.websiteUrl || tool.tryNowUrl || '');
  for (const l of live) {
    if (l.norm === n) return true;
    if (d && l.domains.includes(d)) return true;
    const ln = l.norm;
    if (ln.length >= 5 && (n.startsWith(ln) || ln.startsWith(n))) return true;
  }
  return false;
}

export function inferCategory(tool) {
  const tags = (tool.tags || []).join(' ').toLowerCase();
  const name = (tool.name || '').toLowerCase();
  const desc = (tool.scrapeDesc || tool.desc || '').toLowerCase();
  const hay = `${tags} ${name} ${desc}`;

  if (SKIP_RE.test(hay) || SKIP_RE.test(name)) return '__SKIP__';
  if (GAME_RE.test(hay) || GAME_RE.test(name)) return '__SKIP__';

  if (/undress|nudify|deepnude|clothoff|deepstrip|makenude|ainudez|fastundress|nudemaker|deepnudenow|drawnudes|unclothy|ppnude|offrobe|n8ked|nudeitnow|deep-nude|deepnudes|undresser|undressing|drfaker|dessi/i.test(hay)) return 'Undress AI';
  if (/ai girlfriend|ai boyfriend|virtual girlfriend|virtual boyfriend|ai companion|ai waifu|dreamgf|fantasygf|crushon|muah|kupid|soulfun|nastia|girlfriendgpt|spicyai|lovescape|ourdream|cuties|charluv|blushy|ailure|aphrochat|aroused|avatar\.one|chatsweetie|chatup|fapai|fapy|funfun|hottalks|iwaifu|onlyrizz|secret desires|super sexy|tabootwin|virtual lust|wife\.app|xcrush|dreamswipe|fanfinity|hackaigc|dream companion|romantic ai|honeybot|lovemy|elyza|loveli|krush|haremhub|xmodels|unlaced/i.test(hay)) return 'AI Girlfriend';
  if (/roleplay|role play|storychan|redquill|hyperdream|kink ai|luvy|my dream boy|avtaar|eroplay|getidol|mytales|openroleplay|rolemantic|rprp|privee|pirate jessica|game of lust/i.test(hay)) return 'AI Roleplay';
  if (/ai image|image generator|face swap|faceswap|createporn|soulgen|celebmaker|playbox|seduced|vibenude|swapzy|facy|nudefab|porn generator|photo generator|deepfake|deepswap|animegenius|pornify|pornpen|pornwizard|pornx|pixai|made\.porn|lustlab|getporn|ai-porn|aibabe|aiexotic|craftura|dopamine girl|heyeditor|hifun|icons8|ineedthis|nolim|vidnoz|wank pal|yiff ai|novelai|picso|anydream|createai|ai-dream|fallfor|sexterai|mage\b/i.test(hay)) return 'AI Image';
  if (/ai chat|chatbot|spicychat|juicychat|pephop|joyland|dreamgen|joi ai|aiallure|wemate|lollipop|nextpart|character ai|nsfw chat|charfriend|alphazria|bot 3|chatfai|dirty talky|dreampress|moemate|multichat|nsfwgpt|sexting|sudowrite|openspoken|bambie/i.test(hay)) return 'AI Chat';

  if (tags.includes('ai girlfriend') || tags.includes('ai boyfriend') || tags.includes('ai companion')) return 'AI Girlfriend';
  if (tags.includes('undress') || tags.includes('nudify')) return 'Undress AI';
  if (tags.includes('ai roleplay') || tags.includes('roleplay')) return 'AI Roleplay';
  if (tags.includes('ai image generator') || tags.includes('ai porn generator') || tags.includes('face swap')) return 'AI Image';
  if (tags.includes('ai chat') || tags.includes('ai chatbot') || tags.includes('nsfw chat')) return 'AI Chat';

  return '__SKIP__';
}

export function guessVendor(name, productUrl) {
  const cleaned = name.trim();
  if (/\.(com|ai|app|net|io|xyz|art|online|vip|cc|zone|biz|chat|top|co)$/i.test(cleaned)) {
    const host = cleaned.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase();
    const parts = host.split('.');
    const cap = parts.map((p, i) => (i === parts.length - 1 ? p : p.charAt(0).toUpperCase() + p.slice(1))).join('.');
    return cap;
  }
  const slug = (productUrl || '').split('/products/')[1] || slugPart(name);
  const base = slug.replace(/-(com|ai|app|net|io|xyz|art|online|vip|cc|zone|biz|chat|top|co)$/i, (_, tld) => `.${tld}`);
  if (base.includes('.')) {
    const host = base.toLowerCase();
    const parts = host.split('.');
    return parts.map((p, i) => (i === parts.length - 1 ? p : p.charAt(0).toUpperCase() + p.slice(1))).join('.');
  }
  const guess = slugPart(name).replace(/-/g, '');
  return `${guess.charAt(0).toUpperCase()}${guess.slice(1)}.com`;
}

export function guessWebsite(vendor) {
  const host = vendor.toLowerCase();
  return host.startsWith('http') ? host : `https://${host}`;
}

export function inferSubscription(tags = []) {
  const t = tags.join(' ').toLowerCase();
  if (/\bfree\b/.test(t) && !/freemium|free trial/.test(t)) return 'Free';
  if (/free trial/.test(t)) return 'Free Trial & Paid';
  if (/paid only/.test(t)) return 'Paid';
  return 'Freemium & Paid';
}

export function inferPayment(tags = []) {
  const p = ['Credit Cards'];
  const t = tags.join(' ').toLowerCase();
  if (/crypto/.test(t)) p.push('Crypto');
  if (/paypal/.test(t)) p.push('PayPal');
  return p;
}

export function cleanTags(tags = [], category) {
  const skip = new Set(['new', 'deals', 'promotions', 'pay with crypto', 'fantastical']);
  const out = [];
  for (const raw of tags) {
    const tag = String(raw).toLowerCase().trim();
    if (!tag || skip.has(tag)) continue;
    if (!out.includes(tag)) out.push(tag);
    if (out.length >= 6) break;
  }
  if (out.length === 0) out.push(category.toLowerCase(), 'ai nsfw');
  return out;
}

export function escapeTsString(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}
