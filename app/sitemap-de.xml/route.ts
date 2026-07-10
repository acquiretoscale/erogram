import { buildLanguageSitemap } from '@/lib/sitemap/buildLanguageSitemap';

export async function GET() {
  const xml = await buildLanguageSitemap('de');
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
