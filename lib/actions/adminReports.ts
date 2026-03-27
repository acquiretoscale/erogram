'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Report } from '@/lib/models';

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

export async function getReports(token: string, status?: string, search?: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const query: any = {};
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { reason: { $regex: search, $options: 'i' } },
      { 'groupDetails.name': { $regex: search, $options: 'i' } },
      { 'groupDetails.category': { $regex: search, $options: 'i' } },
      { 'groupDetails.country': { $regex: search, $options: 'i' } },
    ];
  }

  const reports = await Report.find(query).sort({ createdAt: -1 }).lean();
  return JSON.parse(JSON.stringify(reports));
}

export async function updateReportStatus(token: string, id: string, status: 'pending' | 'resolved') {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  if (!['pending', 'resolved'].includes(status)) throw new Error('Invalid status');

  await connectDB();
  const report = await Report.findByIdAndUpdate(
    id,
    {
      status,
      ...(status === 'resolved' ? { resolvedAt: new Date(), resolvedBy: admin._id } : {}),
    },
    { new: true },
  ).lean();
  if (!report) throw new Error('Report not found');
  return JSON.parse(JSON.stringify(report));
}

export async function deleteReport(token: string, id: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const report = await Report.findByIdAndDelete(id);
  if (!report) throw new Error('Report not found');
  return { success: true };
}
