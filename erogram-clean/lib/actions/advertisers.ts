'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Advertiser, Campaign } from '@/lib/models';

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

export async function getAdvertisers(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const advertisers = await Advertiser.find().sort({ createdAt: -1 }).lean();

  // Attach campaign count per advertiser
  const ids = advertisers.map((a: any) => a._id);
  const counts = await Campaign.aggregate([
    { $match: { advertiserId: { $in: ids } } },
    { $group: { _id: '$advertiserId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c: any) => [c._id.toString(), c.count]));

  return advertisers.map((a: any) => ({
    _id: a._id.toString(),
    name: a.name,
    email: a.email,
    company: a.company || '',
    logo: a.logo || '',
    notes: a.notes || '',
    status: a.status,
    campaignCount: countMap.get(a._id.toString()) || 0,
    createdAt: a.createdAt?.toISOString() || '',
    updatedAt: a.updatedAt?.toISOString() || '',
  }));
}

export async function createAdvertiser(
  token: string,
  data: { name: string; email: string; company?: string; logo?: string; notes?: string }
) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  if (!data.name || !data.email) throw new Error('Name and email are required');

  await connectDB();
  const doc = await Advertiser.create({
    name: data.name,
    email: data.email,
    company: data.company || '',
    logo: data.logo || '',
    notes: data.notes || '',
  });

  return { _id: doc._id.toString(), name: doc.name };
}

export async function updateAdvertiser(
  token: string,
  id: string,
  data: Partial<{ name: string; email: string; company: string; logo: string; notes: string; status: string }>
) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const doc = await Advertiser.findByIdAndUpdate(id, data, { new: true }).lean();
  if (!doc) throw new Error('Advertiser not found');

  return { _id: (doc as any)._id.toString() };
}

export async function deleteAdvertiser(token: string, id: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  await Campaign.deleteMany({ advertiserId: id });
  await Advertiser.findByIdAndDelete(id);

  return { success: true };
}
