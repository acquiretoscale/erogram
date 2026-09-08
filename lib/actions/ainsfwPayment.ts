'use server';

import connectDB from '@/lib/db/mongodb';
import { AINsfwSubmission, AINsfwToolStats, User } from '@/lib/models';
import { validateCoupon, recordCouponUsage } from '@/lib/actions/coupons';
import jwt from 'jsonwebtoken';
import {
  AINSFW_PLAN_PRICES,
  ainsfwStarsAmount,
  isAINSFWPlan,
  type AINSFWPlan,
} from '@/lib/ainsfw/planPrices';
import { toolSlug } from '@/app/ainsfw/data';
import { normalizeWebsiteUrl } from '@/lib/ainsfw/websiteUrl';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const API_KEY = process.env.NOWPAYMENTS_API_KEY || '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogramx.com';
const NP_BASE = 'https://api.nowpayments.io/v1';

const BOT_TOKEN = process.env.TELEGRAM_PAYMENT_BOT_TOKEN || '';

const PLAN_DESCRIPTIONS: Record<AINSFWPlan, string> = {
  basic: 'Basic AI NSFW Listing — $49',
  boost: 'Boosted AI NSFW Listing — $197',
  startup: 'Startup AI NSFW Listing — Own Your Category — $297',
  free: 'Free / Affiliate AI NSFW Listing',
};

export interface AINSFWFormData {
  toolName: string;
  websiteUrl: string;
  email: string;
  contactTelegram?: string;
  description: string;
  logoUrl: string;
  category: string;
  extraCategories?: string[];
  vendor: string;
  tags: string;
  subscription: string;
  paymentMethods: string[];
  screenshots?: string[];
  videoUrl?: string;
}

type PendingDraft = {
  _id: { toString(): string };
  slug: string;
  name: string;
  websiteUrl: string;
  contactEmail?: string;
  contactTelegram?: string;
  submissionTier?: string;
  createdBy?: unknown;
};

async function loadAccessiblePendingDraft(
  submissionId: string,
  userId?: string,
): Promise<PendingDraft | null> {
  const doc = await AINsfwSubmission.findOne({
    _id: submissionId,
    paymentStatus: 'pending',
  }).lean() as PendingDraft | null;
  if (!doc) return null;
  const owner = doc.createdBy ? String(doc.createdBy) : '';
  if (!owner) return doc;
  if (userId && owner === userId) return doc;
  return null;
}

async function optionalUser(token?: string): Promise<{ userId?: string; username?: string }> {
  if (!token) return {};
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    if (!decoded?.id) return {};
    await connectDB();
    const u = await User.findById(decoded.id).select('username').lean() as { username?: string } | null;
    return { userId: decoded.id, username: u?.username || '' };
  } catch {
    return {};
  }
}

function validateForm(formData: AINSFWFormData, requireContact = true): string | null {
  if (requireContact) {
    const email = formData.email?.trim() || '';
    if (!email || !email.includes('@')) return 'Please provide a contact email.';
  }
  const desc = formData.description?.trim() || '';
  if (!desc) return 'Description is required.';
  const descWords = desc.split(/\s+/).filter(Boolean).length;
  if (descWords > 1000) return 'Description cannot exceed 1000 words.';
  if (!formData.toolName?.trim()) return 'Tool name is required.';
  if (!normalizeWebsiteUrl(formData.websiteUrl || '')) return 'Enter your website: www.name.com or name.com or https://name.com';
  if (!formData.logoUrl?.trim()) return 'Please upload a logo / image for your tool.';
  return null;
}

