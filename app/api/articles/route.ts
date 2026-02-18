import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Article, User } from '@/lib/models';

// Get all articles (public endpoint) - same Mongoose model as admin/listing
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const articlesRaw = await Article.find({})
      .select('-content')
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(500)
      .lean();

    const authorIds = new Set<string>();
    (articlesRaw as any[]).forEach((a: any) => { if (a.author) authorIds.add(a.author.toString()); });
    const authorsMap = new Map<string, { _id: string; username: string }>();
    if (authorIds.size > 0) {
      const authors = await User.find({ _id: { $in: Array.from(authorIds) } }).select('username _id').lean();
      (authors as any[]).forEach((a: any) => authorsMap.set(a._id.toString(), { _id: a._id.toString(), username: a.username || 'erogram' }));
    }

    const articlesWithAuthors = (articlesRaw as any[]).map((article: any) => ({
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
      author: article.author ? (authorsMap.get(article.author.toString()) || { _id: '', username: 'erogram' }) : { _id: '', username: 'erogram' },
    }));

    return NextResponse.json(articlesWithAuthors);
  } catch (error: any) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { message: 'Failed to load articles' },
      { status: 500 }
    );
  }
}

