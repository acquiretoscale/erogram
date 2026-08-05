'use server';

import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/db/mongodb';
import { Bot, AINsfwSubmission, AINsfwToolStats, Campaign, User } from '@/lib/models';
import { slugify } from '@/lib/utils/slugify';
import { LOCALES } from '@/lib/i18n/config';

function telegramLinkFromSubmission(sub: {
  websiteUrl?: string;
  tryNowUrl?: string;
}): string | null {
  const url = (sub.tryNowUrl || sub.websiteUrl || '').trim();
  return url.startsWith('https://t.me/') ? url : null;
}

async function uniqueBotSlug(base: string): Promise<string> {
  let slug = slugify(base).slice(0, 80) || 'bot';
  if (!(await Bot.findOne({ slug }).select('_id').lean())) return slug;
  let n = 2;
  while (await Bot.findOne({ slug: `${slug}-${n}` }).select('_id').lean()) n++;
  return `${slug}-${n}`;
}

function revalidateBotPaths(slug: string) {
  try {
    for (const locale of LOCALES) {
      revalidatePath(locale === 'en' ? `/${slug}` : `/${locale}/${slug}`);
    }
    revalidatePath('/bots');
    revalidatePath('/ainsfw');
  } catch (err) {
    console.error('[reallocateAinsfwToBot] revalidate failed:', err);
  }
}

/** Move a paid AINSFW submission to Telegram Bots. Keeps boost/featured expiry. Deletes AINSFW row. No redirect. */
export async function adminReallocateAinsfwToBot(
  submissionId: string,
  options?: { featured?: boolean },
): Promise<{ success: boolean; botId?: string; botSlug?: string; error?: string }> {
  await connectDB();

  const sub = await AINsfwSubmission.findById(submissionId).lean() as {
    _id: unknown;
    name: string;
    slug: string;
    description: string;
    image?: string;
    websiteUrl?: string;
    tryNowUrl?: string;
    category?: string;
    categories?: string[];
    createdBy?: unknown;
    createdByUsername?: string;
    status: string;
    paymentStatus?: string;
    paymentId?: string;
    boosted?: boolean;
    boostExpiresAt?: Date | null;
    featured?: boolean;
    featuredExpiresAt?: Date | null;
    views?: number;
    clickCount?: number;
    contactEmail?: string;
    contactTelegram?: string;
    createdAt?: Date;
  } | null;

  if (!sub) return { success: false, error: 'Submission not found' };

  const telegramLink = telegramLinkFromSubmission(sub);
  if (!telegramLink) {
    return { success: false, error: 'Submission has no https://t.me/ link — not a Telegram bot' };
  }

  const botSlug = await uniqueBotSlug(sub.name);
  const now = new Date();
  const boostExpiresAt = sub.boostExpiresAt ? new Date(sub.boostExpiresAt) : null;
  const featuredExpiresAt = sub.featuredExpiresAt ? new Date(sub.featuredExpiresAt) : null;
  const expiry = featuredExpiresAt || boostExpiresAt;
  const hasActiveExpiry = !expiry || expiry > now;

  const featuredActive =
    options?.featured === true ||
    (!!sub.featured && hasActiveExpiry) ||
    (!!sub.boosted && hasActiveExpiry);

  let boostEnd = expiry;
  if (featuredActive && !boostEnd) {
    boostEnd = new Date(now);
    boostEnd.setDate(boostEnd.getDate() + 30);
  }

  const boostedActive = featuredActive && (!boostEnd || boostEnd > now);

  let boostStart = now;
  if (boostEnd && boostedActive) {
    const ms = boostEnd.getTime() - now.getTime();
    const days = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
    boostStart = new Date(boostEnd);
    boostStart.setDate(boostStart.getDate() - (days <= 7 ? 7 : 30));
  }

  let createdBy = sub.createdBy;
  let createdByUsername = sub.createdByUsername || '';
  if (!createdBy && sub.contactEmail?.trim()) {
    const owner = await User.findOne({ email: sub.contactEmail.trim().toLowerCase() })
      .select('_id username')
      .lean() as { _id: unknown; username?: string } | null;
    if (owner) {
      createdBy = owner._id;
      createdByUsername = owner.username || createdByUsername;
    }
  }

  let boostDuration: '7d' | '30d' | null = null;
  if (boostedActive && boostEnd) {
    const daysLeft = Math.ceil((boostEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    boostDuration = daysLeft <= 7 ? '7d' : '30d';
  }

  const bot = await Bot.create({
    name: sub.name,
    slug: botSlug,
    category: 'AI NSFW',
    country: 'Adult-Telegram',
    categories: ['AI NSFW'],
    telegramLink,
    description: sub.description,
    image: sub.image || '/assets/image.jpg',
    createdBy,
    createdByUsername,
    status: sub.status === 'approved' ? 'approved' : 'pending',
    publishedAt: sub.status === 'approved' ? now : null,
    views: sub.views || 0,
    clickCount: sub.clickCount || 0,
    contactEmail: sub.contactEmail || '',
    contactTelegram: sub.contactTelegram || '',
    paidBoost: sub.paymentStatus === 'paid',
    lastPaymentChargeId: sub.paymentId || null,
    boosted: boostedActive,
    boostExpiresAt: boostedActive ? boostEnd : null,
    boostDuration: boostedActive ? boostDuration : null,
    featured: boostedActive,
    featuredAt: boostedActive ? boostStart : null,
    createdAt: sub.createdAt || now,
  });

  const stats = await AINsfwToolStats.findOne({ slug: sub.slug }).lean() as { campaignId?: unknown } | null;
  if (stats?.campaignId) {
    await Campaign.findByIdAndUpdate(stats.campaignId, { $set: { status: 'paused', isVisible: false } });
  }
  await AINsfwToolStats.deleteOne({ slug: sub.slug });
  await AINsfwSubmission.deleteOne({ _id: sub._id });

  revalidateBotPaths(botSlug);

  return { success: true, botId: bot._id.toString(), botSlug };
}
