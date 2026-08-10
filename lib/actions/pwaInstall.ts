'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, PwaInstall } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

function userIdFromToken(token: string | null | undefined): string | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    return decoded?.id || null;
  } catch {
    return null;
  }
}

/**
 * Record a PWA install for guests or logged-in users.
 * Dedupes by clientId (one install per browser). Add-only.
 */
export async function recordPwaInstall(token: string | null, clientId: string) {
  const id = typeof clientId === 'string' ? clientId.trim().slice(0, 64) : '';
  if (!id) return { ok: false };

  try {
    await connectDB();
    const userId = userIdFromToken(token);
    const existing = await PwaInstall.findOne({ clientId: id }).lean() as { _id: unknown; userId?: unknown } | null;

    if (existing) {
      if (userId && !existing.userId) {
        await PwaInstall.updateOne({ _id: existing._id }, { $set: { userId } });
      }
      if (userId) {
        await User.updateOne(
          { _id: userId, $or: [{ pwaInstalledAt: null }, { pwaInstalledAt: { $exists: false } }] },
          { $set: { pwaInstalledAt: new Date() } }
        );
      }
      return { ok: true };
    }

    await PwaInstall.create({
      clientId: id,
      userId: userId || null,
      createdAt: new Date(),
    });

    if (userId) {
      await User.updateOne(
        { _id: userId, $or: [{ pwaInstalledAt: null }, { pwaInstalledAt: { $exists: false } }] },
        { $set: { pwaInstalledAt: new Date() } }
      );
    }

    return { ok: true };
  } catch {
    return { ok: false };
  }
}

async function assertAdmin(token: string) {
  const userId = userIdFromToken(token);
  if (!userId) throw new Error('Unauthorized');
  await connectDB();
  const admin = await User.findById(userId).select('isAdmin').lean() as { isAdmin?: boolean } | null;
  if (!admin?.isAdmin) throw new Error('Unauthorized');
}

function accountStatus(u: {
  premium?: boolean;
  premiumPlan?: string | null;
  premiumExpiresAt?: Date | string | null;
} | null | undefined): { status: 'guest' | 'free' | 'paid'; label: string } {
  if (!u) return { status: 'guest', label: 'Guest' };
  const paid =
    u.premium === true &&
    (!u.premiumExpiresAt || new Date(u.premiumExpiresAt) > new Date());
  if (!paid) return { status: 'free', label: 'Free' };
  const plan = (u.premiumPlan || 'active').toString();
  const label = plan.charAt(0).toUpperCase() + plan.slice(1);
  return { status: 'paid', label };
}

/** Merge PwaInstall rows + users marked with pwaInstalledAt (live wrote users first). */
async function loadInstallSnapshot(limit = 100) {
  const take = Math.min(Math.max(Number(limit) || 100, 1), 500);

  const [rows, markedUsers] = await Promise.all([
    PwaInstall.find({})
      .sort({ createdAt: -1 })
      .limit(take)
      .populate('userId', 'username email premium premiumPlan premiumExpiresAt')
      .lean(),
    User.find({ pwaInstalledAt: { $ne: null } })
      .select('username email pwaInstalledAt premium premiumPlan premiumExpiresAt')
      .sort({ pwaInstalledAt: -1 })
      .lean(),
  ]);

  const linkedFromRows = new Set<string>();
  const installs: Array<{
    id: string;
    clientId: string;
    createdAt: Date | string;
    userId: string | null;
    username: string | null;
    email: string | null;
    status: 'guest' | 'free' | 'paid';
    statusLabel: string;
  }> = [];

  for (const r of rows as any[]) {
    const uid = r.userId?._id ? String(r.userId._id) : r.userId ? String(r.userId) : null;
    if (uid) linkedFromRows.add(uid);
    const acct = accountStatus(uid ? r.userId : null);
    installs.push({
      id: String(r._id),
      clientId: r.clientId,
      createdAt: r.createdAt,
      userId: uid,
      username: r.userId?.username || null,
      email: r.userId?.email || null,
      status: acct.status,
      statusLabel: acct.label,
    });
  }

  for (const u of markedUsers as any[]) {
    const uid = String(u._id);
    if (linkedFromRows.has(uid)) continue;
    const acct = accountStatus(u);
    installs.push({
      id: `user:${uid}`,
      clientId: '',
      createdAt: u.pwaInstalledAt,
      userId: uid,
      username: u.username || null,
      email: u.email || null,
      status: acct.status,
      statusLabel: acct.label,
    });
  }

  installs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const guests = await PwaInstall.countDocuments({
    $or: [{ userId: null }, { userId: { $exists: false } }],
  });
  const linked = linkedFromRows.size + markedUsers.filter((u: any) => !linkedFromRows.has(String(u._id))).length;
  const total = guests + linked;
  const paid = installs.filter((i) => i.status === 'paid').length;
  const free = installs.filter((i) => i.status === 'free').length;

  return {
    total,
    linked,
    guests,
    paid,
    free,
    installs: installs.slice(0, take),
  };
}

export async function getPwaInstallCount(token: string) {
  await assertAdmin(token);
  const { total, linked, guests } = await loadInstallSnapshot(1);
  return { total, linked, guests };
}

export async function getPwaInstalls(token: string, limit = 100) {
  await assertAdmin(token);
  return loadInstallSnapshot(limit);
}

