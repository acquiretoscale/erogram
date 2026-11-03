import fs from 'fs';

const DEFAULT_URL = 'https://erogramx.com/sitemap.xml';

async function main() {
  const url = process.env.SITEMAP_URL || DEFAULT_URL;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status}`);
  const xml = await res.text();
  const out = process.env.SITEMAP_OUT || '/Users/themaf/Downloads/erogram-sitemap.xml';
  fs.writeFileSync(out, xml);
  const count = (xml.match(/<loc>/g) || []).length;
  console.log(`Wrote ${count} URLs from ${url} to ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
