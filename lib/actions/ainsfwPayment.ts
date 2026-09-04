'use server';

import connectDB from '@/lib/db/mongodb';
import { AINsfwSubmission, User } from '@/lib/models';
import { validateCoupon, recordCouponUsage } from '@/lib/actions/coupons';
import jwt from 'jsonwebtoken';
import { AINSFW_PLAN_PRICES, type AINSFWPlan } from '@/lib/ainsfw/planPrices';
import { toolSlug } from '@/app/ainsfw/data';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const API_KEY = process.env.NOWPAYMENTS_API_KEY || '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogramx.com';
const NP_BASE = 'https://api.nowpayments.io/v1';

const PLAN_DESCRIPTIONS: Record<AINSFWPlan, string> = {
  basic: 'Basic AI NSFW Listing — Get Seen — $49',
  boost: 'Boost AI NSFW Listing — Get More Visibility — $147',
  startup: 'Startup AI NSFW Listing — Own Your Category — $297',
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
}

type AuthResult =
  | { ok: true; userId: string; username: string }
  | { ok: false; error: string };

async function requireUser(token?: string): Promise<AuthResult> {
  if (!token) return { ok: false, error: 'You must be logged in to submit a listing.' };
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    if (!decoded?.id) return { ok: false, error: 'You must be logged in to submit a listing.' };
    await connectDB();
    const u = await User.findById(decoded.id).select('username').lean() as { username?: string } | null;
    return { ok: true, userId: decoded.id, username: u?.username || '' };
  } catch {
    return { ok: false, error: 'Your session expired. Please log in again.' };
  }
}

function validateForm(formData: AINSFWFormData): string | null {
  if (!formData.email?.trim() && !formData.contactTelegram?.trim()) {
    return 'Please provide an email or Telegram contact.';
  }
  const desc = formData.description?.trim() || '';
  if (!desc) return 'Description is required.';
  const descWords = desc.split(/\s+/).filter(Boolean).length;
  if (descWords > 1000) return 'Description cannot exceed 1000 words.';
  if (!formData.toolName?.trim()) return 'Tool name is required.';
  if (!formData.websiteUrl?.trim()?.startsWith('http')) return 'Enter a valid URL starting with https://';
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

  return { slug: submission.slug, name: submission.name };
}

/** Save listing draft before checkout — kept even if payment never completes. */
export async function saveAINSFWListingDraft(
  plan: AINSFWPlan,
  formData: AINSFWFormData,
  token?: string,
  existingSubmissionId?: string,
): Promise<{ success: boolean; submissionId?: string; slug?: string; error?: string }> {
  const auth = await requireUser(token);
  if (!auth.ok) return { success: false, error: auth.error };

  const validationError = validateForm(formData);
  if (validationError) return { success: false, error: validationError };

  await connectDB();

  const slug = toolSlug(formData.category, formData.toolName);
  const tags = buildTags(formData);
  const payload = {
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
    websiteUrl: formData.websiteUrl.trim(),
    tags,
    subscription: formData.subscription,
    payment: formData.paymentMethods,
    tryNowUrl: formData.websiteUrl.trim(),
    contactEmail: formData.email.trim(),
    contactTelegram: (formData.contactTelegram || '').trim(),
    createdBy: auth.userId,
    createdByUsername: auth.username,
    status: 'pending',
    submissionTier: plan,
    paymentStatus: 'pending',
    featured: false,
    featuredExpiresAt: null,
    boosted: false,
    boostExpiresAt: null,
    unlisted: true,
  };

  if (existingSubmissionId) {
    const owned = await AINsfwSubmission.findOne({
      _id: existingSubmissionId,
      createdBy: auth.userId,
      paymentStatus: 'pending',
    }).lean();
    if (!owned) return { success: false, error: 'Draft not found.' };

    const slugTaken = await AINsfwSubmission.findOne({
      slug,
      _id: { $ne: existingSubmissionId },
      paymentStatus: 'paid',
    }).lean();
    if (slugTaken) return { success: false, error: 'A tool with this name already exists in that category.' };

    await AINsfwSubmission.updateOne({ _id: existingSubmissionId }, { $set: payload });
    return { success: true, submissionId: existingSubmissionId, slug };
  }

  const existing = await AINsfwSubmission.findOne({ slug }).lean() as { _id?: { toString(): string }; createdBy?: unknown; paymentStatus?: string } | null;
  if (existing) {
    if (existing.paymentStatus === 'paid') {
      return { success: false, error: 'A tool with this name already exists in that category.' };
    }
    if (String(existing.createdBy) !== auth.userId) {
      return { success: false, error: 'A tool with this name already exists in that category.' };
    }
    await AINsfwSubmission.updateOne({ _id: existing._id }, { $set: payload });
    return { success: true, submissionId: existing._id!.toString(), slug };
  }

  const submission = await AINsfwSubmission.create(payload);
  return { success: true, submissionId: submission._id.toString(), slug };
}

/** Start NowPayments checkout for a saved draft. */
export async function checkoutAINSFWListing(
  submissionId: string,
  plan: AINSFWPlan,
  couponCode?: string,
  token?: string,
): Promise<{ success: boolean; invoiceUrl?: string; slug?: string; error?: string; freeApproval?: boolean }> {
  if (!API_KEY) return { success: false, error: 'Crypto payments are not configured.' };

  const auth = await requireUser(token);
  if (!auth.ok) return { success: false, error: auth.error };

  await connectDB();
  const submission = await AINsfwSubmission.findOne({
    _id: submissionId,
    createdBy: auth.userId,
    paymentStatus: 'pending',
  }).lean() as {
    _id: { toString(): string };
    slug: string;
    name: string;
    websiteUrl: string;
    contactEmail?: string;
    submissionTier?: string;
  } | null;

  if (!submission) return { success: false, error: 'Listing draft not found.' };

  const orderId = `sub__ainsfw__${submission._id}__${plan}__${Date.now()}`;
  let finalPrice = AINSFW_PLAN_PRICES[plan];
  let couponValidation: Awaited<ReturnType<typeof validateCoupon>> | null = null;

  if (couponCode) {
    const starsEquiv = Math.round(AINSFW_PLAN_PRICES[plan] / 0.013);
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
      { status: isFeaturedPlan(plan) ? 'approved' : 'pending' },
    );
    await recordCouponUsage(couponValidation.couponId, {
      service: 'ainsfw',
      entityId: submission._id.toString(),
      originalStars: Math.round(AINSFW_PLAN_PRICES[plan] / 0.013),
      discountedStars: 0,
      savedStars: Math.round(AINSFW_PLAN_PRICES[plan] / 0.013),
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
        order_description: `${PLAN_DESCRIPTIONS[plan]} — ${submission.name} (${submission.websiteUrl})`,
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
