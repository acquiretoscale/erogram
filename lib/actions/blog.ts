'use server';

import connectDB from '@/lib/db/mongodb';
import { Article } from '@/lib/models';
import { DEFAULT_BLOG_CATEGORY } from '@/lib/blog/categories';
import { getAuthors, getAuthorBySlug, type AuthorProfile } from '@/lib/actions/authors';
import { getArticleCommentCounts } from '@/lib/actions/articleComments';

export interface BlogCard {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage: string;
  blogCategory: string;
  tags: string[];
  publishedAt: string | null;
  views: number;
  readMinutes: number;
  authorSlug: string;
  authorName: string;
  authorAvatar: string;
  commentCount: number;
}

export interface BlogArticleFull extends BlogCard {
  content: string;
  author: AuthorProfile;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogImage: string;
  ogTitle: string;
  ogDescription: string;
  twitterCard: string;
  twitterImage: string;
  twitterTitle: string;
  twitterDescription: string;
  updatedAt: string | null;
  videoBlocks: { url: string; caption?: string; link?: string; linktext?: string; position: string }[];
  ctaBlocks: { url: string; text: string; headline?: string; description?: string; position: string }[];
}

function readMinutes(content: string): number {
  const words = (content || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

function toCard(a: any, authorName: string, authorAvatar: string, commentCount: number): BlogCard {
  return {
    _id: a._id.toString(),
    title: a.title || '',
    slug: a.slug || '',
    excerpt: a.excerpt || '',
    featuredImage: a.featuredImage || '',
    blogCategory: a.blogCategory || DEFAULT_BLOG_CATEGORY,
    tags: a.tags || [],
    publishedAt: a.publishedAt ? new Date(a.publishedAt).toISOString() : null,
    views: a.views || 0,
    readMinutes: readMinutes(a.content || ''),
    authorSlug: a.authorSlug || 'eros',
    authorName,
    authorAvatar,
    commentCount,
  };
}

async function mapCards(rows: any[]): Promise<BlogCard[]> {
  const authors = await getAuthors();
  const bySlug = new Map(authors.map((au) => [au.slug, au]));
  const counts = await getArticleCommentCounts(rows.map((a) => a.slug).filter(Boolean));
  return rows.map((a) => {
    const au = bySlug.get(a.authorSlug || 'eros') || bySlug.get('eros');
    return toCard(a, au?.name || 'Enzo Delacroix', au?.avatar || '', counts[a.slug] || 0);
  });
}

const CARD_FIELDS = 'title slug excerpt featuredImage blogCategory tags publishedAt views authorSlug content';

/** All published articles (newest first), for the /blog hub. */
export async function getPublishedBlogArticles(limit = 60): Promise<BlogCard[]> {
  try {
    await connectDB();
    const rows = await Article.find({ status: 'published' })
      .select(CARD_FIELDS)
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit)
      .lean();
    return await mapCards(rows as any[]);
  } catch (e) {
    console.error('[blog] getPublishedBlogArticles failed:', e);
    return [];
  }
}

/** Published articles for one category. */
export async function getBlogArticlesByCategory(categorySlug: string, limit = 60): Promise<BlogCard[]> {
  try {
    await connectDB();
    const rows = await Article.find({ status: 'published', blogCategory: categorySlug })
      .select(CARD_FIELDS)
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit)
      .lean();
    return await mapCards(rows as any[]);
  } catch (e) {
    console.error('[blog] getBlogArticlesByCategory failed:', e);
    return [];
  }
}

/** Single published article by slug (returns null for drafts/missing). */
export async function getBlogArticleBySlug(slug: string): Promise<BlogArticleFull | null> {
  try {
    await connectDB();
    const a = await Article.findOne({ slug, status: 'published' }).lean() as any;
    if (!a) return null;
    const author = await getAuthorBySlug(a.authorSlug);
    const card = toCard(a, author.name, author.avatar, 0);

    const todayKey = new Date().toISOString().slice(0, 10);
    Article.findByIdAndUpdate(a._id, { $inc: { views: 1, [`viewsByDay.${todayKey}`]: 1 } }).catch(() => {});

    return {
      ...card,
      author,
      content: a.content || '',
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
      updatedAt: a.updatedAt ? new Date(a.updatedAt).toISOString() : null,
      videoBlocks: a.videoBlocks || [],
      ctaBlocks: a.ctaBlocks || [],
    };
  } catch (e) {
    console.error('[blog] getBlogArticleBySlug failed:', e);
    return null;
  }
}

/** Related published articles (same category first, newest), excluding the current one. */
export async function getRelatedBlogArticles(excludeId: string, categorySlug: string, limit = 3): Promise<BlogCard[]> {
  try {
    await connectDB();
    const mongoose = require('mongoose');
    const oid = new mongoose.Types.ObjectId(excludeId);
    let rows = await Article.find({ status: 'published', blogCategory: categorySlug, _id: { $ne: oid } })
      .select(CARD_FIELDS)
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit)
      .lean();
    if ((rows as any[]).length < limit) {
      const extra = await Article.find({ status: 'published', _id: { $ne: oid }, blogCategory: { $ne: categorySlug } })
        .select(CARD_FIELDS)
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(limit - (rows as any[]).length)
        .lean();
      rows = [...(rows as any[]), ...(extra as any[])];
    }
    return await mapCards(rows as any[]);
  } catch (e) {
    console.error('[blog] getRelatedBlogArticles failed:', e);
    return [];
  }
}

/** Top N published articles by views (most-read). */
export async function getTopBlogArticles(limit = 10): Promise<BlogCard[]> {
  try {
    await connectDB();
    const rows = await Article.find({ status: 'published' })
      .select(CARD_FIELDS)
      .sort({ views: -1, publishedAt: -1 })
      .limit(limit)
      .lean();
    return await mapCards(rows as any[]);
  } catch (e) {
    console.error('[blog] getTopBlogArticles failed:', e);
    return [];
  }
}

/** Slugs of all published articles — for sitemap + static params. */
export async function getPublishedBlogSlugs(): Promise<{ slug: string; updatedAt: Date | null; publishedAt: Date | null }[]> {
  try {
    await connectDB();
    const rows = await Article.find({ status: 'published' }).select('slug updatedAt publishedAt').lean();
    return (rows as any[]).map((a) => ({ slug: a.slug, updatedAt: a.updatedAt || null, publishedAt: a.publishedAt || null }));
  } catch (e) {
    console.error('[blog] getPublishedBlogSlugs failed:', e);
    return [];
  }
}
