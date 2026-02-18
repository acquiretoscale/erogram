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
    const articleRaw = await Article.findOne({ slug }).lean();
    if (!articleRaw) {
      return NextResponse.json(
        { message: 'Article not found' },
        { status: 404 }
      );
    }

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
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { message: 'Failed to load article' },
      { status: 500 }
    );
  }
}

