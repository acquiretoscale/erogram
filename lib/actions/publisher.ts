'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { AINsfwSubmission, AINsfwToolStats, ExploreSiteOverride, User } from '@/lib/models';
import { isPublisherToken } from '@/lib/auth/publisherAccess';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function isAdminToken(token: string) {
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    if (!decoded.id) return false;
    await connectDB();
    const user = await User.findById(decoded.id).select('isAdmin').lean() as { isAdmin?: boolean } | null;
    return !!user?.isAdmin;
  } catch {
    return false;
  }
}
import { toolSlug } from '@/app/ainsfw/data';
import { AINSFW_CATEGORIES } from '@/app/ainsfw/types';
import { EXPLORE_CATEGORIES } from '@/lib/explore/topPornSitesData';
import { slugifyExploreSiteKey } from '@/lib/explore/exploreCustomSites';
import { getExploreSiteListing } from '@/lib/explore/exploreSiteListings';
import { revalidatePath } from 'next/cache';

function requirePublisher(token: string) {
  if (!isPublisherToken(token)) throw new Error('Unauthorized');
}

export async function getPublisherListingChoices() {
  return {
    ainsfw: AINSFW_CATEGORIES.filter((c) => c !== 'All'),
    porn: EXPLORE_CATEGORIES.map((c) => ({ slug: c.slug, title: c.title })),
  };
}

export async function submitPublisherDraft(
  token: string,
  input: {
    section: 'ainsfw' | 'porn';
    name: string;
    url: string;
    category: string;
    categories?: string[];
    description?: string;
    ctaText?: string;
    featuredDuration?: 'off' | '7' | '14' | '30' | 'lifetime';
    reviewIntro?: string;
    reviewBlocks?: { title: string; body: string }[];
  },
) {
  requirePublisher(token);
  const name = input.name.trim();
  const url = input.url.trim();
  const description = (input.description || '').trim() || name;
  if (!name || !url.startsWith('http')) throw new Error('Name and a full link are required');

  await connectDB();

  if (input.section === 'ainsfw') {
    const allowed = new Set<string>(AINSFW_CATEGORIES.filter((c) => c !== 'All'));
    const categories = [...new Set((input.categories?.length ? input.categories : [input.category]).map((c) => c.trim()).filter((c) => allowed.has(c)))].slice(0, 6);
    if (!categories.length) throw new Error('Pick a category');
    const primary = categories[0];
    let slug = toolSlug(primary, name);
    let n = 2;
    while (await AINsfwSubmission.findOne({ slug }).select('_id').lean()) {
      slug = `${toolSlug(primary, name)}-${n}`;
      n += 1;
    }
    const duration = input.featuredDuration || 'off';
    const days = duration === '7' || duration === '14' || duration === '30' ? Number(duration) : 0;
    const featured = duration !== 'off';
    const featuredExpiresAt = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
    await AINsfwSubmission.create({
      name,
      slug,
      category: primary,
      categories,
      vendor: name,
      description,
      image: '/assets/image.jpg',
      websiteUrl: url,
      tryNowUrl: url,
      status: 'pending',
      unlisted: true,
      awaitingAdminReview: true,
      paymentStatus: 'none',
      submissionTier: 'basic',
      featured,
      boosted: featured,
      featuredDuration: featured ? duration : '',
      featuredExpiresAt: featured ? featuredExpiresAt : null,
      boostExpiresAt: featured ? featuredExpiresAt : null,
    });
    const intro = (input.reviewIntro || '').trim();
    const blocks = (input.reviewBlocks || [])
      .map((b) => ({ title: (b.title || '').trim(), body: (b.body || '').trim() }))
      .filter((b) => b.title && b.body)
      .slice(0, 6);
    await AINsfwToolStats.findOneAndUpdate(
      { slug },
      {
        $set: {
          ctaText: (input.ctaText || '').trim().slice(0, 80),
          categoriesOverride: categories,
          tryNowUrlOverride: url,
          descriptionOverride: description,
          ...(intro || blocks.length ? { editorialReview: { shortDescription: intro, featureHighlights: blocks } } : {}),
        },
      },
      { upsert: true },
    );
    revalidatePath('/admin/ainsfw');
    return { ok: true as const, where: 'AI NSFW', slug };
  }

  const porn = EXPLORE_CATEGORIES.find((c) => c.slug === input.category);
  if (!porn) throw new Error('Pick a category');

  let siteKey = slugifyExploreSiteKey(name);
  if (!siteKey) throw new Error('Invalid name');
  let suffix = 0;
  while (
    getExploreSiteListing(siteKey) ||
    (await ExploreSiteOverride.findOne({ siteKey }).select('_id').lean())
  ) {
    suffix += 1;
    siteKey = `${slugifyExploreSiteKey(name)}-${suffix}`;
  }

  await ExploreSiteOverride.create({
    categorySlug: porn.slug,
    siteKey,
    name,
    externalUrl: url,
    description,
    isCustom: true,
    hidden: true,
  });
  revalidatePath('/best-porn');
  return { ok: true as const, where: 'Porn websites', slug: siteKey };
}

export async function listAinsfwDrafts(token: string) {
  if (!isPublisherToken(token) && !(await isAdminToken(token))) return [];
  await connectDB();
  const rows = await AINsfwSubmission.find({
    status: 'pending',
    unlisted: true,
    awaitingAdminReview: true,
    paymentStatus: 'none',
  }).select('name slug category').sort({ createdAt: -1 }).lean();
  return rows.map((row) => ({
    id: String(row._id),
    name: String(row.name),
    slug: String(row.slug),
    category: String(row.category || ''),
  }));
}

export async function approveAinsfwDraft(token: string, id: string) {
  if (!(await isAdminToken(token))) throw new Error('Unauthorized');
  await connectDB();
  const doc = await AINsfwSubmission.findByIdAndUpdate(
    id,
    {
      $set: {
        status: 'approved',
        unlisted: false,
        awaitingAdminReview: false,
        paymentStatus: 'paid',
        paidAt: new Date(),
      },
    },
    { new: true },
  ).lean() as { slug?: string; featured?: boolean; featuredDuration?: string; featuredExpiresAt?: Date | null } | null;
  if (!doc?.slug) throw new Error('Draft not found');
  if (doc.featured) {
    const { adminSetFeatured } = await import('@/lib/actions/ainsfw');
    await adminSetFeatured(doc.slug, true);
    await AINsfwToolStats.updateOne(
      { slug: doc.slug },
      {
        $set: {
          featured: true,
          featuredDuration: doc.featuredDuration || 'lifetime',
          featuredExpiresAt: doc.featuredExpiresAt || null,
        },
      },
    );
  }
  const { revalidateAinsfwPublic } = await import('@/lib/actions/ainsfw');
  await revalidateAinsfwPublic(doc.slug);
  return { ok: true as const };
}
