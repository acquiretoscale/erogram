'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { AINsfwToolStats, Campaign, Advertiser, AINsfwSubmission, User } from '@/lib/models';
import type { AINsfwTool } from '@/app/ainsfw/types';
import { invertToolSlug, toolSlug } from '@/app/ainsfw/data';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

function slugQuery(slug: string): string | { $in: string[] } {
  const alt = invertToolSlug(slug);
  return alt && alt !== slug ? { $in: [slug, alt] } : slug;
}

export interface ToolReviewData {
  text: string;
  rating: number;
  createdAt: string;
  authorName: string;
  authorAvatar: string;
  status?: 'pending' | 'approved' | 'rejected';
}

function mapReview(r: any, includeStatus = false): ToolReviewData {
  const row: ToolReviewData = {
    text: r.text,
    rating: r.rating,
    createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '',
    authorName: r.authorName || 'Member',
    authorAvatar: r.authorAvatar || '',
  };
  if (includeStatus) {
    row.status = r.status || 'approved';
  }
  return row;
}

function isPublicReview(r: any): boolean {
  const status = r.status || 'approved';
  return status === 'approved' && !!r.author;
}

function docToStats(doc: any, admin = false): ToolStatsData {
  const raw = doc.reviews || [];
  const filtered = admin ? raw : raw.filter(isPublicReview);
  return {
    upvotes: doc.upvotes || 0,
    downvotes: doc.downvotes || 0,
    featured: !!doc.featured,
    campaignId: doc.campaignId?.toString() || undefined,
    descriptionOverride: doc.descriptionOverride || '',
    imageOverride: doc.imageOverride || '',
    customGallery: doc.customGallery || [],
    hiddenGalleryUrls: doc.hiddenGalleryUrls || [],
    galleryManaged: !!doc.galleryManaged || (doc.hiddenGalleryUrls?.length ?? 0) > 0 || (doc.customGallery?.length ?? 0) > 0,
    coverManaged: !!doc.coverManaged,
    reviews: filtered.map((r: any) => mapReview(r, admin)),
  };
}

export interface ToolStatsData {
  upvotes: number;
  downvotes: number;
  featured: boolean;
  campaignId?: string;
  descriptionOverride?: string;
  imageOverride?: string;
  customGallery?: string[];
  hiddenGalleryUrls?: string[];
  galleryManaged?: boolean;
  coverManaged?: boolean;
  reviews: ToolReviewData[];
}

export async function getToolStats(slug: string): Promise<ToolStatsData> {
  await connectDB();
  const doc = await AINsfwToolStats.findOne({ slug: slugQuery(slug) }).lean() as any;
  if (!doc) return { upvotes: 0, downvotes: 0, featured: false, reviews: [], descriptionOverride: '', imageOverride: '', customGallery: [], hiddenGalleryUrls: [], galleryManaged: false };
  return docToStats(doc);
}

export async function getAllToolStats(slugs: string[]): Promise<Record<string, ToolStatsData>> {
  await connectDB();
  const querySlugs = [...new Set(slugs.flatMap((s) => {
    const alt = invertToolSlug(s);
    return alt && alt !== s ? [s, alt] : [s];
  }))];
  const docs = await AINsfwToolStats.find({ slug: { $in: querySlugs } }).lean() as any[];
  const bySlug = new Map(docs.map((d) => [d.slug, d]));
  const map: Record<string, ToolStatsData> = {};
  for (const slug of slugs) {
    const doc = bySlug.get(slug) || bySlug.get(invertToolSlug(slug) || '');
    if (doc) map[slug] = docToStats(doc);
  }
  return map;
}

export async function getAllToolStatsAdmin(slugs: string[]): Promise<Record<string, ToolStatsData>> {
  await connectDB();
  const querySlugs = [...new Set(slugs.flatMap((s) => {
    const alt = invertToolSlug(s);
    return alt && alt !== s ? [s, alt] : [s];
  }))];
  const docs = await AINsfwToolStats.find({ slug: { $in: querySlugs } }).lean() as any[];
  const bySlug = new Map(docs.map((d) => [d.slug, d]));
  const map: Record<string, ToolStatsData> = {};
  for (const slug of slugs) {
    const doc = bySlug.get(slug) || bySlug.get(invertToolSlug(slug) || '');
    if (doc) map[slug] = docToStats(doc, true);
  }
  return map;
}

