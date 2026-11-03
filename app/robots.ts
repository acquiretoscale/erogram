import { MetadataRoute } from 'next';
import { SEARCH_SITEMAP_URL } from '@/lib/seo/publicOrigins';

export default function robots(): MetadataRoute.Robots {

  const commonDisallow = ['/admin', '/advert', '/api', '/_next/static/', '/advertise', '/promo'];

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: commonDisallow,
      },
      {
        userAgent: 'GPTBot',
        allow: ['/'],
        disallow: commonDisallow,
      },
      {
        userAgent: 'ChatGPT-User',
        allow: ['/'],
        disallow: commonDisallow,
      },
      {
        userAgent: 'ClaudeBot',
        allow: ['/'],
        disallow: commonDisallow,
      },
      {
        userAgent: 'Anthropic-ai',
        allow: ['/'],
        disallow: commonDisallow,
      },
      {
        userAgent: 'CCBot',
        allow: ['/'],
        disallow: commonDisallow,
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/'],
        disallow: commonDisallow,
      },
      {
        userAgent: 'Bytespider',
        allow: ['/'],
        disallow: commonDisallow,
      },
      {
        userAgent: 'cohere-ai',
        allow: ['/'],
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
    sitemap: [SEARCH_SITEMAP_URL],
  };
}
