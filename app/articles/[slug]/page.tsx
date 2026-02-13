import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import connectDB from '@/lib/db/mongodb';
import { Article, User, Group } from '@/lib/models';
import ArticleClient from './ArticleClient';

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

    // Use native MongoDB to get article
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('MongoDB connection not available');
    }
    const articlesCollection = db.collection('articles');

    // Find article using native MongoDB
    const articleRaw = await articlesCollection.findOne({ slug, status: 'published' });

    if (!articleRaw) {
      return null;
    }

    // Manually fetch author information
    let author = null;
    if (articleRaw.author) {
      try {
        const authorDoc = await User.findById(articleRaw.author.toString()).select('username').lean() as any;
        author = authorDoc ? { _id: authorDoc._id.toString(), username: authorDoc.username } : null;
      } catch (err) {
        console.error('Error fetching author:', err);
        author = null;
      }
    }

    // Build result object with all fields explicitly
    const result = {
      _id: articleRaw._id.toString(),
      title: articleRaw.title,
      slug: articleRaw.slug,
      content: articleRaw.content || '',
      excerpt: articleRaw.excerpt || '',
      featuredImage: articleRaw.featuredImage || '',
      status: articleRaw.status || 'published',
      tags: articleRaw.tags || [],
      publishedAt: articleRaw.publishedAt || null,
      views: articleRaw.views || 0,
      createdAt: articleRaw.createdAt,
      updatedAt: articleRaw.updatedAt,
      author: author || { _id: '', username: 'erogram' },
      // SEO Metadata
      metaTitle: articleRaw.metaTitle || '',
      metaDescription: articleRaw.metaDescription || '',
      metaKeywords: articleRaw.metaKeywords || '',
      ogImage: articleRaw.ogImage || '',
      ogTitle: articleRaw.ogTitle || '',
      ogDescription: articleRaw.ogDescription || '',
      twitterCard: articleRaw.twitterCard || 'summary_large_image',
      twitterImage: articleRaw.twitterImage || '',
      twitterTitle: articleRaw.twitterTitle || '',
      twitterDescription: articleRaw.twitterDescription || '',
    };

    // Increment view count (fire and forget)
    Article.findByIdAndUpdate(articleRaw._id, {
      $inc: { views: 1 }
    }).catch(err => console.error('Error updating article views:', err));

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

    // Use native MongoDB to get random articles
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('MongoDB connection not available');
    }
    const articlesCollection = db.collection('articles');

    // Get random published articles excluding the current one
    const relatedArticlesRaw = await articlesCollection
      .aggregate([
        {
          $match: {
            status: 'published',
            _id: { $ne: new mongoose.Types.ObjectId(excludeArticleId) }
          }
        },
        { $sample: { size: limit } },
        { $project: { content: 0 } } // Exclude content for performance
      ])
      .toArray();

    // Manually fetch author information for each article
    const relatedArticlesWithAuthors = await Promise.all(
      relatedArticlesRaw.map(async (articleRaw: any) => {
        let author = null;
        if (articleRaw.author) {
          try {
            const authorDoc = await User.findById(articleRaw.author.toString()).select('username').lean() as any;
            author = authorDoc ? { _id: authorDoc._id.toString(), username: authorDoc.username } : null;
          } catch (err) {
            console.error('Error fetching author:', err);
            author = null;
          }
        }

        return {
          _id: articleRaw._id.toString(),
          title: articleRaw.title,
          slug: articleRaw.slug,
          excerpt: articleRaw.excerpt || '',
          featuredImage: articleRaw.featuredImage || '',
          tags: articleRaw.tags || [],
          publishedAt: articleRaw.publishedAt || null,
          views: articleRaw.views || 0,
          author: author || { _id: '', username: 'erogram' }
        };
      })
    );

    return relatedArticlesWithAuthors;
  } catch (error) {
    console.error('Error fetching related articles:', error);
    return [];
  }
}

async function getTopGroups(limit: number = 5) {
  try {
    await connectDB();
    // Fetch top groups by views
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

  // Get top 5 groups for sidebar
  const topGroups = await getTopGroups(5);

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
      <ArticleClient article={article} relatedArticles={relatedArticles} topGroups={topGroups} />
    </>
  );
}