/** Fire-and-forget outbound click on Visit / Try Now (all tools). */
export async function trackAinsfwToolClick(slug: string): Promise<void> {
  if (!slug?.trim()) return;
  try {
    await connectDB();
    const existing = await AINsfwToolStats.findOne({ slug: slugQuery(slug) }).select('_id slug').lean() as
      | { _id: unknown; slug: string }
      | null;
    const key = existing?.slug || slug;
    await AINsfwToolStats.updateOne(
      { slug: key },
      { $inc: { clickCount: 1 }, $set: { lastClickedAt: new Date() } },
      { upsert: true },
    );
    await AINsfwSubmission.updateMany({ slug: slugQuery(slug) }, { $inc: { clickCount: 1 } });
  } catch {
    // Never block the user on tracking
  }
}

export async function voteOnTool(slug: string, direction: 'up' | 'down'): Promise<{ upvotes: number; downvotes: number }> {
  await connectDB();
  const field = direction === 'up' ? 'upvotes' : 'downvotes';
  const existing = await AINsfwToolStats.findOne({ slug: slugQuery(slug) }).lean() as any;
  const key = existing?.slug || slug;
  const doc = await AINsfwToolStats.findOneAndUpdate(
    { slug: key },
    { $inc: { [field]: 1 } },
    { upsert: true, new: true },
  ).lean() as any;
  return { upvotes: doc.upvotes || 0, downvotes: doc.downvotes || 0 };
}

export async function unvoteOnTool(slug: string, direction: 'up' | 'down'): Promise<{ upvotes: number; downvotes: number }> {
  await connectDB();
  const field = direction === 'up' ? 'upvotes' : 'downvotes';
  const existing = await AINsfwToolStats.findOne({ slug: slugQuery(slug) }).lean() as any;
  const key = existing?.slug || slug;
  const doc = await AINsfwToolStats.findOneAndUpdate(
    { slug: key },
    { $inc: { [field]: -1 } },
    { upsert: true, new: true },
  ).lean() as any;
  const upvotes = Math.max(0, doc.upvotes || 0);
  const downvotes = Math.max(0, doc.downvotes || 0);
  return { upvotes, downvotes };
}

export async function adminSetToolVotes(
  slug: string,
  upvotes: number,
  downvotes: number,
): Promise<{ upvotes: number; downvotes: number }> {
  await connectDB();
  const doc = await AINsfwToolStats.findOneAndUpdate(
    { slug },
    { $set: { upvotes: Math.max(0, upvotes), downvotes: Math.max(0, downvotes) } },
    { upsert: true, new: true },
  ).lean() as any;
  return { upvotes: doc.upvotes || 0, downvotes: doc.downvotes || 0 };
}

export async function adminDeleteReview(slug: string, reviewIdx: number): Promise<ToolStatsData> {
  await connectDB();
  const doc = await AINsfwToolStats.findOne({ slug: slugQuery(slug) });
  if (!doc) return { upvotes: 0, downvotes: 0, featured: false, reviews: [], descriptionOverride: '', imageOverride: '', customGallery: [], hiddenGalleryUrls: [], galleryManaged: false };
  if (doc.reviews && reviewIdx >= 0 && reviewIdx < doc.reviews.length) {
    doc.reviews.splice(reviewIdx, 1);
    await doc.save();
  }
  return docToStats(doc.toObject(), true);
}

export async function adminModerateReview(
  slug: string,
  reviewIdx: number,
  status: 'approved' | 'rejected',
): Promise<ToolStatsData> {
  await connectDB();
  const doc = await AINsfwToolStats.findOne({ slug: slugQuery(slug) });
  if (!doc) throw new Error('Tool not found');
  if (!doc.reviews || reviewIdx < 0 || reviewIdx >= doc.reviews.length) throw new Error('Review not found');
  doc.reviews[reviewIdx].status = status;
  await doc.save();
  return docToStats(doc.toObject(), true);
}

