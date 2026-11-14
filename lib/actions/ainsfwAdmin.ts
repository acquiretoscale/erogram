'use server';

import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import connectDB from '@/lib/db/mongodb';
import { User, AINsfwToolStats, AINsfwSubmission, Campaign } from '@/lib/models';
import { adminSetFeatured, revalidateAinsfwPublic } from '@/lib/actions/ainsfw';
import { isPublisherToken } from '@/lib/auth/publisherAccess';
import { uploadToR2, isR2Configured, deleteFromR2 } from '@/lib/r2';
import { AINSFW_GALLERY } from '@/app/ainsfw/galleryMap';
import { resolveGallery, type ToolContentFields } from '@/lib/ainsfw/toolContent';
import { invertToolSlug } from '@/app/ainsfw/data';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const JPG_QUALITY = 95;

function statsSlugQuery(slug: string): string | { $in: string[] } {
  const alt = invertToolSlug(slug);
  return alt && alt !== slug ? { $in: [slug, alt] } : slug;
}

async function requireAdmin(token: string) {
  if (!token) throw new Error('Unauthorized');
  if (isPublisherToken(token)) return;
  const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
  await connectDB();
  const user = await User.findById(decoded.id).select('isAdmin').lean() as { isAdmin?: boolean } | null;
  if (!user?.isAdmin) throw new Error('Unauthorized');
}

function slugKey(slug: string): string | { $in: string[] } {
  return statsSlugQuery(slug);
}

async function getStatsDoc(slug: string) {
  await connectDB();
  return AINsfwToolStats.findOne({ slug: slugKey(slug) }).lean() as any;
}

async function ensureStatsDoc(slug: string) {
  await connectDB();
  const existing = await getStatsDoc(slug);
  if (existing?.slug) return existing.slug as string;
  const doc = await AINsfwToolStats.findOneAndUpdate(
    { slug },
    { $setOnInsert: { slug } },
    { upsert: true, new: true },
  ).lean() as any;
  return doc.slug as string;
}

function fieldsFromDoc(doc?: any): ToolContentFields {
  if (!doc) return {};
  return {
    descriptionOverride: doc.descriptionOverride || '',
    imageOverride: doc.imageOverride || '',
    tryNowUrlOverride: doc.tryNowUrlOverride || '',
    customGallery: doc.customGallery || [],
    hiddenGalleryUrls: doc.hiddenGalleryUrls || [],
    galleryManaged: !!doc.galleryManaged || (doc.hiddenGalleryUrls?.length ?? 0) > 0 || (doc.customGallery?.length ?? 0) > 0,
    coverManaged: !!doc.coverManaged,
  };
}

export async function isToolGalleryManaged(slug: string): Promise<boolean> {
  const doc = await getStatsDoc(slug);
  if (!doc) return false;
  return !!doc.galleryManaged || (doc.hiddenGalleryUrls?.length ?? 0) > 0 || (doc.customGallery?.length ?? 0) > 0;
}

async function optimizeImage(buf: Buffer): Promise<Buffer> {
  const meta = await sharp(buf).metadata();
  const width = meta.width && meta.width > 1200 ? 1200 : meta.width;
  return sharp(buf)
    .resize(width, undefined, { withoutEnlargement: true })
    .jpeg({ quality: JPG_QUALITY, mozjpeg: true })
    .toBuffer();
}

export async function adminGetToolGallery(token: string, slug: string): Promise<string[]> {
  await requireAdmin(token);
  const doc = await getStatsDoc(slug);
  return resolveGallery(slug, fieldsFromDoc(doc));
}

export type FeaturedDurationChoice = 'off' | '7' | '14' | '30' | 'lifetime';

export type EditorReviewBlock = { title: string; body: string };

