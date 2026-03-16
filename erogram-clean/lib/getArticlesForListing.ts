import connectDB from '@/lib/db/mongodb';
import { Article, User } from '@/lib/models';
import mongoose from 'mongoose';

export interface ArticleForListing {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage: string;
  status: string;
  tags: string[];
  publishedAt: string | null;
  views: number;
  createdAt: string;
  updatedAt: string;
  author: { _id: string; username: string };
}

/**
 * Server-only: fetch articles for the /articles hub. Used by the page so the list is in the initial HTML.
 */
export async function getArticlesForListing(): Promise<ArticleForListing[]> {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) throw new Error('MONGODB_URI missing');

    // Force strict connection for this specific function to ensure it works like the script
    if (mongoose.connection.readyState !== 1) {
      console.log('[getArticlesForListing] Connecting explicitly...');
      await mongoose.connect(MONGODB_URI, {
        family: 4,
        serverSelectionTimeoutMS: 5000,
        bufferCommands: false,
      });
      console.log('[getArticlesForListing] Connected!');
    }

    const articlesRaw = await Article.find({})
      .select('-content')
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(500)
      .lean();

    console.log(`[getArticlesForListing] Fetched ${articlesRaw.length} articles`);

    const authorIds = new Set<string>();
    (articlesRaw as any[]).forEach((a: any) => {
      if (a.author) authorIds.add(a.author.toString());
    });
    const authorsMap = new Map<string, { _id: string; username: string }>();
    if (authorIds.size > 0) {
      const authors = await User.find({ _id: { $in: Array.from(authorIds) } })
        .select('username _id')
        .lean();
      (authors as any[]).forEach((a: any) =>
        authorsMap.set(a._id.toString(), { _id: a._id.toString(), username: a.username || 'erogram' })
      );
    }

    return (articlesRaw as any[]).map((article: any) => ({
      _id: article._id.toString(),
      title: article.title || '',
      slug: article.slug || '',
      excerpt: article.excerpt || '',
      featuredImage: article.featuredImage || '',
      status: article.status || 'published',
      tags: article.tags || [],
      publishedAt: article.publishedAt || null,
      views: article.views || 0,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      author: article.author
        ? authorsMap.get(article.author.toString()) || { _id: '', username: 'erogram' }
        : { _id: '', username: 'erogram' },
    }));
  } catch (error) {
    console.error('[getArticlesForListing] CRITICAL ERROR:', error);
    return [];
  }
}

