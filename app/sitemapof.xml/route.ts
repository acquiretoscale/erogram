import { NextResponse } from 'next/server';
import generateSitemap from '@/app/onlyfanssearch/sitemap';

function toXml(entries: { url: string; lastModified?: Date; changeFrequency?: string; priority?: number }[]) {
  const urls = entries
    .map((e) => {
      let node = `  <url>\n    <loc>${e.url}</loc>`;
      if (e.lastModified) node += `\n    <lastmod>${e.lastModified.toISOString()}</lastmod>`;
      if (e.changeFrequency) node += `\n    <changefreq>${e.changeFrequency}</changefreq>`;
      if (e.priority != null) node += `\n    <priority>${e.priority}</priority>`;
      node += '\n  </url>';
      return node;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

export async function GET() {
  const entries = await generateSitemap();
  return new NextResponse(toXml(entries), {
    headers: { 'Content-Type': 'application/xml' },
  });
}
