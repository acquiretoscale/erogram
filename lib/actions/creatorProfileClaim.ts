'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, OnlyFansCreator, CreatorProfileClaim } from '@/lib/models';
import { revalidateCreatorPage } from '@/lib/actions/ofCreatorProfile';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function getUserFromToken(token: string) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    if (!decoded?.id) return null;
    await connectDB();
    const user = await User.findById(decoded.id).select('username isAdmin').lean() as {
      _id: unknown;
      username?: string;
      isAdmin?: boolean;
    } | null;
    if (!user) return null;
    return { id: String(user._id), username: user.username || '', isAdmin: !!user.isAdmin };
  } catch {
    return null;
  }
}

async function requireAdmin(token: string) {
  const user = await getUserFromToken(token);
  if (!user?.isAdmin) throw new Error('Unauthorized');
  return user;
}

export type ProfileClaimStatus = 'none' | 'pending' | 'approved' | 'rejected';

export async function getProfileClaimStatus(token: string, slug: string): Promise<{
  status: ProfileClaimStatus;
  claimId?: string;
}> {
  const user = await getUserFromToken(token);
  if (!user) return { status: 'none' };

  await connectDB();
  const claim = await CreatorProfileClaim.findOne({ userId: user.id, creatorSlug: slug })
    .sort({ createdAt: -1 })
    .select('_id status')
    .lean() as { _id: unknown; status?: string } | null;

  if (!claim) return { status: 'none' };
  return {
    status: (claim.status as ProfileClaimStatus) || 'none',
    claimId: String(claim._id),
  };
}

export async function submitCreatorProfileClaim(
  token: string,
  slug: string,
  input: {
    fullName: string;
    email: string;
    contact: string;
    accountType: 'individual' | 'agency';
    reason: string;
  },
): Promise<{ success: true } | { error: string }> {
  const user = await getUserFromToken(token);
  if (!user) return { error: 'You must be logged in to claim a profile.' };

  const fullName = input.fullName?.trim();
  const email = input.email?.trim();
  const contact = input.contact?.trim();
  const reason = input.reason?.trim();

  if (!fullName) return { error: 'Full name is required.' };
  if (!email || !email.includes('@')) return { error: 'A valid email is required.' };
  if (!contact) return { error: 'Telegram or WhatsApp contact is required.' };
  if (!reason || reason.length < 10) return { error: 'Please explain why you want to claim this profile (min 10 characters).' };
  if (input.accountType !== 'individual' && input.accountType !== 'agency') {
    return { error: 'Select individual or agency.' };
  }

  await connectDB();

  const creator = await OnlyFansCreator.findOne({ slug, deleted: { $ne: true } })
    .select('username name submittedBy')
    .lean() as { username?: string; name?: string; submittedBy?: { toString(): string } } | null;
  if (!creator) return { error: 'Creator profile not found.' };

  if (creator.submittedBy?.toString() === user.id) {
    return { error: 'You already manage this profile.' };
  }
  if (creator.submittedBy) {
    return { error: 'This profile is already linked to another account.' };
  }

  const ownedProfile = await OnlyFansCreator.findOne({ submittedBy: user.id, deleted: { $ne: true } })
    .select('slug username')
    .lean() as { slug?: string; username?: string } | null;
  if (ownedProfile && ownedProfile.slug !== slug) {
    const handle = ownedProfile.username || ownedProfile.slug;
    return { error: `You already manage @${handle}. One creator profile per account.` };
  }

  const userPending = await CreatorProfileClaim.findOne({ userId: user.id, status: 'pending' })
    .select('creatorSlug creatorUsername')
    .lean() as { creatorSlug?: string; creatorUsername?: string } | null;
  if (userPending && userPending.creatorSlug !== slug) {
    const handle = userPending.creatorUsername || userPending.creatorSlug;
    return { error: `You already have a pending claim for @${handle}. One creator profile per account.` };
  }

  const slugPending = await CreatorProfileClaim.findOne({ creatorSlug: slug, status: 'pending', userId: { $ne: user.id } })
    .select('_id')
    .lean();
  if (slugPending) {
    return { error: 'This profile already has a pending claim under review.' };
  }

  const existing = await CreatorProfileClaim.findOne({ userId: user.id, creatorSlug: slug, status: 'pending' }).lean();
  if (existing) {
    return { error: 'Your claim is already pending admin approval.' };
  }

  await CreatorProfileClaim.create({
    creatorSlug: slug,
    creatorUsername: creator.username || slug,
    creatorName: creator.name || '',
    userId: user.id,
    erogramUsername: user.username,
    fullName,
    email,
    contact,
    accountType: input.accountType,
    reason,
    status: 'pending',
  });

  return { success: true };
}

