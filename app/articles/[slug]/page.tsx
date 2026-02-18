import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import connectDB from '@/lib/db/mongodb';
import { Article, User, Group } from '@/lib/models';
import ArticleClient from './ArticleClient';
import { getActiveCampaigns } from '@/lib/actions/campaigns';

// ISR for public article pages (keeps SSR output crawlable while avoiding per-request rendering)
export const revalidate = 300;

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

async function getArticle(slug: string) {
  try {
    await connectDB();
    const articleRaw = await Article.findOne({ slug }).lean();
    if (!articleRaw) return null;

    const ar = articleRaw as any;
    let author: { _id: string; username: string } | null = null;
    if (ar.author) {
      try {
        const authorDoc = await User.findById(ar.author.toString()).select('username').lean() as any;
        author = authorDoc ? { _id: authorDoc._id.toString(), username: authorDoc.username } : null;
      } catch (err) {
        console.error('Error fetching author:', err);
      }
    }

    const result = {
      _id: ar._id.toString(),
      title: ar.title,
      slug: ar.slug,
      content: ar.content || '',
      excerpt: ar.excerpt || '',
      featuredImage: ar.featuredImage || '',
      status: ar.status || 'published',
      tags: ar.tags || [],
      publishedAt: ar.publishedAt || null,
      views: ar.views || 0,
      createdAt: ar.createdAt,
      updatedAt: ar.updatedAt,
      author: author || { _id: '', username: 'erogram' },
      metaTitle: ar.metaTitle || '',
      metaDescription: ar.metaDescription || '',
      metaKeywords: ar.metaKeywords || '',
      ogImage: ar.ogImage || '',
      ogTitle: ar.ogTitle || '',
      ogDescription: ar.ogDescription || '',
      twitterCard: ar.twitterCard || 'summary_large_image',
      twitterImage: ar.twitterImage || '',
      twitterTitle: ar.twitterTitle || '',
      twitterDescription: ar.twitterDescription || '',
    };

    Article.findByIdAndUpdate(ar._id, { $inc: { views: 1 } }).catch(err => console.error('Error updating article views:', err));
    return result;
  } catch (error: any) {
    console.error('Error fetching article:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return {
      // Root layout already appends "| Erogram" via `metadata.title.template`.
      title: 'Article Not Found',
    };
  }

  const articleUrl = `${BASE_URL}/articles/${article.slug}`;

  // Use custom metadata with fallbacks
  const metaTitle = article.metaTitle || article.title;
  const metaDescription = article.metaDescription || article.excerpt || article.title;
  const ogTitle = article.ogTitle || article.metaTitle || article.title;
  const ogDescription = article.ogDescription || article.metaDescription || article.excerpt || article.title;
  const ogImage = toAbsoluteUrl(article.ogImage || article.featuredImage) || '';
  const twitterTitle = article.twitterTitle || article.ogTitle || article.metaTitle || article.title;
  const twitterDescription = article.twitterDescription || article.ogDescription || article.metaDescription || article.excerpt || article.title;
  const twitterImage = toAbsoluteUrl(article.twitterImage || article.ogImage || article.featuredImage) || '';

  return {
    title: metaTitle,
    description: metaDescription,
    keywords: article.metaKeywords || undefined,
    alternates: {
      canonical: articleUrl,
    },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      type: 'article',
      publishedTime: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
      authors: article.author?.username ? [article.author.username] : undefined,
      images: ogImage ? [ogImage] : undefined,
      url: articleUrl,
    },
    twitter: {
      card: article.twitterCard || 'summary_large_image',
      title: twitterTitle,
      description: twitterDescription,
      images: twitterImage ? [twitterImage] : undefined,
    },
  };
}

async function getRelatedArticles(excludeArticleId: string, limit: number = 4) {
  try {
    await connectDB();
    const mongoose = require('mongoose');
    const oid = new mongoose.Types.ObjectId(excludeArticleId);
    const relatedArticlesRaw = await Article.aggregate([
      { $match: { _id: { $ne: oid } } },
      { $sample: { size: limit } },
      { $project: { content: 0 } },
    ]);

    const authorIds = new Set<string>();
    relatedArticlesRaw.forEach((a: any) => { if (a.author) authorIds.add(a.author.toString()); });
    const authorsMap = new Map<string, { _id: string; username: string }>();
    if (authorIds.size > 0) {
      const authors = await User.find({ _id: { $in: Array.from(authorIds) } }).select('username _id').lean();
      (authors as any[]).forEach((a: any) => authorsMap.set(a._id.toString(), { _id: a._id.toString(), username: a.username || 'erogram' }));
    }

    return relatedArticlesRaw.map((articleRaw: any) => ({
      _id: articleRaw._id.toString(),
      title: articleRaw.title,
      slug: articleRaw.slug,
      excerpt: articleRaw.excerpt || '',
      featuredImage: articleRaw.featuredImage || '',
      tags: articleRaw.tags || [],
      publishedAt: articleRaw.publishedAt || null,
      views: articleRaw.views || 0,
      author: articleRaw.author ? (authorsMap.get(articleRaw.author.toString()) || { _id: '', username: 'erogram' }) : { _id: '', username: 'erogram' },
    }));
  } catch (error) {
    console.error('Error fetching related articles:', error);
    return [];
  }
}

async function getTopGroups(limit: number = 5) {
  try {
    await connectDB();
    const groups = await Group.find({ status: 'approved', isAdvertisement: false })
      .sort({ views: -1 })
      .limit(limit)
      .select('name slug image category views description')
      .lean();

    return groups.map((g: any) => ({
      _id: g._id.toString(),
      name: g.name,
      slug: g.slug,
      image: g.image,
      category: g.category,
      views: g.views,
      description: g.description
    }));
  } catch (error) {
    console.error('Error fetching top groups:', error);
    return [];
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    notFound();
  }

  // Get 4 random related articles
  const relatedArticles = await getRelatedArticles(article._id, 4);

  // Top groups for sidebar widget (SEO + internal links)
  const [topGroups, topBannerCampaigns] = await Promise.all([
    getTopGroups(5),
    getActiveCampaigns('top-banner'),
  ]);

  const topBannerForPage =
    topBannerCampaigns.length > 0 && topBannerCampaigns[0].creative ? topBannerCampaigns : [];

  const articleUrl = `${BASE_URL}/articles/${article.slug}`;
  const imageUrl = toAbsoluteUrl(article.ogImage || article.featuredImage);

  const articleJsonLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    headline: article.title,
    description: article.metaDescription || article.excerpt || article.title,
    datePublished: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
    dateModified: article.updatedAt ? new Date(article.updatedAt).toISOString() : undefined,
    author: article.author?.username
      ? {
        '@type': 'Person',
        name: article.author.username,
      }
      : undefined,
    image: imageUrl ? [imageUrl] : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'Erogram',
      url: BASE_URL,
    },
  };

  // Remove undefined keys to keep JSON-LD minimal/valid
  Object.keys(articleJsonLd).forEach((k) => articleJsonLd[k] === undefined && delete articleJsonLd[k]);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: BASE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Articles',
        item: `${BASE_URL}/articles`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: article.title,
        item: articleUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ArticleClient article={article} relatedArticles={relatedArticles} topGroups={topGroups} topBannerCampaigns={topBannerForPage} />
    </>
  );
}
