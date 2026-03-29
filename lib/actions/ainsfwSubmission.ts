'use server';

export type AINSFWPlan = 'platinum' | 'boost' | 'instant' | 'free';

const PLAN_PRICES: Record<Exclude<AINSFWPlan, 'free'>, number> = {
  platinum: 499,
  boost: 97,
  instant: 39,
};

const PLAN_DESCRIPTIONS: Record<AINSFWPlan, string> = {
  platinum: 'PLATINUM — 1 Month Featured AI NSFW Listing',
  boost: 'BOOST + Instant Approval — 7 Days Featured AI NSFW',
  instant: 'Instant Approval — AI NSFW Listing',
  free: 'Basic AI NSFW Listing',
};

const API_KEY = process.env.NOWPAYMENTS_API_KEY || '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';
const NP_BASE = 'https://api.nowpayments.io/v1';

export async function createAINsfwInvoice(
  plan: AINSFWPlan,
  toolName: string,
  toolUrl: string,
  contactEmail: string,
  category: string,
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (plan === 'free') {
    return { success: true };
  }

  if (!API_KEY) {
    return { success: false, error: 'Crypto payments are not configured.' };
  }

  const orderId = `ainsfw_${plan}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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
        order_description: `${PLAN_DESCRIPTIONS[plan]} — ${toolName}`,
        ipn_callback_url: `${SITE_URL}/api/payments/nowpayments/webhook`,
        success_url: `${SITE_URL}/add/ainsfw/thank-you?plan=${plan}`,
        cancel_url: `${SITE_URL}/add/ainsfw`,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.invoice_url) {
      console.error('NowPayments AI NSFW invoice error:', data);
      return { success: false, error: data?.message || 'Failed to create payment.' };
    }

    return { success: true, url: data.invoice_url };
  } catch (err) {
    console.error('NowPayments AI NSFW error:', err);
    return { success: false, error: 'Payment service unavailable. Please try again.' };
  }
}
