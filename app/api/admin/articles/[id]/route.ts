import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Article, Advertiser } from '@/lib/models';

export const dynamic = 'force-dynamic';
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

// Get one article (full, including content) for editing
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }
    const { id } = await params;
    const article = await Article.findById(id).lean();
    if (!article) {
      return NextResponse.json({ message: 'Article not found' }, { status: 404 });
    }
    const a = article as any;
    let author = { _id: '', username: 'erogram' };
    if (a.author) {
      const authorDoc = await User.findById(a.author.toString()).select('username _id').lean() as any;
      if (authorDoc) author = { _id: authorDoc._id.toString(), username: authorDoc.username || 'erogram' };
    }
    let advertiserName = '';
    if (a.advertiserId) {
      const adv = await Advertiser.findById(a.advertiserId).select('name').lean() as any;
      advertiserName = adv?.name || '';
    }
    const result = {
      _id: a._id.toString(),
      title: a.title,
      slug: a.slug,
      content: a.content || '',
      excerpt: a.excerpt !== undefined && a.excerpt !== null ? a.excerpt : '',
      featuredImage: a.featuredImage !== undefined && a.featuredImage !== null ? a.featuredImage : '',
      status: a.status || 'draft',
      tags: a.tags || [],
      publishedAt: a.publishedAt || null,
      views: a.views || 0,
      advertiserId: a.advertiserId ? a.advertiserId.toString() : '',
      advertiserName,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      author,
      metaTitle: a.metaTitle || '',
      metaDescription: a.metaDescription || '',
      metaKeywords: a.metaKeywords || '',
      ogImage: a.ogImage || '',
      ogTitle: a.ogTitle || '',
      ogDescription: a.ogDescription || '',
      twitterCard: a.twitterCard || 'summary_large_image',
      twitterImage: a.twitterImage || '',
      twitterTitle: a.twitterTitle || '',
      twitterDescription: a.twitterDescription || '',
    };
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch article' },
      { status: 500 }
    );
  }
}

