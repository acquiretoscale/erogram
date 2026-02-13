import { Metadata } from 'next';
import connectDB from '@/lib/db/mongodb';
import { Article, User } from '@/lib/models';
import ArticlesClient from './ArticlesClient';

const baseUrl = 'https://erogram.pro';

export const metadata: Metadata = {
  title: 'NSFW Telegram Articles, Guides & Community Stories | Erogram.pro',
  description: 'Read expert guides, community stories, and insights about NSFW Telegram groups. Learn how to find safe adult communities, discover trending groups, and connect with like-minded people. Updated daily with fresh content.',
  keywords: 'NSFW telegram articles, adult community guides, telegram group stories, NSFW telegram tips, adult chat guides, telegram community insights, erotic telegram stories',
  alternates: {
    canonical: `${baseUrl}/articles`,
  },
  openGraph: {
    title: 'NSFW Telegram Articles, Guides & Community Stories | Erogram.pro',
    description: 'Read expert guides, community stories, and insights about NSFW Telegram groups. Learn how to find safe adult communities, discover trending groups, and connect with like-minded people.',
    type: 'website',
    siteName: 'Erogram',
    url: `${baseUrl}/articles`,
    images: [
      {
        url: `${baseUrl}/assets/image.jpg`,
        width: 1200,
        height: 630,
        alt: 'NSFW Telegram Articles and Guides - Erogram.pro',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NSFW Telegram Articles, Guides & Community Stories | Erogram.pro',
    description: 'Read expert guides, community stories, and insights about NSFW Telegram groups. Learn how to find safe adult communities.',
    images: [`${baseUrl}/assets/image.jpg`],
  },
};

// ISR for public listing page
export const revalidate = 300;

async function getArticles() {
  try {
    await connectDB();
    
    // Use native MongoDB for maximum performance
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('MongoDB connection not available');
    }
    const articlesCollection = db.collection('articles');
    const usersCollection = db.collection('users');
    
    // Find published articles using native MongoDB with optimized query
    const articlesRaw = await articlesCollection
      .find({ status: 'published' })
      .sort({ publishedAt: -1, createdAt: -1 })
      .project({ 
        content: 0 // Exclude content field for performance
      })
      .limit(500)
      .toArray();
    
    // Collect unique author IDs
    const authorIds = new Set<string>();
    articlesRaw.forEach((article: any) => {
      if (article.author) {
        const authorId = article.author instanceof mongoose.Types.ObjectId 
          ? article.author.toString() 
          : String(article.author);
        authorIds.add(authorId);
      }
    });
    
    // Batch fetch all authors at once
    const authorsMap = new Map<string, { _id: string; username: string }>();
    if (authorIds.size > 0) {
      const ObjectId = mongoose.Types.ObjectId;
      const authorObjectIds = Array.from(authorIds)
        .filter(id => ObjectId.isValid(id))
        .map(id => new ObjectId(id));
      
      if (authorObjectIds.length > 0) {
        const authorDocs = await usersCollection
          .find({ _id: { $in: authorObjectIds } })
          .project({ username: 1, _id: 1 })
          .toArray();
        
        authorDocs.forEach((author: any) => {
          const authorId = author._id.toString();
          authorsMap.set(authorId, {
            _id: authorId,
            username: author.username || 'erogram'
          });
        });
      }
    }
    
    // Build result objects
    const articlesWithAuthors = articlesRaw.map((article: any) => {
      const result: any = {
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
      };
      
      // Get author from map
      if (article.author) {
        const authorId = article.author instanceof mongoose.Types.ObjectId
          ? article.author.toString()
          : String(article.author);
        const author = authorsMap.get(authorId);
        result.author = author || { _id: '', username: 'erogram' };
      } else {
        result.author = { _id: '', username: 'erogram' };
      }
      
      return result;
    });
    
    return articlesWithAuthors;
  } catch (error) {
    console.error('Error fetching articles:', error);
    return [];
  }
}

export default async function ArticlesPage() {
  const articles = await getArticles();

  return <ArticlesClient initialArticles={articles} />;
}
