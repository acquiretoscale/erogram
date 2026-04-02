import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { User, PremiumEvent, Group, Bot } from '@/lib/models';
import { MAX_PREMIUM_SLOTS } from '@/lib/auth';
import { notifyAdminsOfSale } from '@/lib/utils/notifyAdmins';
import { getPremiumPricing } from '@/lib/premiumPricing';

const GROUP_SUBMISSION_TYPES = new Set(['normal_listing', 'instant_approval', 'boost_week', 'boost_month']);

function logEvent(data: Record<string, any>) {
  PremiumEvent.create({ source: 'server', ...data }).catch(() => {});
}

const BOT_TOKEN = process.env.TELEGRAM_PAYMENT_BOT_TOKEN || '';
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';

async function answerPreCheckoutQuery(id: string, ok: boolean, errorMessage?: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pre_checkout_query_id: id,
      ok,
      ...(errorMessage ? { error_message: errorMessage } : {}),
    }),
  });
}

const VALID_PLANS = new Set(['monthly', 'quarterly', 'yearly']);

export async function POST(req: NextRequest) {
  try {
    // Always require webhook secret — refuse everything if not configured
    if (!WEBHOOK_SECRET) {
      console.error('TELEGRAM_WEBHOOK_SECRET not set — blocking all webhook requests');
      return NextResponse.json({ ok: false }, { status: 503 });
    }

    const secret = req.headers.get('x-telegram-bot-api-secret-token');
    if (secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    const update = await req.json();

    // Ignore all plain text messages — the bot must NEVER message users.
    // Only pre_checkout_query and successful_payment are handled below.
    if (update.message?.text && !update.message?.successful_payment) {
      return NextResponse.json({ ok: true });
    }

    if (update.pre_checkout_query) {
      const query = update.pre_checkout_query;
      try {
        const payload = JSON.parse(query.invoice_payload);

        // Group/bot submission instant approval payments
        if (payload.groupId && payload.type && GROUP_SUBMISSION_TYPES.has(payload.type)) {
          await connectDB();
          const Model = payload.entityType === 'bot' ? Bot : Group;
          const entity = await Model.findById(payload.groupId).lean();
          if (!entity) {
            await answerPreCheckoutQuery(query.id, false, 'Submission not found');
            return NextResponse.json({ ok: true });
          }
          await answerPreCheckoutQuery(query.id, true);
          return NextResponse.json({ ok: true });
        }

        // Premium subscription payments
        if (!payload.userId || !payload.plan || !VALID_PLANS.has(payload.plan)) {
          await answerPreCheckoutQuery(query.id, false, 'Invalid payment data');
          return NextResponse.json({ ok: true });
        }

        await connectDB();

        const user = await User.findById(payload.userId).lean() as any;
        if (!user) {
          await answerPreCheckoutQuery(query.id, false, 'User not found');
          return NextResponse.json({ ok: true });
        }

        if (user.premium && (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) > new Date())) {
          await answerPreCheckoutQuery(query.id, false, 'You are already a Premium member');
          return NextResponse.json({ ok: true });
        }

        const taken = await User.countDocuments({
          premium: true,
          $or: [{ premiumExpiresAt: null }, { premiumExpiresAt: { $gt: new Date() } }],
        });
        if (taken >= MAX_PREMIUM_SLOTS) {
          await answerPreCheckoutQuery(query.id, false, 'All Premium spots are taken');
          return NextResponse.json({ ok: true });
        }

        logEvent({ event: 'pre_checkout', userId: payload.userId, plan: payload.plan });
        await answerPreCheckoutQuery(query.id, true);
      } catch {
        await answerPreCheckoutQuery(query.id, false, 'Error processing payment');
      }
      return NextResponse.json({ ok: true });
    }

    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      try {
        const payload = JSON.parse(payment.invoice_payload);

        // Group/bot submission instant approval
        if (payload.groupId && payload.type && GROUP_SUBMISSION_TYPES.has(payload.type)) {
          await connectDB();
          const Model = payload.entityType === 'bot' ? Bot : Group;
          const entity = await Model.findById(payload.groupId).lean() as any;
          if (!entity) {
            console.error('Webhook: group/bot not found for submission payment:', payload.groupId);
            return NextResponse.json({ ok: true });
          }

          // Idempotency: skip if already processed via paid boost
          if (entity.paidBoost) {
            console.log(`[Webhook] ${payload.entityType || 'group'} ${payload.groupId} already processed — skipping`);
            return NextResponse.json({ ok: true });
          }

          const now = new Date();
          const GROUP_STARS: Record<string, number> = { instant_approval: 1000, boost_week: 3000, boost_month: 6000 };
          const BOT_STARS: Record<string, number> = { normal_listing: 1000, instant_approval: 1500, boost_week: 3000, boost_month: 6000 };
          const STARS_AMOUNTS = payload.entityType === 'bot' ? BOT_STARS : GROUP_STARS;

          const updateFields: Record<string, any> = {};

          if (payload.type === 'normal_listing') {
            updateFields.paidBoost = true;
            updateFields.paidBoostStars = STARS_AMOUNTS.normal_listing;
          } else if (payload.type === 'boost_week') {
            updateFields.status = 'approved';
            const boostExpiry = new Date(now);
            boostExpiry.setDate(boostExpiry.getDate() + 7);
            updateFields.featured = true;
            updateFields.featuredAt = now;
            updateFields.boosted = true;
            updateFields.boostExpiresAt = boostExpiry;
            updateFields.boostDuration = '7d';
            updateFields.paidBoost = true;
            updateFields.paidBoostStars = STARS_AMOUNTS.boost_week;
          } else if (payload.type === 'boost_month') {
            updateFields.status = 'approved';
            const boostExpiry = new Date(now);
            boostExpiry.setDate(boostExpiry.getDate() + 30);
            updateFields.featured = true;
            updateFields.featuredAt = now;
            updateFields.boosted = true;
            updateFields.boostExpiresAt = boostExpiry;
            updateFields.boostDuration = '30d';
            updateFields.paidBoost = true;
            updateFields.paidBoostStars = STARS_AMOUNTS.boost_month;
          } else if (payload.type === 'instant_approval') {
            updateFields.status = 'approved';
            updateFields.paidBoost = true;
            updateFields.paidBoostStars = STARS_AMOUNTS.instant_approval;
          }

          await Model.findByIdAndUpdate(payload.groupId, { $set: updateFields });

          const entityLabel = payload.entityType === 'bot' ? 'bot' : 'group';
          const boostLabels: Record<string, string> = {
            normal_listing: 'normal listing',
            boost_week: 'instant + boost 1 week',
            boost_month: 'instant + boost 1 month',
            instant_approval: 'instant approval',
          };
          const typeLabel = boostLabels[payload.type] || payload.type;
          console.log(`[Webhook] ${entityLabel} ${payload.groupId} approved via ${typeLabel}`);

          notifyAdminsOfSale({
            plan: `${entityLabel}_${payload.type}`,
            method: 'stars',
            username: entity.name,
          }).catch(() => {});

          return NextResponse.json({ ok: true });
        }

        // Premium subscription payments
        const { userId, plan } = payload;

        if (!userId || !plan || !VALID_PLANS.has(plan)) {
          console.error('Webhook received invalid payload:', payload);
          return NextResponse.json({ ok: true });
        }

        await connectDB();

        const user = await User.findById(userId).lean() as any;
        if (!user) {
          console.error('Webhook payment for non-existent user:', userId);
          return NextResponse.json({ ok: true });
        }

        const chargeId = payment.provider_payment_charge_id || payment.telegram_payment_charge_id;
        if (!chargeId) {
          console.error('Webhook payment missing charge ID');
          return NextResponse.json({ ok: true });
        }

        const existing = await User.findOne({ lastPaymentChargeId: chargeId }).lean();
        if (existing) {
          return NextResponse.json({ ok: true });
        }

        const now = new Date();
        const updateData: Record<string, any> = {
          premium: true,
          premiumPlan: plan,
          premiumSince: now,
          paymentMethod: 'stars',
          lastPaymentChargeId: chargeId,
        };

        const pricing = await getPremiumPricing();
        const planConfig = plan === 'yearly' ? pricing.yearly : plan === 'quarterly' ? pricing.quarterly : pricing.monthly;
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + planConfig.days);
        updateData.premiumExpiresAt = expiresAt;

        await User.findByIdAndUpdate(userId, updateData);
        logEvent({ event: 'payment_success', userId, plan, chargeId, paymentMethod: 'stars' });

        notifyAdminsOfSale({ plan, method: 'stars', username: user.username }).catch(() => {});
      } catch (err) {
        console.error('Failed to process successful payment:', err);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ ok: true });
  }
}
