import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Article } from '@/lib/models';
import { slugify } from '@/lib/utils/slugify';
import { submitToIndexNow } from '@/lib/utils/indexNow';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (user && user.isAdmin) {
      return user;
    }
  } catch (error) {
    return null;
  }
  return null;
}

// Get all articles
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }
    
    const articles = await Article.find({})
      .sort({ createdAt: -1 })
      .lean();
    
    // Manually populate author information
    const articlesWithAuthors = await Promise.all(
      articles.map(async (article: any) => {
        // Build result object explicitly to ensure all fields are included
        const result: any = {
          _id: article._id.toString(),
          title: article.title,
          slug: article.slug,
          content: article.content,
          excerpt: article.excerpt !== undefined && article.excerpt !== null ? article.excerpt : '',
          featuredImage: article.featuredImage !== undefined && article.featuredImage !== null ? article.featuredImage : '',
          status: article.status !== undefined && article.status !== null ? article.status : 'draft', // Use actual DB value
          tags: article.tags || [],
          publishedAt: article.publishedAt || null,
          views: article.views || 0,
          createdAt: article.createdAt,
          updatedAt: article.updatedAt,
          // SEO Metadata
          metaTitle: article.metaTitle || '',
          metaDescription: article.metaDescription || '',
          metaKeywords: article.metaKeywords || '',
          ogImage: article.ogImage || '',
          ogTitle: article.ogTitle || '',
          ogDescription: article.ogDescription || '',
          twitterCard: article.twitterCard || 'summary_large_image',
          twitterImage: article.twitterImage || '',
          twitterTitle: article.twitterTitle || '',
          twitterDescription: article.twitterDescription || '',
        };
        
        if (article.author) {
          try {
            const authorId = article.author.toString();
            const authorDoc = await User.findById(authorId).select('username').lean() as any;
            if (authorDoc && !Array.isArray(authorDoc)) {
              result.author = { _id: authorDoc._id.toString(), username: authorDoc.username };
            } else {
              result.author = { _id: '', username: 'erogram' };
            }
          } catch (err) {
            console.error(`Article ${result._id}: Error fetching author:`, err, 'Author ID:', article.author);
            result.author = { _id: '', username: 'erogram' };
          }
        } else {
          result.author = { _id: '', username: 'erogram' };
        }
        
        return result;
      })
    );
    
    return NextResponse.json(articlesWithAuthors);
  } catch (error: any) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

