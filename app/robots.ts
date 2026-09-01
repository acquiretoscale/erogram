import { MetadataRoute } from 'next';
import { CANONICAL_BASE } from '@/lib/seo/socialMeta';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = CANONICAL_BASE;

  const commonDisallow = ['/admin', '/advert', '/api', '/_next/static/', '/redirect.html', '/advertise', '/promo', '/premium', '/OF', '/onlyfans/', '/go/', '/top100'];

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: commonDisallow,
      },
      {
        userAgent: 'GPTBot',
        allow: ['/', '/groups', '/bots', '/blog', '/best-telegram-groups', '/about', '/ainsfw'],
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
      {
        userAgent: 'OAI-SearchBot',
        allow: ['/'],
        disallow: commonDisallow,
      },
      {
        userAgent: 'Google-Extended',
        allow: ['/'],
        disallow: commonDisallow,
      },
      {
        userAgent: 'Applebot-Extended',
        allow: ['/'],
        disallow: commonDisallow,
      },
      {
        userAgent: 'Perplexity-User',
        allow: ['/'],
        disallow: commonDisallow,
      },
      {
        userAgent: 'Amazonbot',
        allow: ['/'],
        disallow: commonDisallow,
      },
      {
        userAgent: 'Meta-ExternalAgent',
        allow: ['/'],
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
