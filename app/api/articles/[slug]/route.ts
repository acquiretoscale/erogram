import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Article, User } from '@/lib/models';

// Get article by slug (public endpoint)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    
    const { slug } = await params;
    
    // Use native MongoDB to get article to ensure all fields are retrieved
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('MongoDB connection not available');
    }
    const articlesCollection = db.collection('articles');
    
    // Find article using native MongoDB
    const articleRaw = await articlesCollection.findOne({ slug, status: 'published' });
    
    if (!articleRaw) {
      return NextResponse.json(
        { message: 'Article not found' },
        { status: 404 }
      );
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
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { message: 'Failed to load article' },
      { status: 500 }
    );
  }
}

