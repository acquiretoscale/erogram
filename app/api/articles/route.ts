import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';

// Get all published articles (public endpoint)
export async function GET(req: NextRequest) {
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
    // Exclude content, limit to reasonable number, use indexes if available
    const articlesRaw = await articlesCollection
      .find({ status: 'published' })
      .sort({ publishedAt: -1, createdAt: -1 })
      .project({ 
        content: 0 // Exclude content field for performance - can't mix inclusion/exclusion
      })
      .limit(500) // Limit to 500 articles max for performance
      .toArray();
    
    // Collect unique author IDs (use Set for deduplication)
    const authorIds = new Set<string>();
    articlesRaw.forEach((article: any) => {
      if (article.author) {
        const authorId = article.author instanceof mongoose.Types.ObjectId 
          ? article.author.toString() 
          : String(article.author);
        authorIds.add(authorId);
      }
    });
    
    // Batch fetch all authors at once using native MongoDB
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
    
    // Build result objects efficiently
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
      
      // Get author from map efficiently
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
    
    return NextResponse.json(articlesWithAuthors);
  } catch (error: any) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { message: 'Failed to load articles' },
      { status: 500 }
    );
  }
}

