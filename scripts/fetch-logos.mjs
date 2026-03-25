import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const TAVILY_KEY = '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';
const OUT_DIR = path.join(process.cwd(), 'public', 'assets', 'ainsfw');

const MISSING = [
  { name: 'My Lovely AI', vendor: 'Mylovely.ai', file: 'ai-girlfriend-my-lovely-ai.jpg' },
  { name: 'Secrets.AI', vendor: 'Secrets.ai', file: 'ai-girlfriend-secrets-ai.jpg' },
  { name: 'Elyza', vendor: 'Elyza.app', file: 'ai-girlfriend-elyza.jpg' },
  { name: 'DreamBF AI', vendor: 'Dreambf.ai', file: 'ai-girlfriend-dreambf-ai.jpg' },
  { name: 'Loveli.AI', vendor: 'Loveli.ai', file: 'ai-girlfriend-loveli-ai.jpg' },
  { name: 'Krush', vendor: 'Krush.chat', file: 'ai-girlfriend-krush.jpg' },
  { name: 'Romantic AI', vendor: 'Romanticai.com', file: 'ai-girlfriend-romantic-ai.jpg' },
  { name: 'Honeybot', vendor: 'Honeybot.ai', file: 'ai-girlfriend-honeybot.jpg' },
  { name: 'LoveMy.AI', vendor: 'Lovemy.ai', file: 'ai-girlfriend-lovemy-ai.jpg' },
  { name: 'Dream Companion', vendor: 'Mydreamcompanion.com', file: 'ai-girlfriend-dream-companion.jpg' },
  { name: 'Deepstrip', vendor: 'Deepstrip.com', file: 'undress-ai-deepstrip.jpg' },
  { name: 'NudeMaker', vendor: 'Nudemaker.app', file: 'undress-ai-nudemaker.jpg' },
  { name: 'AINUDEZ', vendor: 'Ainudez.com', file: 'undress-ai-ainudez.jpg' },
  { name: 'Makenude', vendor: 'Makenude.app', file: 'undress-ai-makenude.jpg' },
  { name: 'Fastundress', vendor: 'Fastundress.net', file: 'undress-ai-fastundress.jpg' },
  { name: 'Nextpart AI', vendor: 'Nextpart.ai', file: 'ai-chat-nextpart-ai.jpg' },
  { name: 'JOI AI', vendor: 'Joiai.com', file: 'ai-chat-joi-ai.jpg' },
  { name: 'aiAllure', vendor: 'Aiallure.com', file: 'ai-chat-aiallure.jpg' },
  { name: 'Wemate', vendor: 'Wemate.ai', file: 'ai-chat-wemate.jpg' },
  { name: 'Lollipop', vendor: 'Lollipop.chat', file: 'ai-chat-lollipop.jpg' },
  { name: 'Playbox', vendor: 'Playbox.com', file: 'ai-image-playbox.jpg' },
  { name: 'NudeFab', vendor: 'Nudefab.com', file: 'ai-image-nudefab.jpg' },
  { name: 'CelebMakerAI', vendor: 'Celebmakerai.com', file: 'ai-image-celebmakerai.jpg' },
  { name: 'CreatePorn', vendor: 'Createporn.com', file: 'ai-image-createporn.jpg' },
  { name: 'Seduced', vendor: 'Seduced.com', file: 'ai-image-seduced.jpg' },
  { name: 'VibeNude', vendor: 'Vibenude.net', file: 'ai-image-vibenude.jpg' },
  { name: 'SoulGen', vendor: 'Soulgen.ai', file: 'ai-image-soulgen.jpg' },
  { name: 'Facy AI', vendor: 'Facy.ai', file: 'ai-image-facy-ai.jpg' },
  { name: 'Swapzy', vendor: 'Swapzyface.com', file: 'ai-image-swapzy.jpg' },
  { name: 'FaceSwapLab', vendor: 'Faceswaplab.com', file: 'ai-image-faceswaplab.jpg' },
  { name: 'Hyperdreams', vendor: 'Hyperdreams.com', file: 'ai-roleplay-hyperdreams.jpg' },
  { name: 'StoryChan', vendor: 'Storychan.com', file: 'ai-roleplay-storychan.jpg' },
  { name: 'RedQuill', vendor: 'Redquill.net', file: 'ai-roleplay-redquill.jpg' },
  { name: 'Luvy AI', vendor: 'Luvy.ai', file: 'ai-roleplay-luvy-ai.jpg' },
  { name: 'Kink AI', vendor: 'Kink.ai', file: 'ai-roleplay-kink-ai.jpg' },
  { name: 'My Dream Boy', vendor: 'Mydreamboy.com', file: 'ai-roleplay-my-dream-boy.jpg' },
  { name: 'Juicy AI', vendor: 'Juicy-ai.com', file: 'ai-roleplay-juicy-ai.jpg' },
  { name: 'Avtaar AI', vendor: 'Avtaar.ai', file: 'ai-roleplay-avtaar-ai.jpg' },
  { name: 'Nextpart AI RP', vendor: 'Nextpart.ai', file: 'ai-roleplay-nextpart-ai.jpg' },
  { name: 'Secrets AI Roleplay', vendor: 'Secrets.ai', file: 'ai-roleplay-secrets-ai.jpg' },
];

