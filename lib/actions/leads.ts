'use server';

import connectDB from '@/lib/db/mongodb';
import { Group, Bot, AINsfwSubmission, User } from '@/lib/models';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';
const STAR_RATE = 0.013; // $/star — matches brain financials

function verifyAdmin(token: string): boolean {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return !!decoded.isAdmin;
  } catch {
    return false;
  }
}

export interface Lead {
  userId: string;
  username: string;
  email: string;
  telegram: string;
  groups: number;
  bots: number;
  ainsfw: number;
  totalListings: number;
  paidUsd: number;
  hasActiveBoost: boolean;
  topClicks: number;
  lastActivity: string | null;
  // Outreach segmentation (derived, not stored)
  segment: 'agency' | 'paid' | 'free';
  hotUpsell: boolean; // free poster getting traction = best upsell target
}

interface Acc {
  groups: number;
  bots: number;
  ainsfw: number;
  paidStars: number;
  paidUsd: number;
  hasActiveBoost: boolean;
  topClicks: number;
  telegram: string;
  email: string;
  lastActivity: number;
}

export async function getLeads(token: string): Promise<{ leads: Lead[]; error?: string }> {
  if (!verifyAdmin(token)) return { leads: [], error: 'Unauthorized' };

  await connectDB();
  const now = Date.now();
  const acc = new Map<string, Acc>();

  const ensure = (id: string): Acc => {
    let a = acc.get(id);
    if (!a) {
      a = { groups: 0, bots: 0, ainsfw: 0, paidStars: 0, paidUsd: 0, hasActiveBoost: false, topClicks: 0, telegram: '', email: '', lastActivity: 0 };
      acc.set(id, a);
    }
    return a;
  };

  const ingest = (
    rows: any[],
    kind: 'groups' | 'bots' | 'ainsfw',
  ) => {
    for (const r of rows) {
      const id = r.createdBy?.toString();
      if (!id) continue;
      const a = ensure(id);
      a[kind] += 1;
      if (r.contactTelegram && !a.telegram) a.telegram = r.contactTelegram;
      if (r.contactEmail && !a.email) a.email = r.contactEmail;
      const clicks = r.clickCount || 0;
      if (clicks > a.topClicks) a.topClicks = clicks;
      const created = r.createdAt ? new Date(r.createdAt).getTime() : 0;
      if (created > a.lastActivity) a.lastActivity = created;
      const expiry = r.boostExpiresAt ? new Date(r.boostExpiresAt).getTime() : 0;
      if ((r.boosted && expiry > now) || r.featured) a.hasActiveBoost = a.hasActiveBoost || (r.boosted && expiry > now);
      // Revenue: Telegram-stars listings store paidBoostStars; AI NSFW boost = $197
      if (kind === 'ainsfw') {
        if (r.submissionTier === 'boost' && r.paymentStatus === 'paid') a.paidUsd += 197;
        else if (r.submissionTier === 'basic' && r.paymentStatus === 'paid') a.paidUsd += 49;
      } else if (r.paidBoostStars) {
        a.paidStars += r.paidBoostStars;
      }
    }
  };

  const [groups, bots, ainsfw] = await Promise.all([
    Group.find({ createdBy: { $ne: null }, status: { $ne: 'deleted' } })
      .select('createdBy contactTelegram contactEmail clickCount createdAt boosted boostExpiresAt paidBoostStars')
      .lean(),
    Bot.find({ createdBy: { $ne: null } })
      .select('createdBy contactTelegram contactEmail clickCount createdAt boosted boostExpiresAt paidBoostStars')
      .lean(),
    AINsfwSubmission.find({ createdBy: { $ne: null } })
      .select('createdBy contactTelegram contactEmail createdAt boosted boostExpiresAt featured submissionTier paymentStatus')
      .lean(),
  ]);

  ingest(groups as any[], 'groups');
  ingest(bots as any[], 'bots');
  ingest(ainsfw as any[], 'ainsfw');

  if (acc.size === 0) return { leads: [] };

  const userIds = Array.from(acc.keys());
  const users = await User.find({ _id: { $in: userIds } })
    .select('username email telegramUsername')
    .lean();
  const userMap = new Map((users as any[]).map((u) => [u._id.toString(), u]));

  const leads: Lead[] = userIds.map((id) => {
    const a = acc.get(id)!;
    const u = userMap.get(id);
    const paidUsd = Math.round((a.paidUsd + a.paidStars * STAR_RATE) * 100) / 100;
    const totalListings = a.groups + a.bots + a.ainsfw;
    const segment: Lead['segment'] = a.ainsfw + a.groups + a.bots >= 3 ? 'agency' : paidUsd > 0 ? 'paid' : 'free';
    return {
      userId: id,
      username: u?.username || '(unknown)',
      email: a.email || u?.email || '',
      telegram: a.telegram || u?.telegramUsername || '',
      groups: a.groups,
      bots: a.bots,
      ainsfw: a.ainsfw,
      totalListings,
      paidUsd,
      hasActiveBoost: a.hasActiveBoost,
      topClicks: a.topClicks,
      lastActivity: a.lastActivity ? new Date(a.lastActivity).toISOString() : null,
      segment,
      hotUpsell: paidUsd === 0 && a.topClicks >= 50,
    };
  });

  // Best outreach targets first: highest spend, then most traction
  leads.sort((x, y) => y.paidUsd - x.paidUsd || y.topClicks - x.topClicks || y.totalListings - x.totalListings);

  return { leads };
}
