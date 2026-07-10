import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';

  const commonDisallow = ['/admin', '/advert', '/api', '/_next/static/', '/redirect.html', '/advertise', '/premium', '/OF', '/onlyfans/', '/top100'];
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: commonDisallow,
      },
      {
        userAgent: 'GPTBot',
        allow: ['/', '/groups', '/bots', '/blog', '/best-telegram-groups', '/about', '/onlyfanssearch', '/ainsfw'],
        disallow: commonDisallow,
      },
      {
        userAgent: 'ChatGPT-User',
        allow: ['/', '/groups', '/bots', '/blog', '/best-telegram-groups', '/about', '/ainsfw'],
        disallow: commonDisallow,
      },
      {
        userAgent: 'ClaudeBot',
        allow: ['/', '/groups', '/bots', '/blog', '/best-telegram-groups', '/about', '/ainsfw'],
        disallow: commonDisallow,
      },
      {
        userAgent: 'Anthropic-ai',
        allow: ['/', '/groups', '/bots', '/blog', '/best-telegram-groups', '/about', '/ainsfw'],
        disallow: commonDisallow,
      },
      {
        userAgent: 'CCBot',
        allow: ['/', '/groups', '/bots', '/blog', '/best-telegram-groups', '/about', '/ainsfw'],
        disallow: commonDisallow,
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/', '/groups', '/bots', '/blog', '/best-telegram-groups', '/about', '/ainsfw'],
        disallow: commonDisallow,
      },
      {
        userAgent: 'Bytespider',
        allow: ['/', '/groups', '/bots', '/blog', '/best-telegram-groups', '/about', '/ainsfw'],
        disallow: commonDisallow,
      },
      {
        userAgent: 'cohere-ai',
        allow: ['/', '/groups', '/bots', '/blog', '/best-telegram-groups', '/about', '/ainsfw'],
        disallow: commonDisallow,
      },
    ],
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap-de.xml`,
      `${baseUrl}/sitemap-es.xml`,
      `${baseUrl}/sitemap-pt.xml`,
    ],
  };
}
