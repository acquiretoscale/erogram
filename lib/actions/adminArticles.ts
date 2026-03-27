'use server';

import { revalidatePath } from 'next/cache';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Article, Advertiser } from '@/lib/models';
import { slugify } from '@/lib/utils/slugify';
import { pingIndexNow } from '@/lib/utils/indexNow';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticateAdmin(token: string) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    await connectDB();
    const user = await User.findById(decoded.id);
    if (user && user.isAdmin) return user;
  } catch {
    return null;
  }
  return null;
}

export async function getArticles(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();

  const articlesRaw = await Article.find({})
    .select('-content')
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  const authorIds = new Set<string>();
  const advertiserIds = new Set<string>();
  (articlesRaw as any[]).forEach((a: any) => {
    if (a.author) authorIds.add(a.author.toString());
    if (a.advertiserId) advertiserIds.add(a.advertiserId.toString());
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
  const advertisersMap = new Map<string, string>();
  if (advertiserIds.size > 0) {
    const advertisers = await Advertiser.find({ _id: { $in: Array.from(advertiserIds) } }).select('name _id').lean();
    (advertisers as any[]).forEach((a: any) => advertisersMap.set(a._id.toString(), a.name || '—'));
  }

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const last7dKeys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    last7dKeys.push(d.toISOString().slice(0, 10));
  }
  const last30dKeys: string[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    last30dKeys.push(d.toISOString().slice(0, 10));
  }

  const articlesWithAuthors = (articlesRaw as any[]).map((article: any) => {
    const dayMap: Record<string, number> = article.viewsByDay instanceof Map
      ? Object.fromEntries(article.viewsByDay)
      : (article.viewsByDay || {});
    const views24h = dayMap[todayKey] || 0;
    const views7d = last7dKeys.reduce((s, k) => s + (dayMap[k] || 0), 0);
    const views30d = last30dKeys.reduce((s, k) => s + (dayMap[k] || 0), 0);

    return {
      _id: article._id.toString(),
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt !== undefined && article.excerpt !== null ? article.excerpt : '',
      featuredImage: article.featuredImage !== undefined && article.featuredImage !== null ? article.featuredImage : '',
      status: article.status !== undefined && article.status !== null ? article.status : 'draft',
      tags: article.tags || [],
      publishedAt: article.publishedAt || null,
      views: article.views || 0,
      views24h,
      views7d,
      views30d,
      advertiserId: article.advertiserId ? article.advertiserId.toString() : '',
      advertiserName: article.advertiserId ? advertisersMap.get(article.advertiserId.toString()) || '—' : '',
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
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
      author: article.author
        ? authorsMap.get(article.author.toString()) || { _id: '', username: 'erogram' }
        : { _id: '', username: 'erogram' },
    };
  });

  return JSON.parse(JSON.stringify(articlesWithAuthors));
}

export async function getArticle(token: string, id: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();

  const article = await Article.findById(id).lean();
  if (!article) throw new Error('Article not found');

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

  return JSON.parse(JSON.stringify(result));
}

export async function createArticle(token: string, data: Record<string, any>) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();

  const { title, content, excerpt, featuredImage, status, tags, metaTitle, metaDescription, metaKeywords, ogImage, ogTitle, ogDescription, twitterCard, twitterImage, twitterTitle, twitterDescription, advertiserId } = data;

  if (!title || !content) {
    throw new Error('Title and content are required');
  }

  const baseSlug = slugify(title);
  let slug = baseSlug;
  let counter = 1;
  while (await Article.findOne({ slug })) {
    slug = `${baseSlug}-${counter++}`;
  }

  const articleStatus = (status === 'published' || status === 'draft') ? status : 'draft';

  const article = new Article({
    title,
    slug,
    content,
    excerpt: excerpt !== undefined && excerpt !== null ? excerpt : '',
    featuredImage: featuredImage !== undefined && featuredImage !== null ? featuredImage : '',
    author: admin._id,
    advertiserId: advertiserId && String(advertiserId).trim() ? advertiserId : undefined,
    status: articleStatus,
    publishedAt: articleStatus === 'published' ? new Date() : null,
    tags: tags || [],
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

  article.status = articleStatus;
  article.excerpt = excerpt !== undefined && excerpt !== null ? excerpt : '';
  article.featuredImage = featuredImage !== undefined && featuredImage !== null ? featuredImage : '';
  article.tags = tags || [];

  article.markModified('excerpt');
  article.markModified('featuredImage');
  article.markModified('status');
  article.markModified('tags');

  await article.save();

  // Force update with $set using MongoDB native collection to bypass Mongoose completely
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

  await new Promise(resolve => setTimeout(resolve, 200));

  const savedArticleRaw = await articlesCollection.findOne({ _id: article._id });

  const savedArticle = savedArticleRaw ? {
    ...savedArticleRaw,
    _id: savedArticleRaw._id,
  } : null;

  if (!savedArticle) {
    throw new Error('Failed to retrieve created article');
  }

  let result: any;
  try {
    const authorDoc = await User.findById(admin._id.toString()).select('username').lean() as any;

    result = {
      _id: savedArticle._id.toString(),
      title: savedArticle.title,
      slug: savedArticle.slug,
      content: savedArticle.content,
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

    if (articleStatus === 'published') {
      pingIndexNow(`https://erogram.pro/articles/${slug}`);
    }
  } catch (err) {
    console.error('Error fetching author:', err);
    result = {
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
  }

  revalidatePath('/articles');
  revalidatePath(`/articles/${slug}`);
  revalidatePath('/sitemap.xml');

  return JSON.parse(JSON.stringify(result));
}

export async function updateArticle(token: string, id: string, data: Record<string, any>) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();

  const { title, content, excerpt, featuredImage, status, tags, metaTitle, metaDescription, metaKeywords, ogImage, ogTitle, ogDescription, twitterCard, twitterImage, twitterTitle, twitterDescription, advertiserId } = data;

  const oldArticle = await Article.findById(id);
  if (!oldArticle) throw new Error('Article not found');

  const articleId = id;

  const setFields: any = {
    content,
    updatedAt: new Date(),
    excerpt: excerpt !== undefined && excerpt !== null ? excerpt : '',
    featuredImage: featuredImage !== undefined && featuredImage !== null ? featuredImage : '',
    tags: tags || [],
    metaTitle: metaTitle !== undefined && metaTitle !== null ? metaTitle : '',
    metaDescription: metaDescription !== undefined && metaDescription !== null ? metaDescription : '',
    metaKeywords: metaKeywords !== undefined && metaKeywords !== null ? metaKeywords : '',
    ogImage: ogImage !== undefined && ogImage !== null ? ogImage : '',
    ogTitle: ogTitle !== undefined && ogTitle !== null ? ogTitle : '',
    ogDescription: ogDescription !== undefined && ogDescription !== null ? ogDescription : '',
    twitterCard: twitterCard || 'summary_large_image',
    twitterImage: twitterImage !== undefined && twitterImage !== null ? twitterImage : '',
    twitterTitle: twitterTitle !== undefined && twitterTitle !== null ? twitterTitle : '',
    twitterDescription: twitterDescription !== undefined && twitterDescription !== null ? twitterDescription : '',
  };

  if (title && title !== oldArticle.title) {
    setFields.title = title;
    // Do NOT regenerate the slug when only the title changes.
    // Changing the slug breaks the indexed URL in Google/Bing, causing 404s
    // and loss of all accumulated SEO equity for that page.
  }

  if (advertiserId !== undefined) {
    setFields.advertiserId = (advertiserId && String(advertiserId).trim()) ? advertiserId : null;
  }

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

  const finalUpdate: any = { $set: setFields };

  const mongoose = require('mongoose');
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB connection not available');
  }
  const articlesCollection = db.collection('articles');

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
    throw new Error('Article not found');
  }

  await new Promise(resolve => setTimeout(resolve, 200));

  const verifyArticleRaw = await articlesCollection.findOne({ _id: mongoId });

  const article = verifyArticleRaw;

  if (!article) {
    throw new Error('Article not found after update');
  }

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

  if (setFields.status === 'published' || (oldArticle.status === 'published' && setFields.status !== 'draft')) {
    pingIndexNow(`https://erogram.pro/articles/${article.slug}`);
  }

  revalidatePath('/articles');
  revalidatePath(`/articles/${article.slug}`);
  revalidatePath('/sitemap.xml');

  return JSON.parse(JSON.stringify(result));
}

export async function deleteArticle(token: string, id: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();

  const article = await Article.findByIdAndDelete(id);
  if (!article) throw new Error('Article not found');

  const slug = (article as any).slug;
  revalidatePath('/articles');
  if (slug) revalidatePath(`/articles/${slug}`);

  return { message: 'Article deleted successfully' };
}

export async function getArticleStats(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();

  const articles = await Article.find({}).select('views viewsByDay').lean();

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const last7dKeys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    last7dKeys.push(d.toISOString().slice(0, 10));
  }
  const last30dKeys: string[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    last30dKeys.push(d.toISOString().slice(0, 10));
  }

  let totalClicks = 0;
  let totalClicks24h = 0;
  let totalClicks7d = 0;
  let totalClicks30d = 0;

  for (const a of articles as any[]) {
    totalClicks += a.views || 0;
    const dayMap: Record<string, number> = a.viewsByDay instanceof Map
      ? Object.fromEntries(a.viewsByDay)
      : (a.viewsByDay || {});
    totalClicks24h += dayMap[todayKey] || 0;
    totalClicks7d += last7dKeys.reduce((s, k) => s + (dayMap[k] || 0), 0);
    totalClicks30d += last30dKeys.reduce((s, k) => s + (dayMap[k] || 0), 0);
  }

  return JSON.parse(JSON.stringify({
    totalClicks,
    totalClicks24h,
    totalClicks7d,
    totalClicks30d,
    count: articles.length,
  }));
}
