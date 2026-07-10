import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
require('dotenv').config({ path: '.env.local' });

// Register ts paths via tsx runtime
const { register } = await import('tsx/esm/api');
register();

const sitemap = (await import('../app/sitemap.ts')).default;

function toXml(entries) {
  const urls = entries.map((e) => {
    let alt = '';
    if (e.alternates?.languages) {
      for (const [lang, href] of Object.entries(e.alternates.languages)) {
        alt += `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>\n`;
      }
    }
    const lastmod = e.lastModified
      ? `    <lastmod>${new Date(e.lastModified).toISOString()}</lastmod>\n`
      : '';
    return `  <url>\n    <loc>${e.url}</loc>\n${lastmod}${alt}  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

const entries = await sitemap();
const xml = toXml(entries);
const out = '/Users/themaf/Downloads/erogram-sitemap.xml';
fs.writeFileSync(out, xml);
console.log(`Wrote ${entries.length} URLs to ${out}`);
