import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', '/_next/static/', '/redirect.html', '/advertise'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
