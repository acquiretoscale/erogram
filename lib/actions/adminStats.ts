'use server';

import jwt from 'jsonwebtoken';
import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/db/mongodb';
import { User, Group, Bot, Post, Report, PremiumEvent } from '@/lib/models';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticateAdmin(token: string) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    await connectDB();
    const user = await User.findById(decoded.id);
    if (user && user.isAdmin) return user;
  } catch {
    return null;
  }
  return null;
}

export async function getMetrics(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const [userCount, groupCount, approvedGroupCount, pendingGroupCount, viewsResult, pendingBotCount, pendingReviewCount, pendingReportCount] = await Promise.all([
    User.countDocuments(),
    Group.countDocuments(),
    Group.countDocuments({ status: 'approved' }),
    Group.countDocuments({ status: 'pending' }),
    Group.aggregate([{ $group: { _id: null, totalViews: { $sum: '$views' } } }]),
    Bot.countDocuments({ status: 'pending' }),
    Post.countDocuments({ status: 'pending' }),
    Report.countDocuments({ status: 'pending' }),
  ]);

  return {
    userCount,
    groupCount,
    approvedGroupCount,
    pendingGroupCount,
    pendingBotCount,
    pendingReviewCount,
    pendingReportCount,
    totalViews: viewsResult[0]?.totalViews || 0,
  };
}

export async function getPendingCounts(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const [bots, reviews, reports] = await Promise.all([
    Bot.countDocuments({ status: 'pending' }),
    Post.countDocuments({ status: 'pending' }),
    Report.countDocuments({ status: 'pending' }),
  ]);

  return { bots, reviews, reports, total: bots + reviews + reports };
}

export async function getLiveStats(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
  const siteVisitsCol = mongoose.connection.db!.collection('sitevisits');

  const [pageviewsResult, activeVisitors] = await Promise.all([
    Group.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
    siteVisitsCol.countDocuments({ ts: { $gte: thirtyMinAgo } }),
  ]);

  return {
    totalPageviews: pageviewsResult[0]?.total || 0,
    activeVisitors,
  };
}

export async function getLatestSale(token: string, since: number) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const sinceDate = since ? new Date(since) : new Date(Date.now() - 60_000);

  const [saleEvent, newUser] = await Promise.all([
    PremiumEvent.findOne({
      event: { $in: ['payment_success', 'crypto_payment_success'] },
      createdAt: { $gt: sinceDate },
    }).sort({ createdAt: -1 }).lean() as any,

    User.findOne({
      createdAt: { $gt: sinceDate },
      isAdmin: { $ne: true },
    }).sort({ createdAt: -1 }).lean() as any,
  ]);

  return {
    sale: saleEvent ? {
      plan: saleEvent.plan,
      method: saleEvent.paymentMethod || (saleEvent.event === 'crypto_payment_success' ? 'crypto' : 'stars'),
      username: saleEvent.username || null,
      at: saleEvent.createdAt,
    } : null,
    newUser: newUser ? {
      username: newUser.username,
      provider: newUser.googleId ? 'google' : newUser.telegramId ? 'telegram' : 'other',
      at: newUser.createdAt,
    } : null,
  };
}