export async function adminLoadToolEditor(token: string, slug: string): Promise<{
  categories: string[];
  ctaText: string;
  featuredDuration: FeaturedDurationChoice;
  reviewIntro: string;
  reviewBlocks: EditorReviewBlock[];
}> {
  await requireAdmin(token);
  const [stats, submission] = await Promise.all([
    getStatsDoc(slug),
    AINsfwSubmission.findOne({ slug: slugKey(slug) }).select('categories category featured featuredExpiresAt').lean() as Promise<any>,
  ]);
  const fromStats = Array.isArray(stats?.categoriesOverride) ? stats.categoriesOverride.filter(Boolean) : [];
  const fromSub = Array.isArray(submission?.categories) && submission.categories.length
    ? submission.categories
    : submission?.category
      ? [submission.category]
      : [];
  const categories = (fromStats.length ? fromStats : fromSub).slice(0, 6);
  const duration = (stats?.featuredDuration || '') as FeaturedDurationChoice;
  const featuredOn = !!stats?.featured || !!submission?.featured;
  let featuredDuration: FeaturedDurationChoice = 'off';
  if (featuredOn && (duration === '7' || duration === '14' || duration === '30' || duration === 'lifetime')) {
    featuredDuration = duration;
  } else if (featuredOn && !stats?.featuredExpiresAt && !submission?.featuredExpiresAt) {
    featuredDuration = 'lifetime';
  } else if (featuredOn) {
    featuredDuration = '30';
  }
  const highlights = Array.isArray(stats?.editorialReview?.featureHighlights)
    ? stats.editorialReview.featureHighlights
        .map((h: any) => ({ title: String(h?.title || ''), body: String(h?.body || '') }))
        .filter((h: EditorReviewBlock) => h.title || h.body)
    : [];
  return {
    categories,
    ctaText: stats?.ctaText || '',
    featuredDuration,
    reviewIntro: stats?.editorialReview?.shortDescription || '',
    reviewBlocks: highlights,
  };
}

