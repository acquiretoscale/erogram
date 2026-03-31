const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SLUG = 'ai-girlfriend-lovescape';
const GALLERY_DIR = path.join(__dirname, '..', 'public', 'assets', 'ainsfw', 'gallery', SLUG);

async function main() {
  fs.mkdirSync(GALLERY_DIR, { recursive: true });

  const r = await fetch('https://cdn.lovescape.com/assets/main.20260330085845.js', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(30000),
  });
  const js = await r.text();
  console.log('Bundle size:', js.length);

  const pattern = /https:\/\/cdn\.lovescape\.com\/[^\s"'\\]+\.(jpg|jpeg|png|webp)/gi;
  const imgs = [...js.matchAll(pattern)].map(m => m[0]);
  const unique = [...new Set(imgs)];
  console.log('Total image URLs:', unique.length);

  const interesting = unique.filter(u =>
    !u.includes('/manifest/') &&
    !u.includes('/icons/') &&
    !u.includes('favicon') &&
    !u.includes('-70x70') &&
    !u.includes('-144x') &&
    !u.includes('-150x') &&
    !u.includes('-270x')
  );
  console.log('Interesting:', interesting.length);
  interesting.slice(0, 25).forEach(u => console.log(' ', u));

  let saved = fs.readdirSync(GALLERY_DIR).filter(f => f.endsWith('.jpg')).length;

  for (const url of interesting) {
    if (saved >= 6) break;
    try {
      const ir = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      });
      if (!ir.ok) continue;
      const buf = Buffer.from(await ir.arrayBuffer());
      if (buf.length < 15000) { console.log('tiny, skip:', url.slice(0, 60)); continue; }
      const meta = await sharp(buf).metadata();
      if (!meta.width || meta.width < 300) { console.log('too small, skip:', url.slice(0, 60)); continue; }
      const out = path.join(GALLERY_DIR, (saved + 1) + '.jpg');
      await sharp(buf).resize(900, undefined, { withoutEnlargement: true }).jpeg({ quality: 90 }).toFile(out);
      console.log('Saved (' + (saved + 1) + '):', url.slice(0, 80));
      saved++;
    } catch (e) {
      console.log('err:', url.slice(0, 60), e.message);
    }
  }
  console.log('\nTotal gallery images:', saved);
}

main().catch(console.error);
