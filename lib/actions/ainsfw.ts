'use server';

import connectDB from '@/lib/db/mongodb';
import { AINsfwToolStats, Campaign, Advertiser, AINsfwSubmission } from '@/lib/models';
import type { AINsfwTool } from '@/app/ainsfw/types';

export interface ToolStatsData {
  upvotes: number;
  downvotes: number;
  featured: boolean;
  campaignId?: string;
  reviews: { text: string; rating: number; createdAt: string }[];
}

export async function getToolStats(slug: string): Promise<ToolStatsData> {
  await connectDB();
  const doc = await AINsfwToolStats.findOne({ slug }).lean() as any;
  if (!doc) return { upvotes: 0, downvotes: 0, featured: false, reviews: [] };
  return {
    upvotes: doc.upvotes || 0,
    downvotes: doc.downvotes || 0,
    featured: !!doc.featured,
    campaignId: doc.campaignId?.toString() || undefined,
    reviews: (doc.reviews || []).map((r: any) => ({
      text: r.text,
      rating: r.rating,
      createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '',
    })),
  };
}

export async function getAllToolStats(slugs: string[]): Promise<Record<string, ToolStatsData>> {
  await connectDB();
  const docs = await AINsfwToolStats.find({ slug: { $in: slugs } }).lean() as any[];
  const map: Record<string, ToolStatsData> = {};
  for (const doc of docs) {
    map[doc.slug] = {
      upvotes: doc.upvotes || 0,
      downvotes: doc.downvotes || 0,
      featured: !!doc.featured,
      campaignId: doc.campaignId?.toString() || undefined,
      reviews: (doc.reviews || []).map((r: any) => ({
        text: r.text,
        rating: r.rating,
        createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '',
      })),
    };
  }
  return map;
}

export async function voteOnTool(slug: string, direction: 'up' | 'down'): Promise<{ upvotes: number; downvotes: number }> {
  await connectDB();
  const field = direction === 'up' ? 'upvotes' : 'downvotes';
  const doc = await AINsfwToolStats.findOneAndUpdate(
    { slug },
    { $inc: { [field]: 1 } },
    { upsert: true, new: true },
  ).lean() as any;
  return { upvotes: doc.upvotes || 0, downvotes: doc.downvotes || 0 };
}

export async function unvoteOnTool(slug: string, direction: 'up' | 'down'): Promise<{ upvotes: number; downvotes: number }> {
  await connectDB();
  const field = direction === 'up' ? 'upvotes' : 'downvotes';
  const doc = await AINsfwToolStats.findOneAndUpdate(
    { slug },
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
  const doc = await AINsfwToolStats.findOne({ slug });
  if (!doc) return { upvotes: 0, downvotes: 0, featured: false, reviews: [] };
  if (doc.reviews && reviewIdx >= 0 && reviewIdx < doc.reviews.length) {
    doc.reviews.splice(reviewIdx, 1);
    await doc.save();
  }
  const plain = doc.toObject();
  return {
    upvotes: plain.upvotes || 0,
    downvotes: plain.downvotes || 0,
    featured: !!plain.featured,
    reviews: (plain.reviews || []).map((r: any) => ({
      text: r.text,
      rating: r.rating,
      createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '',
    })),
  };
}

export async function submitReview(slug: string, text: string, rating: number): Promise<ToolStatsData> {
  if (!text.trim() || rating < 1 || rating > 5) throw new Error('Invalid review');
  await connectDB();
  const doc = await AINsfwToolStats.findOneAndUpdate(
    { slug },
    {
      $push: {
        reviews: {
          $each: [{ text: text.trim().slice(0, 1000), rating, createdAt: new Date() }],
          $position: 0,
          $slice: 100,
        },
      },
    },
    { upsert: true, new: true },
  ).lean() as any;
  return {
    upvotes: doc.upvotes || 0,
    downvotes: doc.downvotes || 0,
    featured: !!doc.featured,
    reviews: (doc.reviews || []).map((r: any) => ({
      text: r.text,
      rating: r.rating,
      createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '',
    })),
  };
}

async function getOrCreateNsfwAdvertiser() {
  let adv = await Advertiser.findOne({ name: 'AI NSFW Featured' }).lean() as any;
  if (!adv) {
    adv = await Advertiser.create({ name: 'AI NSFW Featured', email: 'internal@erogram.pro', company: 'Internal', status: 'active' });
  }
  return adv._id;
}

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

export async function getFeaturedSlugs(): Promise<string[]> {
  await connectDB();
  const docs = await AINsfwToolStats.find({ featured: true }, { slug: 1 }).lean() as any[];
  return docs.map((d: any) => d.slug);
}

export async function getFeaturedTools(): Promise<FeaturedToolInfo[]> {
  await connectDB();
  const docs = await AINsfwToolStats.find({ featured: true }, { slug: 1, campaignId: 1 }).lean() as any[];
  const results: FeaturedToolInfo[] = [];
  for (const d of docs) {
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
    contactEmail: d.contactEmail || '', status: d.status, submissionTier: d.submissionTier || 'basic',
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
    contactEmail: doc.contactEmail || '', status: doc.status, submissionTier: doc.submissionTier || 'basic',
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
    { slug: 1, name: 1, category: 1, vendor: 1, description: 1, image: 1, tags: 1, subscription: 1, payment: 1, tryNowUrl: 1, websiteUrl: 1 },
  ).lean() as any[];

  return docs
    .filter((d: any) => !existingSlugs.has(d.slug))
    .map((d: any) => ({
      slug: d.slug,
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
    }));
}
