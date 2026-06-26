import { Metadata } from 'next';
import BlogHubClient from './BlogHubClient';
import { getPublishedBlogArticles, getTopBlogArticles } from '@/lib/actions/blog';

export const revalidate = 60;

const BASE_URL = 'https://erogram.pro';

export const metadata: Metadata = {
  title: 'The Erogram Blog — AI NSFW, Telegram, OnlyFans & Adult Culture',
  description:
    'Guides, lists, and investigations from the Erogram desk: AI NSFW tools, NSFW Telegram groups & bots, OnlyFans creators, and adult entertainment culture.',
  alternates: { canonical: `${BASE_URL}/blog` },
  openGraph: {
    title: 'The Erogram Blog',
    description:
      'Guides, lists, and investigations: AI NSFW, NSFW Telegram groups & bots, OnlyFans creators, and adult entertainment.',
    type: 'website',
    siteName: 'Erogram',
    url: `${BASE_URL}/blog`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Erogram Blog',
    description: 'Guides, lists, and investigations across AI NSFW, Telegram, OnlyFans, and adult culture.',
  },
};

export default async function BlogHubPage() {
  const [articles, topArticles] = await Promise.all([
    getPublishedBlogArticles(60),
    getTopBlogArticles(10),
  ]);

  const blogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'The Erogram Blog',
    url: `${BASE_URL}/blog`,
    publisher: { '@type': 'Organization', name: 'Erogram', url: BASE_URL },
    blogPost: articles.slice(0, 12).map((a) => ({
      '@type': 'BlogPosting',
      headline: a.title,
      url: `${BASE_URL}/blog/${a.slug}`,
      ...(a.publishedAt ? { datePublished: a.publishedAt } : {}),
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }} />
      <BlogHubClient
        articles={articles}
        topArticles={topArticles}
        heading="This week, on the desk."
        eyebrow="The Features"
        tagline="Guides, lists, and investigations across AI NSFW, Telegram, OnlyFans, and the wider adult web."
      />
    </>
  );
}