export type ProfileClaimRow = {
  _id: string;
  creatorSlug: string;
  creatorUsername: string;
  creatorName: string;
  erogramUsername: string;
  fullName: string;
  email: string;
  contact: string;
  accountType: 'individual' | 'agency';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

export async function listProfileClaims(token: string, status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending'): Promise<ProfileClaimRow[]> {
  await requireAdmin(token);
  await connectDB();

  const filter = status === 'all' ? {} : { status };
  const rows = await CreatorProfileClaim.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return rows.map((r: any) => ({
    _id: r._id.toString(),
    creatorSlug: r.creatorSlug,
    creatorUsername: r.creatorUsername,
    creatorName: r.creatorName || '',
    erogramUsername: r.erogramUsername || '',
    fullName: r.fullName,
    email: r.email,
    contact: r.contact,
    accountType: r.accountType,
    reason: r.reason,
    status: r.status,
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : '',
  }));
}

export async function approveProfileClaim(token: string, claimId: string): Promise<{ ok: true } | { error: string }> {
  const admin = await requireAdmin(token);
  await connectDB();

  const claim = await CreatorProfileClaim.findById(claimId).lean() as any;
  if (!claim) return { error: 'Claim not found.' };
  if (claim.status !== 'pending') return { error: 'Claim is not pending.' };

  const creator = await OnlyFansCreator.findOne({ slug: claim.creatorSlug, deleted: { $ne: true } }).lean() as any;
  if (!creator) return { error: 'Creator profile not found.' };
  if (creator.submittedBy && creator.submittedBy.toString() !== claim.userId.toString()) {
    return { error: 'Profile is already linked to another account.' };
  }

  const otherOwned = await OnlyFansCreator.findOne({
    submittedBy: claim.userId,
    deleted: { $ne: true },
    slug: { $ne: claim.creatorSlug },
  }).select('username slug').lean() as { username?: string; slug?: string } | null;
  if (otherOwned) {
    const handle = otherOwned.username || otherOwned.slug;
    return { error: `Claimant already manages @${handle}.` };
  }

  const claimant = await User.findById(claim.userId).select('username').lean() as { username?: string } | null;

  await OnlyFansCreator.updateOne(
    { slug: claim.creatorSlug },
    {
      $set: {
        submittedBy: claim.userId,
        submittedByUser: true,
        submittedByUsername: claimant?.username || claim.erogramUsername || '',
        submissionStatus: 'approved',
      },
    },
  );

  await CreatorProfileClaim.updateOne(
    { _id: claimId },
    { $set: { status: 'approved', reviewedAt: new Date(), reviewedBy: admin.id } },
  );

  await CreatorProfileClaim.updateMany(
    { creatorSlug: claim.creatorSlug, status: 'pending', _id: { $ne: claimId } },
    { $set: { status: 'rejected', reviewedAt: new Date(), reviewedBy: admin.id } },
  );

  await revalidateCreatorPage(claim.creatorSlug, creator.username);
  return { ok: true };
}

export async function rejectProfileClaim(token: string, claimId: string): Promise<{ ok: true } | { error: string }> {
  const admin = await requireAdmin(token);
  await connectDB();

  const claim = await CreatorProfileClaim.findById(claimId).lean() as any;
  if (!claim) return { error: 'Claim not found.' };
  if (claim.status !== 'pending') return { error: 'Claim is not pending.' };

  await CreatorProfileClaim.updateOne(
    { _id: claimId },
    { $set: { status: 'rejected', reviewedAt: new Date(), reviewedBy: admin.id } },
  );

  return { ok: true };
}
