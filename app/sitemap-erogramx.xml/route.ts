import { permanentRedirect } from 'next/navigation';

/** Legacy URL — single canonical sitemap is /sitemap.xml */
export async function GET() {
  permanentRedirect('/sitemap.xml');
}
