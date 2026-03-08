import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/advert', '/api', '/_next/static/', '/redirect.html', '/advertise', '/premium'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