export async function getAdminNotifications(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [pendingBots, pendingReviews, pendingReports, pendingGroups, recentUsers, recentSales, recentNewBots] = await Promise.all([
    Bot.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(20).select('name createdAt createdByUsername').lean(),
    Post.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(20).select('authorName content createdAt').populate('groupId', 'name').lean(),
    Report.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(20).select('reason createdAt groupDetails').lean(),
    Group.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(20).select('name createdAt createdByUsername').lean(),
    User.find({ createdAt: { $gte: since48h } }).sort({ createdAt: -1 }).limit(20).select('username firstName premium createdAt country').lean(),
    PremiumEvent.find({ event: { $in: ['payment_success', 'crypto_payment_success'] }, createdAt: { $gte: since7d } }).sort({ createdAt: -1 }).limit(20).select('plan paymentMethod createdAt userId').populate('userId', 'username firstName').lean(),
    Bot.find({ createdAt: { $gte: since48h }, status: { $ne: 'pending' } }).sort({ createdAt: -1 }).limit(20).select('name createdAt paidBoost').lean(),
  ]);

  type AdminNotification = {
    id: string; type: string; title: string; subtitle: string;
    href: string; color: string; icon: string; createdAt: string; urgent: boolean;
  };
  const notifs: AdminNotification[] = [];

  for (const g of pendingGroups as any[]) {
    notifs.push({ id: `pg-${g._id}`, type: 'pending_group', title: `Group "${g.name}" pending`, subtitle: g.createdByUsername ? `by @${g.createdByUsername}` : 'awaiting review', href: '/admin/groups?tab=pending', color: '#f59e0b', icon: 'layers', createdAt: g.createdAt, urgent: false });
  }
  for (const b of pendingBots as any[]) {
    notifs.push({ id: `pb-${b._id}`, type: 'pending_bot', title: `Bot "${b.name}" pending`, subtitle: b.createdByUsername ? `by @${b.createdByUsername}` : 'awaiting review', href: '/admin/pending-actions', color: '#7c3aed', icon: 'bot', createdAt: b.createdAt, urgent: false });
  }
  for (const r of pendingReviews as any[]) {
    notifs.push({ id: `rv-${r._id}`, type: 'pending_review', title: `Review by ${r.authorName || 'Anonymous'}`, subtitle: r.groupId?.name ? `on "${r.groupId.name}"` : (r.content?.substring(0, 40) || 'needs moderation'), href: '/admin/pending-actions', color: '#0284c7', icon: 'message', createdAt: r.createdAt, urgent: false });
  }
  for (const rp of pendingReports as any[]) {
    notifs.push({ id: `rp-${rp._id}`, type: 'pending_report', title: `Report: ${rp.reason || 'Flagged content'}`, subtitle: rp.groupDetails?.name ? `on "${rp.groupDetails.name}"` : 'needs resolution', href: '/admin/pending-actions', color: '#ef4444', icon: 'flag', createdAt: rp.createdAt, urgent: true });
  }
  for (const sale of recentSales as any[]) {
    const buyer = sale.userId as any;
    const name = buyer?.firstName || buyer?.username || 'Unknown';
    notifs.push({ id: `sale-${sale._id}`, type: 'new_sale', title: `New ${sale.plan || 'premium'} subscription`, subtitle: `by ${name} via ${sale.paymentMethod || 'stars'}`, href: '/admin/premium', color: '#10b981', icon: 'star', createdAt: sale.createdAt, urgent: false });
  }
  for (const u of recentUsers as any[]) {
    const userName = u.firstName || u.username || 'Anonymous';
    notifs.push({ id: `usr-${u._id}`, type: 'new_user', title: `${userName}${u.country ? ` · ${u.country}` : ''}`, subtitle: u.premium ? 'paid' : 'free', href: '/admin/users', color: u.premium ? '#10b981' : '#06b6d4', icon: 'user', createdAt: u.createdAt, urgent: false });
  }
  for (const nb of recentNewBots as any[]) {
    notifs.push({ id: `nb-${nb._id}`, type: 'new_bot', title: `Bot "${nb.name}" published`, subtitle: nb.paidBoost ? 'paid boost' : 'free listing', href: '/admin/bots', color: '#8b5cf6', icon: 'bot', createdAt: nb.createdAt, urgent: false });
  }

  notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const pendingCount = pendingBots.length + pendingReviews.length + pendingReports.length + pendingGroups.length;

  return {
    notifications: notifs.slice(0, 20),
    total: notifs.length,
    urgentCount: pendingCount,
  };
}

export async function revalidateSlug(token: string, slug: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  if (!slug || typeof slug !== 'string') throw new Error('slug is required');

  revalidatePath(`/${slug}`);
  return { ok: true, revalidated: `/${slug}` };
}