// Update article
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    const body = await req.json();
    const { title, content, excerpt, featuredImage, status, tags, metaTitle, metaDescription, metaKeywords, ogImage, ogTitle, ogDescription, twitterCard, twitterImage, twitterTitle, twitterDescription, advertiserId } = body;
    
    const oldArticle = await Article.findById(id);
    if (!oldArticle) {
      return NextResponse.json(
        { message: 'Article not found' },
        { status: 404 }
      );
    }
    
    // Prepare update data using $set to ensure all fields are updated
    const updateData: any = {
      $set: {
        content,
        updatedAt: new Date(),
      }
    };
    
    // Always set excerpt and featuredImage (even if empty strings)
    updateData.$set.excerpt = excerpt !== undefined && excerpt !== null ? excerpt : '';
    updateData.$set.featuredImage = featuredImage !== undefined && featuredImage !== null ? featuredImage : '';
    updateData.$set.tags = tags || [];
    
    // Handle status - explicitly set it
    if (status !== undefined && status !== null && (status === 'published' || status === 'draft')) {
      updateData.$set.status = status;
      // Handle publishedAt based on status
      if (status === 'published') {
        // If publishing for the first time or republishing, set publishedAt
        if (!oldArticle.publishedAt) {
          updateData.$set.publishedAt = new Date();
        }
        // If already published, keep the existing publishedAt (don't update it)
      } else if (status === 'draft') {
        // If changing to draft, clear publishedAt
        updateData.$set.publishedAt = null;
      }
    } else {
      // If status is not provided or invalid, keep the old status
      updateData.$set.status = oldArticle.status || 'draft';
    }
    
    // Handle title change - regenerate slug if title changed
    if (title && title !== oldArticle.title) {
      updateData.$set.title = title;
      const baseSlug = slugify(title);
      let slug = baseSlug;
      let counter = 1;
      while (await Article.findOne({ slug, _id: { $ne: id } })) {
        slug = `${baseSlug}-${counter++}`;
      }
      updateData.$set.slug = slug;
    }
    
    // Use updateOne with $set to ensure all fields are saved
    // id is already a string from params
    const articleId = id;
    
    // IMPORTANT: Use unset first, then set to ensure fields are saved even if they were empty/default
    // This forces MongoDB to store the fields even if they're empty strings
    const unsetFields: any = {};
    const setFields: any = {
      content,
      updatedAt: new Date(),
    };
    
    // Always set these fields explicitly, even if empty
    setFields.excerpt = excerpt !== undefined && excerpt !== null ? excerpt : '';
    setFields.featuredImage = featuredImage !== undefined && featuredImage !== null ? featuredImage : '';
    setFields.tags = tags || [];
    // SEO Metadata
    setFields.metaTitle = metaTitle !== undefined && metaTitle !== null ? metaTitle : '';
    setFields.metaDescription = metaDescription !== undefined && metaDescription !== null ? metaDescription : '';
    setFields.metaKeywords = metaKeywords !== undefined && metaKeywords !== null ? metaKeywords : '';
    setFields.ogImage = ogImage !== undefined && ogImage !== null ? ogImage : '';
    setFields.ogTitle = ogTitle !== undefined && ogTitle !== null ? ogTitle : '';
    setFields.ogDescription = ogDescription !== undefined && ogDescription !== null ? ogDescription : '';
    setFields.twitterCard = twitterCard || 'summary_large_image';
    setFields.twitterImage = twitterImage !== undefined && twitterImage !== null ? twitterImage : '';
    setFields.twitterTitle = twitterTitle !== undefined && twitterTitle !== null ? twitterTitle : '';
    setFields.twitterDescription = twitterDescription !== undefined && twitterDescription !== null ? twitterDescription : '';
    if (advertiserId !== undefined) {
      setFields.advertiserId = (advertiserId && String(advertiserId).trim()) ? advertiserId : null;
    }
    
    // Handle status
    if (status !== undefined && status !== null && (status === 'published' || status === 'draft')) {
      setFields.status = status;
      if (status === 'published') {
        if (!oldArticle.publishedAt) {
          setFields.publishedAt = new Date();
        }
      } else {
        setFields.publishedAt = null;
      }
    } else {
      setFields.status = oldArticle.status || 'draft';
    }
    
    // Build the full update with both $set and potentially $unset
    const finalUpdate: any = { $set: setFields };
    
    // Only unset if we need to clear fields that shouldn't exist
    if (Object.keys(unsetFields).length > 0) {
      finalUpdate.$unset = unsetFields;
    }
    
    // Try using MongoDB native collection to bypass Mongoose
    await connectDB(); // Ensure DB is connected
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('MongoDB connection not available');
    }
    const articlesCollection = db.collection('articles');
    
    // Convert ObjectId string to ObjectId for MongoDB query
    const ObjectId = mongoose.Types.ObjectId;
    const mongoId = new ObjectId(articleId);
    if (setFields.advertiserId && typeof setFields.advertiserId === 'string') {
      setFields.advertiserId = new ObjectId(setFields.advertiserId);
    } else if (setFields.advertiserId === null) {
      setFields.advertiserId = null;
    }
    
    const updateResult = await articlesCollection.updateOne(
      { _id: mongoId },
      finalUpdate
    );
    
    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { message: 'Article not found' },
        { status: 404 }
      );
    }
    
    // Wait for write to complete
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Verify the update worked by checking MongoDB directly (bypass Mongoose)
    const verifyArticleRaw = await articlesCollection.findOne({ _id: mongoId });
    
    // Use the raw MongoDB document to ensure we have all fields
    const article = verifyArticleRaw;
    
    if (!article) {
      return NextResponse.json(
        { message: 'Article not found after update' },
        { status: 404 }
      );
    }
    
    // Manually fetch author information
    let author = null;
    if (article.author) {
      try {
        const authorDoc = await User.findById(article.author.toString()).select('username').lean() as any;
        author = authorDoc ? { _id: authorDoc._id.toString(), username: authorDoc.username } : null;
        if (!authorDoc) {
          console.error(`Author not found for article ${article._id}, author ID: ${article.author}`);
        }
      } catch (err) {
        console.error('Error fetching author:', err, 'Author ID:', article.author);
        author = null;
      }
    }
    
    // Build result object explicitly using actual DB values
    let resultAdvertiserName = '';
    if (article.advertiserId) {
      const adv = await Advertiser.findById(article.advertiserId.toString()).select('name').lean() as any;
      resultAdvertiserName = adv?.name || '';
    }
    const result = {
      _id: article._id.toString(),
      title: article.title,
      slug: article.slug,
      content: article.content,
      excerpt: article.excerpt !== undefined && article.excerpt !== null ? article.excerpt : '',
      featuredImage: article.featuredImage !== undefined && article.featuredImage !== null ? article.featuredImage : '',
      status: article.status !== undefined && article.status !== null ? article.status : 'draft',
      tags: article.tags || [],
      publishedAt: article.publishedAt || null,
      views: article.views || 0,
      advertiserId: article.advertiserId ? article.advertiserId.toString() : '',
      advertiserName: resultAdvertiserName,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
        author: author || { _id: '', username: 'erogram' },
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

    // Submit to IndexNow if status changed to published
    if (setFields.status === 'published' && oldArticle.status !== 'published') {
      submitToIndexNow([`https://erogram.pro/articles/${article.slug}`]);
    }

    revalidatePath('/articles');
    revalidatePath(`/articles/${article.slug}`);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error updating article:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update article' },
      { status: 500 }
    );
  }
}

// Delete article
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    const article = await Article.findByIdAndDelete(id);
    
    if (!article) {
      return NextResponse.json(
        { message: 'Article not found' },
        { status: 404 }
      );
    }
    const slug = (article as any).slug;
    revalidatePath('/articles');
    if (slug) revalidatePath(`/articles/${slug}`);
    return NextResponse.json({ message: 'Article deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting article:', error);
    return NextResponse.json(
      { message: 'Failed to delete article' },
      { status: 500 }
    );
  }
}