export async function submitReview(
  slug: string,
  text: string,
  rating: number,
  token: string,
): Promise<{ message: string }> {
  if (!text.trim() || rating < 1 || rating > 5) throw new Error('Invalid review');
  if (!token) throw new Error('Login required to submit a review');

  let user: { _id: string; username: string; photoUrl?: string | null } | null = null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    await connectDB();
    user = await User.findById(decoded.id).select('username photoUrl').lean() as any;
  } catch {
    throw new Error('Login required to submit a review');
  }
  if (!user) throw new Error('Login required to submit a review');

  const existing = await AINsfwToolStats.findOne({ slug: slugQuery(slug) }).lean() as any;
  const key = existing?.slug || slug;
  await AINsfwToolStats.findOneAndUpdate(
    { slug: key },
    {
      $push: {
        reviews: {
          $each: [{
            text: text.trim().slice(0, 1000),
            rating,
            author: user._id,
            authorName: user.username,
            authorAvatar: user.photoUrl || '',
            status: 'approved',
            createdAt: new Date(),
          }],
          $position: 0,
          $slice: 100,
        },
      },
    },
    { upsert: true, new: true },
  );

  return { message: 'Your review is live!' };
}

async function getOrCreateNsfwAdvertiser() {
  let adv = await Advertiser.findOne({ name: 'AI NSFW Featured' }).lean() as any;
  if (!adv) {
    adv = await Advertiser.create({ name: 'AI NSFW Featured', email: 'internal@erogram.pro', company: 'Internal', status: 'active' });
  }
  return adv._id;
}

/** Drop expired 1-month boost featured flags (submission + matching stats + pause campaign). */
async function expireAinsfwBoostFeatured() {
  const now = new Date();
  const expired = await AINsfwSubmission.find(
    { featured: true, featuredExpiresAt: { $ne: null, $lte: now } },
    { slug: 1 },
  ).lean() as any[];
  if (!expired.length) return;

  const slugs = expired.map((d) => d.slug);
  await AINsfwSubmission.updateMany(
    { slug: { $in: slugs } },
    { $set: { featured: false, boosted: false, boostExpiresAt: null } },
  );

  const statsDocs = await AINsfwToolStats.find({ slug: { $in: slugs } }, { slug: 1, campaignId: 1 }).lean() as any[];
  await AINsfwToolStats.updateMany({ slug: { $in: slugs } }, { $set: { featured: false } });
  for (const d of statsDocs) {
    if (d.campaignId) {
      await Campaign.findByIdAndUpdate(d.campaignId, { $set: { status: 'paused', isVisible: false } });
    }
  }
}

const activeBoostFeaturedFilter = () => {
  const now = new Date();
  return {
    featured: true,
    status: 'approved',
    paymentStatus: 'paid',
    unlisted: { $ne: true },
    $or: [{ featuredExpiresAt: null }, { featuredExpiresAt: { $gt: now } }],
  };
};

export async function adminSetFeatured(slug: string, featured: boolean): Promise<boolean> {
  await connectDB();

  const doc = await AINsfwToolStats.findOneAndUpdate(
    { slug },
    { $set: { featured } },
    { upsert: true, new: true },
  ) as any;

  if (featured) {
    if (doc.campaignId) {
      await Campaign.findByIdAndUpdate(doc.campaignId, { $set: { status: 'active', isVisible: true } });
    } else {
      const advertiserId = await getOrCreateNsfwAdvertiser();
      const now = new Date();
      const endDate = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
      const campaign = await Campaign.create({
        advertiserId,
        name: `Featured NSFW: ${slug}`,
        internalName: slug,
        slot: 'ainsfw',
        creative: '',
        destinationUrl: `/${slug}`,
        startDate: now,
        endDate,
        status: 'active',
        isVisible: true,
        adType: 'featured-nsfw',
        description: `Featured AI NSFW tool: ${slug}`,
        buttonText: 'Try Now',
      });
      await AINsfwToolStats.findOneAndUpdate({ slug }, { $set: { campaignId: campaign._id } });
    }
  } else {
    if (doc.campaignId) {
      await Campaign.findByIdAndUpdate(doc.campaignId, { $set: { status: 'paused', isVisible: false } });
    }
  }

  return featured;
}

export interface FeaturedToolInfo {
  slug: string;
  campaignId?: string;
}

export async function getBoostFeaturedSlugs(): Promise<string[]> {
  await connectDB();
  await expireAinsfwBoostFeatured();
  const docs = await AINsfwSubmission.find(activeBoostFeaturedFilter(), { slug: 1 })
    .sort({ featuredExpiresAt: 1, createdAt: -1 })
    .lean() as any[];
  return docs.map((d) => d.slug);
}