// Create new article
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { title, content, excerpt, featuredImage, status, tags, metaTitle, metaDescription, metaKeywords, ogImage, ogTitle, ogDescription, twitterCard, twitterImage, twitterTitle, twitterDescription } = body;
    
    // Validation
    if (!title || !content) {
      return NextResponse.json(
        { message: 'Title and content are required' },
        { status: 400 }
      );
    }
    
    // Generate unique slug
    const baseSlug = slugify(title);
    let slug = baseSlug;
    let counter = 1;
    while (await Article.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }
    
    // Create article
    const articleStatus = (status === 'published' || status === 'draft') ? status : 'draft';
    
    // Create article document
    const article = new Article({
      title,
      slug,
      content,
      excerpt: excerpt !== undefined && excerpt !== null ? excerpt : '',
      featuredImage: featuredImage !== undefined && featuredImage !== null ? featuredImage : '',
      author: admin._id,
      status: articleStatus,
      publishedAt: articleStatus === 'published' ? new Date() : null,
      tags: tags || [],
      // SEO Metadata
      metaTitle: metaTitle || '',
      metaDescription: metaDescription || '',
      metaKeywords: metaKeywords || '',
      ogImage: ogImage || '',
      ogTitle: ogTitle || '',
      ogDescription: ogDescription || '',
      twitterCard: twitterCard || 'summary_large_image',
      twitterImage: twitterImage || '',
      twitterTitle: twitterTitle || '',
      twitterDescription: twitterDescription || '',
    });
    
    // Explicitly set fields and mark as modified to ensure they're saved
    article.status = articleStatus;
    article.excerpt = excerpt !== undefined && excerpt !== null ? excerpt : '';
    article.featuredImage = featuredImage !== undefined && featuredImage !== null ? featuredImage : '';
    article.tags = tags || [];
    
    // Mark fields as modified to ensure Mongoose saves them
    article.markModified('excerpt');
    article.markModified('featuredImage');
    article.markModified('status');
    article.markModified('tags');
    
    // Save the article
    await article.save();
    
    // Force update with $set using MongoDB native collection to bypass Mongoose completely
    // This ensures fields are saved even if Mongoose tries to strip them
    await connectDB(); // Ensure DB is connected
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('MongoDB connection not available');
    }
    const articlesCollection = db.collection('articles');
    
    const forceUpdateData: any = {
      status: articleStatus,
      excerpt: excerpt !== undefined && excerpt !== null ? excerpt : '',
      featuredImage: featuredImage !== undefined && featuredImage !== null ? featuredImage : '',
      tags: tags || [],
      author: admin._id,
      metaTitle: metaTitle || '',
      metaDescription: metaDescription || '',
      metaKeywords: metaKeywords || '',
      ogImage: ogImage || '',
      ogTitle: ogTitle || '',
      ogDescription: ogDescription || '',
      twitterCard: twitterCard || 'summary_large_image',
      twitterImage: twitterImage || '',
      twitterTitle: twitterTitle || '',
      twitterDescription: twitterDescription || '',
    };
    
    await articlesCollection.updateOne(
      { _id: article._id },
      { $set: forceUpdateData }
    );
    
    // Wait a bit for write to complete
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Reload using native MongoDB collection to bypass Mongoose filtering
    const savedArticleRaw = await articlesCollection.findOne({ _id: article._id });
    
    // Convert to format Mongoose expects for response
    const savedArticle = savedArticleRaw ? {
      ...savedArticleRaw,
      _id: savedArticleRaw._id,
    } : null;
    
    if (!savedArticle) {
      return NextResponse.json(
        { message: 'Failed to retrieve created article' },
        { status: 500 }
      );
    }
    
    // Manually fetch author information and build response
    try {
      const authorDoc = await User.findById(admin._id.toString()).select('username').lean() as any;
      
      // Build result object - use DB values if they exist, otherwise use request values
      // This ensures we return what's actually in the DB
        const result = {
        _id: savedArticle._id.toString(),
        title: savedArticle.title,
        slug: savedArticle.slug,
        content: savedArticle.content,
        // Use DB value if it exists (even if empty string), otherwise use request value
        excerpt: (savedArticle.excerpt !== undefined && savedArticle.excerpt !== null)
          ? savedArticle.excerpt
          : (excerpt !== undefined && excerpt !== null ? excerpt : ''),
        featuredImage: (savedArticle.featuredImage !== undefined && savedArticle.featuredImage !== null)
          ? savedArticle.featuredImage
          : (featuredImage !== undefined && featuredImage !== null ? featuredImage : ''),
        status: (savedArticle.status !== undefined && savedArticle.status !== null)
          ? savedArticle.status
          : articleStatus,
        tags: savedArticle.tags || tags || [],
        publishedAt: savedArticle.publishedAt || null,
        views: savedArticle.views || 0,
        createdAt: savedArticle.createdAt,
        updatedAt: savedArticle.updatedAt,
        author: (authorDoc && !Array.isArray(authorDoc)) ? { _id: authorDoc._id.toString(), username: authorDoc.username } : { _id: '', username: 'erogram' },
        // SEO Metadata
        metaTitle: savedArticle.metaTitle || '',
        metaDescription: savedArticle.metaDescription || '',
        metaKeywords: savedArticle.metaKeywords || '',
        ogImage: savedArticle.ogImage || '',
        ogTitle: savedArticle.ogTitle || '',
        ogDescription: savedArticle.ogDescription || '',
        twitterCard: savedArticle.twitterCard || 'summary_large_image',
        twitterImage: savedArticle.twitterImage || '',
        twitterTitle: savedArticle.twitterTitle || '',
        twitterDescription: savedArticle.twitterDescription || '',
      };

      // Submit to IndexNow if published
      if (articleStatus === 'published') {
        submitToIndexNow([`https://erogram.pro/articles/${slug}`]);
      }

      return NextResponse.json(result);
    } catch (err) {
      console.error('Error fetching author:', err);
      // Build result without author
      const result = {
        _id: savedArticle._id.toString(),
        title: savedArticle.title,
        slug: savedArticle.slug,
        content: savedArticle.content,
        excerpt: savedArticle.excerpt || excerpt || '',
        featuredImage: savedArticle.featuredImage || featuredImage || '',
        status: savedArticle.status || articleStatus,
        tags: savedArticle.tags || tags || [],
        publishedAt: savedArticle.publishedAt || null,
        views: savedArticle.views || 0,
        createdAt: savedArticle.createdAt,
        updatedAt: savedArticle.updatedAt,
        author: null,
      };
      return NextResponse.json(result);
    }
  } catch (error: any) {
    console.error('Error creating article:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create article' },
      { status: 500 }
    );
  }
}

