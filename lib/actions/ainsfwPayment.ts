'use server';

import connectDB from '@/lib/db/mongodb';
import { AINsfwSubmission } from '@/lib/models';

export type AINSFWPlan = 'basic' | 'boost';

export interface AINSFWFormData {
  toolName: string;
  websiteUrl: string;
  email: string;
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
  boost: 'BOOST — Instant Approval + 1 Month Featured AI NSFW — $297',
};

const API_KEY = process.env.NOWPAYMENTS_API_KEY || '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';
const NP_BASE = 'https://api.nowpayments.io/v1';

function slugify(category: string, name: string): string {
  const prefix = category.toLowerCase().replace(/\s+/g, '-');
  const n = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${prefix}-${n}`;
}

export async function createAINSFWSubmission(
  plan: AINSFWPlan,
  formData: AINSFWFormData,
): Promise<{ success: boolean; invoiceUrl?: string; slug?: string; error?: string }> {
  if (!API_KEY) {
    return { success: false, error: 'Crypto payments are not configured.' };
  }

  const slug = slugify(formData.category, formData.toolName);
  const tags = formData.tags
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  await connectDB();

  const existing = await AINsfwSubmission.findOne({ slug }).lean();
  if (existing) {
    return { success: false, error: 'A tool with this name already exists in that category.' };
  }

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
    status: isBoost ? 'approved' : 'pending',
    submissionTier: plan,
    paymentStatus: 'pending',
    featured: isBoost,
    featuredExpiresAt: isBoost ? oneMonthLater : null,
    boosted: isBoost,
    boostExpiresAt: isBoost ? oneMonthLater : null,
  });

  const orderId = `ainsfw_${plan}_${submission._id}`;

  try {
    const res = await fetch(`${NP_BASE}/invoice`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: PLAN_PRICES[plan],
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