export async function getFeaturedSlugs(): Promise<string[]> {
  await connectDB();
  await expireAinsfwBoostFeatured();
  const [statsDocs, subDocs] = await Promise.all([
    AINsfwToolStats.find({ featured: true }, { slug: 1 }).lean() as any,
    AINsfwSubmission.find(activeBoostFeaturedFilter(), { slug: 1 }).lean() as any,
  ]);
  const slugs = new Set<string>();
  for (const d of statsDocs) slugs.add(d.slug);
  for (const d of subDocs) slugs.add(d.slug);
  return [...slugs];
}

export async function getFeaturedTools(): Promise<FeaturedToolInfo[]> {
  await connectDB();
  await expireAinsfwBoostFeatured();
  const [statsDocs, subDocs] = await Promise.all([
    AINsfwToolStats.find({ featured: true }, { slug: 1, campaignId: 1 }).lean() as any,
    AINsfwSubmission.find(activeBoostFeaturedFilter(), { slug: 1 }).lean() as any,
  ]);
  const results: FeaturedToolInfo[] = [];
  const seen = new Set<string>();

  for (const d of statsDocs) {
    seen.add(d.slug);
    if (!d.campaignId) {
      const advertiserId = await getOrCreateNsfwAdvertiser();
      const now = new Date();
      const endDate = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
      const campaign = await Campaign.create({
        advertiserId,
        name: `Featured NSFW: ${d.slug}`,
        internalName: d.slug,
        slot: 'ainsfw',
        creative: '',
        destinationUrl: `/${d.slug}`,
        startDate: now,
        endDate,
        status: 'active',
        isVisible: true,
        adType: 'featured-nsfw',
        description: `Featured AI NSFW tool: ${d.slug}`,
        buttonText: 'Try Now',
      });
      await AINsfwToolStats.findOneAndUpdate({ slug: d.slug }, { $set: { campaignId: campaign._id } });
      results.push({ slug: d.slug, campaignId: campaign._id.toString() });
    } else {
      results.push({ slug: d.slug, campaignId: d.campaignId.toString() });
    }
  }

  for (const d of subDocs) {
    if (!seen.has(d.slug)) {
      const stat = await AINsfwToolStats.findOne({ slug: d.slug }, { campaignId: 1 }).lean() as any;
      results.push({
        slug: d.slug,
        ...(stat?.campaignId ? { campaignId: stat.campaignId.toString() } : {}),
      });
    }
  }

  return results;
}

export interface AdminSubmission {
  _id: string;
  name: string;
  slug: string;
  category: string;
  vendor: string;
  description: string;
  image: string;
  websiteUrl: string;
  contactEmail: string;
  contactTelegram: string;
  status: string;
  submissionTier: string;
  paymentStatus: string;
  featured: boolean;
  featuredExpiresAt: string | null;
  boosted: boolean;
  boostExpiresAt: string | null;
  unlisted: boolean;
  views: number;
  clickCount: number;
  createdAt: string;
}

export async function getAdminSubmissions(): Promise<AdminSubmission[]> {
  await connectDB();
  const docs = await AINsfwSubmission.find({}).sort({ createdAt: -1 }).lean() as any[];
  return docs.map((d: any) => ({
    _id: d._id.toString(),
    name: d.name, slug: d.slug, category: d.category, vendor: d.vendor || '',
    description: d.description, image: d.image || '', websiteUrl: d.websiteUrl || '',
    contactEmail: d.contactEmail || '', contactTelegram: d.contactTelegram || '', status: d.status, submissionTier: d.submissionTier || 'basic',
    paymentStatus: d.paymentStatus || 'none', featured: !!d.featured,
    featuredExpiresAt: d.featuredExpiresAt ? new Date(d.featuredExpiresAt).toISOString() : null,
    boosted: !!d.boosted,
    boostExpiresAt: d.boostExpiresAt ? new Date(d.boostExpiresAt).toISOString() : null,
    unlisted: !!d.unlisted,
    views: d.views || 0, clickCount: d.clickCount || 0,
    createdAt: new Date(d.createdAt).toISOString(),
  }));
}

