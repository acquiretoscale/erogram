'use server';

import connectDB from '@/lib/db/mongodb';
import { AINsfwSubmission, User } from '@/lib/models';
import { validateCoupon, recordCouponUsage } from '@/lib/actions/coupons';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

export type AINSFWPlan = 'basic' | 'boost';

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

const PLAN_PRICES: Record<AINSFWPlan, number> = {
  basic: 49,
  boost: 197,
};

const PLAN_DESCRIPTIONS: Record<AINSFWPlan, string> = {
  basic: 'Basic AI NSFW Listing — $49',
  boost: 'BOOST — Instant Approval + 1 Month Featured AI NSFW — $197',
};

const API_KEY = process.env.NOWPAYMENTS_API_KEY || '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';
const NP_BASE = 'https://api.nowpayments.io/v1';

import { toolSlug } from '@/app/ainsfw/data';

export async function createAINSFWSubmission(
  plan: AINSFWPlan,
  formData: AINSFWFormData,
  couponCode?: string,
  token?: string,
): Promise<{ success: boolean; invoiceUrl?: string; slug?: string; error?: string; freeApproval?: boolean }> {
  if (!API_KEY) {
    return { success: false, error: 'Crypto payments are not configured.' };
  }

  // Require login
  let userId: string | null = null;
  let username = '';
  try {
    if (!token) return { success: false, error: 'You must be logged in to submit a listing.' };
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    userId = decoded?.id || null;
    if (!userId) return { success: false, error: 'You must be logged in to submit a listing.' };
  } catch {
    return { success: false, error: 'Your session expired. Please log in again.' };
  }

  // Require at least one contact method
  if (!formData.email?.trim() && !formData.contactTelegram?.trim()) {
    return { success: false, error: 'Please provide an email or Telegram contact.' };
  }

  const slug = toolSlug(formData.category, formData.toolName);
  const tags = formData.tags
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  await connectDB();

  const existing = await AINsfwSubmission.findOne({ slug }).lean();
  if (existing) {
    return { success: false, error: 'A tool with this name already exists in that category.' };
  }

  try {
    const u = await User.findById(userId).select('username').lean() as any;
    username = u?.username || '';
  } catch { /* non-fatal */ }

  const isBoost = plan === 'boost';
  const now = new Date();
  const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const submission = await AINsfwSubmission.create({
    name: formData.toolName.trim(),
    slug,
    category: formData.category,
    categories: formData.extraCategories && formData.extraCategories.length > 0
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
    createdBy: userId,
    createdByUsername: username,
    status: isBoost ? 'approved' : 'pending',
    submissionTier: plan,
    paymentStatus: 'pending',
    featured: isBoost,
    featuredExpiresAt: isBoost ? oneMonthLater : null,
    boosted: isBoost,
    boostExpiresAt: isBoost ? oneMonthLater : null,
  });

  const orderId = `sub__ainsfw__${submission._id}__${plan}__${Date.now()}`;
  let finalPrice = PLAN_PRICES[plan];
  let couponValidation: any = null;

  if (couponCode) {
    const starsEquiv = Math.round(PLAN_PRICES[plan] / 0.013);
    couponValidation = await validateCoupon(couponCode, 'ainsfw', starsEquiv);
    if (!couponValidation.valid) {
      await AINsfwSubmission.deleteOne({ _id: submission._id });
      return { success: false, error: couponValidation.error };
    }
    finalPrice = Math.round(couponValidation.discountedStars * 0.013 * 100) / 100;
  }

  if (finalPrice <= 0 && couponValidation) {
    await AINsfwSubmission.updateOne({ _id: submission._id }, { $set: { paymentStatus: 'paid' } });
    await recordCouponUsage(couponValidation.couponId, {
      service: 'ainsfw',
      entityId: submission._id.toString(),
      originalStars: Math.round(PLAN_PRICES[plan] / 0.013),
      discountedStars: 0,
      savedStars: Math.round(PLAN_PRICES[plan] / 0.013),
      couponCode: couponCode!,
    });
    return { success: true, slug, freeApproval: true };
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
        order_description: `${PLAN_DESCRIPTIONS[plan]} — ${formData.toolName} (${formData.websiteUrl})`,
        ipn_callback_url: `${SITE_URL}/api/payments/nowpayments/webhook`,
        success_url: `${SITE_URL}/add/ainsfw/thank-you?plan=${plan}&slug=${slug}`,
        cancel_url: `${SITE_URL}/add/ainsfw`,
        customer_email: formData.email.trim(),
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.invoice_url) {
      console.error('NowPayments AI NSFW invoice error:', data);
      await AINsfwSubmission.deleteOne({ _id: submission._id });
      return { success: false, error: data?.message || 'Failed to create payment.' };
    }

    await AINsfwSubmission.updateOne(
      { _id: submission._id },
      { $set: { paymentId: orderId } },
    );

    return { success: true, invoiceUrl: data.invoice_url, slug };
  } catch (err) {
    console.error('NowPayments AI NSFW payment error:', err);
    await AINsfwSubmission.deleteOne({ _id: submission._id });
    return { success: false, error: 'Payment service unavailable. Please try again.' };
  }
}
