import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BlogArticleClient from './BlogArticleClient';
import { getBlogArticleBySlug, getRelatedBlogArticles } from '@/lib/actions/blog';
import { getArticleComments } from '@/lib/actions/articleComments';
import { BLOG_CATEGORY_MAP } from '@/lib/blog/categories';

export const revalidate = 60;

const BASE_URL = 'https://erogram.pro';

function toAbsoluteUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${BASE_URL}${url}`;
  return `${BASE_URL}/${url}`;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getBlogArticleBySlug(slug);
  if (!article) return { title: 'Article Not Found', robots: { index: false, follow: false } };

  const url = `${BASE_URL}/blog/${article.slug}`;
  const metaTitle = article.metaTitle || article.title;
  const metaDescription = article.metaDescription || article.excerpt || article.title;
  const ogImage = toAbsoluteUrl(article.ogImage || article.featuredImage);
  const twitterImage = toAbsoluteUrl(article.twitterImage || article.ogImage || article.featuredImage);

  return {
    title: metaTitle,
    description: metaDescription,
    keywords: article.metaKeywords || undefined,
    alternates: { canonical: url },
    openGraph: {
      title: article.ogTitle || metaTitle,
      description: article.ogDescription || metaDescription,
      type: 'article',
      publishedTime: article.publishedAt || undefined,
      authors: article.authorName ? [article.authorName] : undefined,
      images: ogImage ? [ogImage] : undefined,
      url,
    },
    twitter: {
      card: (article.twitterCard as any) || 'summary_large_image',
      title: article.twitterTitle || article.ogTitle || metaTitle,
      description: article.twitterDescription || article.ogDescription || metaDescription,
      images: twitterImage ? [twitterImage] : undefined,
    },
  };
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getBlogArticleBySlug(slug);
  if (!article) notFound();

  const [related, commentsData] = await Promise.all([
    getRelatedBlogArticles(article._id, article.blogCategory, 3),
    getArticleComments(article.slug),
  ]);
  const cat = BLOG_CATEGORY_MAP[article.blogCategory];
  const url = `${BASE_URL}/blog/${article.slug}`;
  const imageUrl = toAbsoluteUrl(article.ogImage || article.featuredImage);

  const articleJsonLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: article.title,
    description: article.metaDescription || article.excerpt || article.title,
    ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
    ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
    ...(article.author?.name
      ? {
          author: {
            '@type': 'Person',
            name: article.author.name,
            ...(article.author.role ? { jobTitle: article.author.role } : {}),
            ...(article.author.bio ? { description: article.author.bio } : {}),
            ...(article.author.avatar ? { image: toAbsoluteUrl(article.author.avatar) } : {}),
          },
        }
      : {}),
    ...(imageUrl ? { image: { '@type': 'ImageObject', url: imageUrl } } : {}),
    ...(cat ? { articleSection: cat.name } : {}),
    ...(commentsData.count > 0
      ? {
          commentCount: commentsData.count,
          interactionStatistic: {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/CommentAction',
            userInteractionCount: commentsData.count,
          },
        }
      : {}),
    publisher: { '@type': 'Organization', name: 'Erogram', url: BASE_URL },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE_URL}/blog` },
      ...(cat ? [{ '@type': 'ListItem', position: 3, name: cat.name, item: `${BASE_URL}/blog/category/${cat.slug}` }] : []),
      { '@type': 'ListItem', position: cat ? 4 : 3, name: article.title, item: url },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <BlogArticleClient article={article} related={related} initialComments={commentsData.comments} />
    </>
  );
}