async function tryFetch(url, timeout = 8000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      redirect: 'follow',
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    clearTimeout(t);
    return null;
  }
}

async function processAndSave(buf, outPath) {
  try {
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < 32) return false;
    
    await sharp(buf)
      .resize(400, 400, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 95, mozjpeg: true })
      .toFile(outPath);
    return true;
  } catch {
    return false;
  }
}

async function fetchLogo(tool) {
  const outPath = path.join(OUT_DIR, tool.file);
  if (fs.existsSync(outPath)) {
    console.log(`✅ SKIP ${tool.name} (already exists)`);
    return true;
  }

  const domain = tool.vendor.toLowerCase();

  // Strategy 1: Google high-res favicon (256px)
  const googleUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
  let buf = await tryFetch(googleUrl);
  if (buf && buf.length > 1000) {
    const ok = await processAndSave(buf, outPath);
    if (ok) { console.log(`✅ ${tool.name} — Google favicon`); return true; }
  }

  // Strategy 2: Clearbit Logo
  const clearbitUrl = `https://logo.clearbit.com/${domain}`;
  buf = await tryFetch(clearbitUrl);
  if (buf && buf.length > 1000) {
    const ok = await processAndSave(buf, outPath);
    if (ok) { console.log(`✅ ${tool.name} — Clearbit`); return true; }
  }

  // Strategy 3: Try apple-touch-icon from the site
  const appleIconUrl = `https://${domain}/apple-touch-icon.png`;
  buf = await tryFetch(appleIconUrl);
  if (buf && buf.length > 1000) {
    const ok = await processAndSave(buf, outPath);
    if (ok) { console.log(`✅ ${tool.name} — apple-touch-icon`); return true; }
  }

  // Strategy 4: /favicon.ico
  const faviconUrl = `https://${domain}/favicon.ico`;
  buf = await tryFetch(faviconUrl);
  if (buf && buf.length > 500) {
    const ok = await processAndSave(buf, outPath);
    if (ok) { console.log(`✅ ${tool.name} — favicon.ico`); return true; }
  }

  // Strategy 5: Tavily image search for logo
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query: `${tool.name} ${domain} logo icon`,
        search_depth: 'basic',
        include_images: true,
        max_results: 5,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const urls = (data.images || []).map(i => typeof i === 'string' ? i : i?.url).filter(Boolean);
      for (const imgUrl of urls.slice(0, 5)) {
        buf = await tryFetch(imgUrl);
        if (buf && buf.length > 2000) {
          const ok = await processAndSave(buf, outPath);
          if (ok) { console.log(`✅ ${tool.name} — Tavily`); return true; }
        }
      }
    }
  } catch {}

  console.log(`❌ ${tool.name} — NO LOGO FOUND`);
  return false;
}

async function main() {
  console.log(`Fetching logos for ${MISSING.length} tools...\n`);
  let ok = 0, fail = 0;

  // Process in batches of 5
  for (let i = 0; i < MISSING.length; i += 5) {
    const batch = MISSING.slice(i, i + 5);
    const results = await Promise.all(batch.map(t => fetchLogo(t)));
    ok += results.filter(Boolean).length;
    fail += results.filter(r => !r).length;
  }

  console.log(`\nDone: ${ok} success, ${fail} failed`);
}

main();