export async function adminSaveToolContent(
  token: string,
  slug: string,
  data: {
    description?: string;
    upvotes?: number;
    downvotes?: number;
    imageOverride?: string;
    tryNowUrl?: string;
    categories?: string[];
    ctaText?: string;
    featuredDuration?: FeaturedDurationChoice;
    reviewIntro?: string;
    reviewBlocks?: EditorReviewBlock[];
  },
): Promise<ToolContentFields & { upvotes: number; downvotes: number }> {
  await requireAdmin(token);
  const key = await ensureStatsDoc(slug);
  const set: Record<string, unknown> = {};
  const unset: Record<string, 1> = {};
  if (data.description !== undefined) set.descriptionOverride = data.description.trim();
  if (data.imageOverride !== undefined) {
    set.imageOverride = data.imageOverride.trim();
    set.coverManaged = true;
  }
  if (data.tryNowUrl !== undefined) {
    const url = data.tryNowUrl.trim();
    if (!url.startsWith('http')) throw new Error('Enter a valid URL starting with https://');
    set.tryNowUrlOverride = url;
  }
  if (data.upvotes !== undefined) set.upvotes = Math.max(0, data.upvotes);
  if (data.downvotes !== undefined) set.downvotes = Math.max(0, data.downvotes);
  if (data.ctaText !== undefined) set.ctaText = data.ctaText.trim().slice(0, 80);

  const categories = Array.isArray(data.categories)
    ? [...new Set(data.categories.map((c) => c.trim()).filter(Boolean))].slice(0, 6)
    : undefined;
  if (categories) set.categoriesOverride = categories;

  if (data.reviewIntro !== undefined || data.reviewBlocks !== undefined) {
    const intro = (data.reviewIntro || '').trim();
    const blocks = (data.reviewBlocks || [])
      .map((b) => ({ title: (b.title || '').trim(), body: (b.body || '').trim() }))
      .filter((b) => b.title && b.body)
      .slice(0, 6);
    if (!intro && blocks.length === 0) {
      unset.editorialReview = 1;
    } else {
      set.editorialReview = { shortDescription: intro, featureHighlights: blocks };
    }
  }

  if (data.featuredDuration) {
    if (data.featuredDuration === 'off') {
      set.featured = false;
      set.featuredDuration = '';
      set.featuredExpiresAt = null;
    } else {
      const days = data.featuredDuration === 'lifetime' ? 0 : Number(data.featuredDuration);
      const exp = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
      set.featured = true;
      set.featuredDuration = data.featuredDuration;
      set.featuredExpiresAt = exp;
    }
  }

  const update: Record<string, unknown> = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(unset).length) update.$unset = unset;

  const doc = await AINsfwToolStats.findOneAndUpdate(
    { slug: key },
    update,
    { upsert: true, new: true },
  ).lean() as any;

  const submissionSet: Record<string, unknown> = {};
  if (typeof set.tryNowUrlOverride === 'string') submissionSet.tryNowUrl = set.tryNowUrlOverride;
  if (categories?.length) {
    submissionSet.categories = categories;
    submissionSet.category = categories[0];
  }
  if (data.featuredDuration) {
    submissionSet.featured = data.featuredDuration !== 'off';
    submissionSet.boosted = data.featuredDuration !== 'off';
    submissionSet.featuredExpiresAt = data.featuredDuration === 'off' || data.featuredDuration === 'lifetime'
      ? null
      : set.featuredExpiresAt;
    submissionSet.boostExpiresAt = submissionSet.featuredExpiresAt;
  }
  if (Object.keys(submissionSet).length) {
    await AINsfwSubmission.updateMany({ slug: slugKey(slug) }, { $set: submissionSet });
  }

  if (data.featuredDuration) {
    const on = data.featuredDuration !== 'off';
    await adminSetFeatured(key, on);
    const fresh = await AINsfwToolStats.findOne({ slug: key }).select('campaignId').lean() as { campaignId?: unknown } | null;
    if (fresh?.campaignId) {
      const end = data.featuredDuration === 'lifetime' || data.featuredDuration === 'off'
        ? new Date(new Date().getFullYear() + 5, new Date().getMonth(), new Date().getDate())
        : (set.featuredExpiresAt as Date);
      await Campaign.findByIdAndUpdate(fresh.campaignId, {
        $set: on
          ? { status: 'active', isVisible: true, endDate: end, ...(set.ctaText ? { buttonText: set.ctaText } : {}) }
          : { status: 'paused', isVisible: false },
      });
    }
  }

  await revalidateAinsfwPublic(slug);

  return {
    ...fieldsFromDoc(doc),
    upvotes: doc.upvotes || 0,
    downvotes: doc.downvotes || 0,
  };
}

export async function adminUploadToolGalleryImage(
  token: string,
  slug: string,
  formData: FormData,
): Promise<{ url: string; gallery: string[] } | { error: string }> {
  await requireAdmin(token);
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) return { error: 'No file uploaded' };
  if (!isR2Configured()) return { error: 'R2 not configured' };

  const key = await ensureStatsDoc(slug);
  const doc = await getStatsDoc(slug);
  const current = resolveGallery(slug, fieldsFromDoc(doc));
  const buf = Buffer.from(await file.arrayBuffer());
  const optimized = await optimizeImage(buf);
  const cacheBust = Date.now().toString(36);
  const r2Key = `ainsfw/gallery/${slug.replace(/[^a-z0-9-]/gi, '')}-${cacheBust}.jpg`;
  const url = await uploadToR2(optimized, r2Key, 'image/jpeg');
  const gallery = [...current, url];

  await AINsfwToolStats.findOneAndUpdate(
    { slug: key },
    { $set: { customGallery: gallery, galleryManaged: true } },
    { upsert: true },
  );

  return { url, gallery };
}