export async function adminUpdateSubmission(
  id: string,
  updates: { description?: string; status?: string; featured?: boolean; featuredDays?: number; unlisted?: boolean },
): Promise<AdminSubmission | null> {
  await connectDB();
  const set: Record<string, any> = {};
  if (updates.description !== undefined) set.description = updates.description;
  if (updates.status !== undefined) set.status = updates.status;
  if (updates.unlisted !== undefined) set.unlisted = updates.unlisted;
  if (updates.featured !== undefined) {
    set.featured = updates.featured;
    if (updates.featured && updates.featuredDays) {
      const exp = new Date();
      exp.setDate(exp.getDate() + updates.featuredDays);
      set.featuredExpiresAt = exp;
    } else if (!updates.featured) {
      set.featuredExpiresAt = null;
    }
  }
  const doc = await AINsfwSubmission.findByIdAndUpdate(id, { $set: set }, { new: true }).lean() as any;
  if (!doc) return null;
  return {
    _id: doc._id.toString(),
    name: doc.name, slug: doc.slug, category: doc.category, vendor: doc.vendor || '',
    description: doc.description, image: doc.image || '', websiteUrl: doc.websiteUrl || '',
    contactEmail: doc.contactEmail || '', contactTelegram: doc.contactTelegram || '', status: doc.status, submissionTier: doc.submissionTier || 'basic',
    paymentStatus: doc.paymentStatus || 'none', featured: !!doc.featured,
    featuredExpiresAt: doc.featuredExpiresAt ? new Date(doc.featuredExpiresAt).toISOString() : null,
    boosted: !!doc.boosted,
    boostExpiresAt: doc.boostExpiresAt ? new Date(doc.boostExpiresAt).toISOString() : null,
    unlisted: !!doc.unlisted,
    views: doc.views || 0, clickCount: doc.clickCount || 0,
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}

export async function getApprovedSubmissions(existingSlugs: Set<string>): Promise<AINsfwTool[]> {
  await connectDB();
  const docs = await AINsfwSubmission.find(
    { status: 'approved', paymentStatus: 'paid', unlisted: { $ne: true } },
    { slug: 1, name: 1, category: 1, vendor: 1, description: 1, image: 1, tags: 1, subscription: 1, payment: 1, tryNowUrl: 1, websiteUrl: 1, createdAt: 1 },
  ).lean() as any[];

  return docs
    .filter((d: any) => {
      const slug = d.slug || toolSlug(d.category, d.name);
      return !existingSlugs.has(slug);
    })
    .map((d: any) => ({
      slug: d.slug || toolSlug(d.category, d.name),
      name: d.name,
      category: d.category,
      vendor: d.vendor || d.name,
      description: d.description,
      image: d.image || '/assets/image.jpg',
      tags: d.tags || [],
      subscription: d.subscription || '',
      payment: d.payment || [],
      tryNowUrl: d.tryNowUrl || d.websiteUrl,
      sourceUrl: d.websiteUrl,
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : undefined,
    }));
}

export interface BlogTopAITool {
  slug: string;
  name: string;
  category: string;
  image: string;
  upvotes: number;
  score: number;
  featured: boolean;
}

/** Top AI NSFW tools for the blog hub — featured first, then highest score. */
export async function getTopAINsfwForBlog(limit = 5): Promise<BlogTopAITool[]> {
  try {
    const { AI_NSFW_TOOLS } = await import('@/app/ainsfw/data');
    const staticSlugs = new Set(AI_NSFW_TOOLS.map((t) => t.slug));
    const submissions = await getApprovedSubmissions(staticSlugs);
    const allTools = [...AI_NSFW_TOOLS, ...submissions];
    const stats = await getAllToolStats(allTools.map((t) => t.slug));

    return allTools
      .map((t) => {
        const s = stats[t.slug] || { upvotes: 0, downvotes: 0, featured: false };
        return {
          slug: t.slug,
          name: t.name,
          category: t.category,
          image: t.image && (t.image.startsWith('http') || t.image.startsWith('/')) ? t.image : '/assets/image.jpg',
          upvotes: s.upvotes || 0,
          score: (s.upvotes || 0) - (s.downvotes || 0),
          featured: !!s.featured,
        };
      })
      .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.score - a.score || b.upvotes - a.upvotes)
      .slice(0, limit);
  } catch (e) {
    console.error('[ainsfw] getTopAINsfwForBlog failed:', e);
    return [];
  }
}