function buildTags(formData: AINSFWFormData): string[] {
  return formData.tags
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function isFeaturedPlan(plan: AINSFWPlan): boolean {
  return plan === 'boost' || plan === 'startup';
}

function paidAinsfwPlans(): AINSFWPlan[] {
  return ['basic', 'boost', 'startup'];
}

/** Activate a paid AI NSFW submission after crypto confirms (webhook) or free coupon. */
export async function fulfillAINSFWListingPayment(
  submissionId: string,
  plan: AINSFWPlan,
  paymentId: string,
  options?: { status?: 'approved' | 'pending' },
): Promise<{ slug: string; name: string } | null> {
  await connectDB();
  const submission = await AINsfwSubmission.findById(submissionId).lean() as {
    slug: string;
    name: string;
    paymentStatus?: string;
    paymentId?: string | null;
    screenshots?: string[];
    videoUrl?: string;
  } | null;
  if (!submission) return null;

  if (submission.paymentStatus === 'paid') {
    return { slug: submission.slug, name: submission.name };
  }

  const featured = isFeaturedPlan(plan);
  const now = new Date();
  const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const status = options?.status ?? 'approved';

  await AINsfwSubmission.updateOne(
    { _id: submissionId },
    {
      $set: {
        paymentStatus: 'paid',
        status,
        unlisted: false,
        featured,
        featuredExpiresAt: featured ? oneMonthLater : null,
        boosted: featured,
        boostExpiresAt: featured ? oneMonthLater : null,
        submissionTier: plan,
        paymentId: String(paymentId),
      },
    },
  );

  if (featured) {
    const { adminSetFeatured } = await import('@/lib/actions/ainsfw');
    await adminSetFeatured(submission.slug, true);
  }

  const shots = (submission.screenshots || []).filter(Boolean).slice(0, 4);
  const videoUrl = (submission.videoUrl || '').trim();
  const statsSet: Record<string, unknown> = {};
  if (shots.length) {
    statsSet.customGallery = shots;
    statsSet.galleryManaged = true;
  }
  if (videoUrl) statsSet.previewVideoUrl = videoUrl;
  if (Object.keys(statsSet).length) {
    await AINsfwToolStats.findOneAndUpdate(
      { slug: submission.slug },
      { $set: statsSet },
      { upsert: true },
    );
  }

  return { slug: submission.slug, name: submission.name };
}

/** Save listing draft before checkout — kept even if payment never completes. */
export async function saveAINSFWListingDraft(
  plan: AINSFWPlan,
  formData: AINSFWFormData,
  token?: string,
  existingSubmissionId?: string,
  options?: { requireContact?: boolean },
): Promise<{ success: boolean; submissionId?: string; slug?: string; error?: string }> {
  const auth = await optionalUser(token);

  const validationError = validateForm(formData, options?.requireContact !== false);
  if (validationError) return { success: false, error: validationError };

  await connectDB();

  const slug = toolSlug(formData.category, formData.toolName);
  const tags = buildTags(formData);
  const websiteUrl = normalizeWebsiteUrl(formData.websiteUrl);
  const payload: Record<string, unknown> = {
    name: formData.toolName.trim(),
    slug,
    category: formData.category,
    categories:
      formData.extraCategories && formData.extraCategories.length > 0
        ? formData.extraCategories
        : [formData.category],
    vendor: formData.vendor.trim() || formData.toolName.trim(),
    description: formData.description.trim(),
    image: formData.logoUrl.trim() || '/assets/image.jpg',
    websiteUrl,
    tags,
    subscription: formData.subscription,
    payment: formData.paymentMethods,
    tryNowUrl: websiteUrl,
    contactEmail: formData.email.trim(),
    contactTelegram: (formData.contactTelegram || '').trim(),
    status: 'pending',
    submissionTier: plan,
    paymentStatus: 'pending',
    featured: false,
    featuredExpiresAt: null,
    boosted: false,
    boostExpiresAt: null,
    unlisted: true,
    screenshots: (formData.screenshots || []).filter(Boolean).slice(0, 4),
    videoUrl: (formData.videoUrl || '').trim(),
  };
  if (auth.userId) {
    payload.createdBy = auth.userId;
    payload.createdByUsername = auth.username || '';
  }

  if (existingSubmissionId) {
    const owned = await loadAccessiblePendingDraft(existingSubmissionId, auth.userId);
    if (!owned) return { success: false, error: 'Draft not found.' };

    const slugTaken = await AINsfwSubmission.findOne({
      slug,
      _id: { $ne: existingSubmissionId },
      paymentStatus: 'paid',
    }).lean();
    if (slugTaken) return { success: false, error: 'A tool with this name already exists in that category.' };

    const updatePayload = { ...payload };
    delete updatePayload.createdBy;
    delete updatePayload.createdByUsername;
    await AINsfwSubmission.updateOne({ _id: existingSubmissionId }, { $set: updatePayload });
    return { success: true, submissionId: existingSubmissionId, slug };
  }

  const existing = await AINsfwSubmission.findOne({ slug }).lean() as { _id?: { toString(): string }; createdBy?: unknown; paymentStatus?: string } | null;
  if (existing) {
    if (existing.paymentStatus === 'paid') {
      return { success: false, error: 'A tool with this name already exists in that category.' };
    }
    const owner = existing.createdBy ? String(existing.createdBy) : '';
    if (!auth.userId || !owner || owner !== auth.userId) {
      return { success: false, error: 'A tool with this name already exists in that category.' };
    }
    const updatePayload = { ...payload };
    delete updatePayload.createdBy;
    delete updatePayload.createdByUsername;
    await AINsfwSubmission.updateOne({ _id: existing._id }, { $set: updatePayload });
    return { success: true, submissionId: existing._id!.toString(), slug };
  }

  const submission = await AINsfwSubmission.create(payload);
  return { success: true, submissionId: submission._id.toString(), slug };
}

export type AINSFWListingDraft = {
  submissionId: string;
  slug: string;
  plan: AINSFWPlan;
  toolName: string;
  websiteUrl: string;
  email: string;
  contactTelegram: string;
  description: string;
  logoUrl: string;
  category: string;
  categories: string[];
  subscription: string;
  paymentMethods: string[];
  screenshots: string[];
  videoUrl: string;
};

/** Load a pending draft (guest URL or owned by the logged-in user). */
export async function getAINSFWListingDraft(
  submissionId: string,
  token?: string,
): Promise<{ success: boolean; draft?: AINSFWListingDraft; error?: string }> {
  const auth = await optionalUser(token);

  await connectDB();
  const doc = await loadAccessiblePendingDraft(submissionId, auth.userId) as (PendingDraft & {
    description: string;
    image: string;
    category: string;
    categories?: string[];
    subscription: string;
    payment?: string[];
    screenshots?: string[];
    videoUrl?: string;
  }) | null;

  if (!doc) return { success: false, error: 'Listing draft not found.' };

  const plan = doc.submissionTier;
  if (!plan || !isAINSFWPlan(plan)) {
    return { success: false, error: 'Listing plan not found on draft.' };
  }

  return {
    success: true,
    draft: {
      submissionId: doc._id.toString(),
      slug: doc.slug,
      plan: plan as AINSFWPlan,
      toolName: doc.name,
      websiteUrl: doc.websiteUrl,
      email: doc.contactEmail?.trim() || '',
      contactTelegram: doc.contactTelegram?.trim() || '',
      description: doc.description,
      logoUrl: doc.image,
      category: doc.category,
      categories: doc.categories?.length ? doc.categories : [doc.category],
      subscription: doc.subscription,
      paymentMethods: Array.isArray(doc.payment) ? doc.payment : [],
      screenshots: Array.isArray(doc.screenshots) ? doc.screenshots.filter(Boolean).slice(0, 4) : [],
      videoUrl: typeof doc.videoUrl === 'string' ? doc.videoUrl.trim() : '',
    },
  };
}

/** Free / affiliate listing. Goes to manual review. */
export async function submitFreeAINSFWListing(
  submissionId: string,
  token?: string,
): Promise<{ success: boolean; slug?: string; error?: string }> {
  const auth = await optionalUser(token);

  await connectDB();
  const submission = await loadAccessiblePendingDraft(submissionId, auth.userId);
  if (!submission) return { success: false, error: 'Listing draft not found.' };

  if (!submission.contactEmail?.trim() || !submission.contactEmail.includes('@')) {
    return { success: false, error: 'Please provide a contact email before checkout.' };
  }

  await AINsfwSubmission.updateOne(
    { _id: submission._id },
    {
      $set: {
        submissionTier: 'free',
        paymentStatus: 'none',
        status: 'pending',
        unlisted: true,
        featured: false,
        featuredExpiresAt: null,
        boosted: false,
        boostExpiresAt: null,
      },
    },
  );

  return { success: true, slug: submission.slug };
}

/** Start NowPayments checkout for a saved draft. User picks currency on NowPayments. */
export async function checkoutAINSFWListing(
  submissionId: string,
  plan: AINSFWPlan,
  couponCode?: string,
  token?: string,
): Promise<{ success: boolean; invoiceUrl?: string; slug?: string; error?: string; freeApproval?: boolean }> {
  if (plan === 'free') {
    const free = await submitFreeAINSFWListing(submissionId, token);
    if (!free.success) return { success: false, error: free.error };
    return { success: true, slug: free.slug, freeApproval: true };
  }
  if (!paidAinsfwPlans().includes(plan)) {
    return { success: false, error: 'Invalid plan.' };
  }
  if (!API_KEY) return { success: false, error: 'Crypto payments are not configured.' };

  const auth = await optionalUser(token);

  await connectDB();
  const submission = await loadAccessiblePendingDraft(submissionId, auth.userId);
  if (!submission) return { success: false, error: 'Listing draft not found.' };

  if (!submission.contactEmail?.trim() || !submission.contactEmail.includes('@')) {
    return { success: false, error: 'Please provide a contact email before checkout.' };
  }

  const orderId = `sub__ainsfw__${submission._id}__${plan}__${Date.now()}`;
  let finalPrice = AINSFW_PLAN_PRICES[plan];
  let couponValidation: Awaited<ReturnType<typeof validateCoupon>> | null = null;

  if (couponCode) {
    const starsEquiv = ainsfwStarsAmount(plan);
    couponValidation = await validateCoupon(couponCode, 'ainsfw', starsEquiv);
    if (!couponValidation.valid) {
      return { success: false, error: couponValidation.error };
    }
    finalPrice = Math.round((couponValidation.discountedStars ?? starsEquiv) * 0.013 * 100) / 100;
  }

  if (finalPrice <= 0 && couponValidation) {
    await fulfillAINSFWListingPayment(
      submission._id.toString(),
      plan,
      `coupon__${couponCode}__${Date.now()}`,
      { status: 'approved' },
    );
    await recordCouponUsage(couponValidation.couponId, {
      service: 'ainsfw',
      entityId: submission._id.toString(),
      originalStars: ainsfwStarsAmount(plan),
      discountedStars: 0,
      savedStars: ainsfwStarsAmount(plan),
      couponCode: couponCode!,
    });
    return { success: true, slug: submission.slug, freeApproval: true };
  }

  try {
    const res = await fetch(`${NP_BASE}/invoice`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: finalPrice,
        price_currency: 'usd',
        order_id: orderId,
        order_description: `${PLAN_DESCRIPTIONS[plan]} - ${submission.name} (${submission.websiteUrl})`,
        ipn_callback_url: `${SITE_URL}/api/payments/nowpayments/webhook`,
        success_url: `${SITE_URL}/add/ainsfw/thank-you?plan=${plan}&slug=${submission.slug}`,
        cancel_url: `${SITE_URL}/add/ainsfw`,
        customer_email: submission.contactEmail?.trim() || undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.invoice_url) {
      console.error('NowPayments AI NSFW invoice error:', data);
      return { success: false, error: data?.message || 'Failed to create payment.' };
    }

    await AINsfwSubmission.updateOne(
      { _id: submission._id },
      { $set: { paymentId: orderId, submissionTier: plan } },
    );

    return { success: true, invoiceUrl: data.invoice_url, slug: submission.slug };
  } catch (err) {
    console.error('NowPayments AI NSFW payment error:', err);
    return { success: false, error: 'Payment service unavailable. Please try again.' };
  }
}

/** Telegram Stars / card checkout for a saved draft (full list price). */
export async function checkoutAINSFWListingStars(
  submissionId: string,
  plan: AINSFWPlan,
  token?: string,
): Promise<{ success: boolean; invoiceUrl?: string; slug?: string; error?: string }> {
  if (!paidAinsfwPlans().includes(plan)) {
    return { success: false, error: 'Invalid plan.' };
  }
  if (!BOT_TOKEN) return { success: false, error: 'Telegram Stars payments are not configured.' };

  const auth = await optionalUser(token);

  await connectDB();
  const submission = await loadAccessiblePendingDraft(submissionId, auth.userId);
  if (!submission) return { success: false, error: 'Listing draft not found.' };

  if (!submission.contactEmail?.trim() || !submission.contactEmail.includes('@')) {
    return { success: false, error: 'Please provide a contact email before checkout.' };
  }

  const stars = ainsfwStarsAmount(plan);
  const title = PLAN_DESCRIPTIONS[plan];

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: `${submission.name} listing`,
        payload: JSON.stringify({
          ainsfwSubmissionId: submission._id.toString(),
          plan,
        }),
        provider_token: '',
        currency: 'XTR',
        prices: [{ label: title, amount: stars }],
      }),
    });
    const data = await res.json();
    if (!data.ok || !data.result) {
      console.error('Telegram AI NSFW Stars invoice error:', data);
      return { success: false, error: 'Failed to create Telegram Stars payment.' };
    }

    await AINsfwSubmission.updateOne(
      { _id: submission._id },
      { $set: { submissionTier: plan } },
    );

    return { success: true, invoiceUrl: data.result, slug: submission.slug };
  } catch (err) {
    console.error('Telegram AI NSFW Stars payment error:', err);
    return { success: false, error: 'Payment service unavailable. Please try again.' };
  }
}

/** @deprecated Use saveAINSFWListingDraft + checkoutAINSFWListing */
export async function createAINSFWSubmission(
  plan: AINSFWPlan,
  formData: AINSFWFormData,
  couponCode?: string,
  token?: string,
) {
  const draft = await saveAINSFWListingDraft(plan, formData, token);
  if (!draft.success || !draft.submissionId) {
    return { success: false, error: draft.error };
  }
  return checkoutAINSFWListing(draft.submissionId, plan, couponCode, token);
}