export async function adminDeleteToolGalleryImage(
  token: string,
  slug: string,
  url: string,
): Promise<{ gallery: string[] } | { error: string }> {
  await requireAdmin(token);
  if (!url) return { error: 'Missing image URL' };

  const key = await ensureStatsDoc(slug);
  const doc = await getStatsDoc(slug);
  const fields = fieldsFromDoc(doc);
  let gallery = resolveGallery(slug, fields).filter((u) => u !== url);

  const hidden = new Set(fields.hiddenGalleryUrls || []);
  if ((AINSFW_GALLERY[slug] || []).includes(url)) hidden.add(url);

  const update: Record<string, unknown> = {
    customGallery: gallery,
    hiddenGalleryUrls: [...hidden],
    galleryManaged: true,
  };

  if (doc?.imageOverride === url) update.imageOverride = gallery[0] || '';

  await AINsfwToolStats.findOneAndUpdate({ slug: key }, { $set: update }, { upsert: true });

  if (url.includes('r2.dev') || url.includes(process.env.R2_PUBLIC_URL || '___none___')) {
    await deleteFromR2(url).catch(() => {});
  }

  return { gallery };
}

export async function adminSetToolFeaturedImage(
  token: string,
  slug: string,
  url: string,
): Promise<{ imageOverride: string } | { error: string }> {
  await requireAdmin(token);
  if (!url) return { error: 'Missing image URL' };
  const key = await ensureStatsDoc(slug);
  await AINsfwToolStats.findOneAndUpdate(
    { slug: key },
    { $set: { imageOverride: url, coverManaged: true } },
    { upsert: true },
  );
  return { imageOverride: url };
}

export async function adminUploadToolCoverImage(
  token: string,
  slug: string,
  formData: FormData,
): Promise<{ imageOverride: string } | { error: string }> {
  await requireAdmin(token);
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) return { error: 'No file uploaded' };
  if (!isR2Configured()) return { error: 'R2 not configured' };

  const key = await ensureStatsDoc(slug);
  const doc = await getStatsDoc(slug);
  const oldCover = doc?.imageOverride || '';
  const buf = Buffer.from(await file.arrayBuffer());
  const optimized = await optimizeImage(buf);
  const cacheBust = Date.now().toString(36);
  const r2Key = `ainsfw/cover/${slug.replace(/[^a-z0-9-]/gi, '')}-${cacheBust}.jpg`;
  const url = await uploadToR2(optimized, r2Key, 'image/jpeg');

  await AINsfwToolStats.findOneAndUpdate(
    { slug: key },
    { $set: { imageOverride: url, coverManaged: true } },
    { upsert: true },
  );
  await AINsfwSubmission.updateMany({ slug: slugKey(slug) }, { $set: { image: url } });

  if (oldCover && oldCover !== url && (oldCover.includes('r2.dev') || oldCover.includes(process.env.R2_PUBLIC_URL || '___none___'))) {
    await deleteFromR2(oldCover).catch(() => {});
  }

  return { imageOverride: url };
}

export async function adminDeleteToolCoverImage(
  token: string,
  slug: string,
): Promise<{ imageOverride: string } | { error: string }> {
  await requireAdmin(token);
  const key = await ensureStatsDoc(slug);
  const doc = await getStatsDoc(slug);
  const oldCover = doc?.imageOverride || '';

  await AINsfwToolStats.findOneAndUpdate(
    { slug: key },
    { $set: { imageOverride: '', coverManaged: true } },
    { upsert: true },
  );

  if (oldCover && (oldCover.includes('r2.dev') || oldCover.includes(process.env.R2_PUBLIC_URL || '___none___'))) {
    await deleteFromR2(oldCover).catch(() => {});
  }

  return { imageOverride: '' };
}

export async function getPublicToolGallery(slug: string): Promise<string[]> {
  const doc = await getStatsDoc(slug);
  return resolveGallery(slug, fieldsFromDoc(doc));
}

export async function adminSetFeaturedHubSlugs(
  token: string,
  _slugs: string[],
): Promise<{ slugs: string[] }> {
  await requireAdmin(token);
  throw new Error('The featured row follows paid bookings. Set featured and the number of days on the listing.');
}
