import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Report } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (user && user.isAdmin) {
      return user;
    }
  } catch (error) {
    return null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status'); // 'pending', 'resolved', or null for all
    const search = searchParams.get('search');

    const query: any = {};
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { reason: { $regex: search, $options: 'i' } },
        { 'groupDetails.name': { $regex: search, $options: 'i' } },
        { 'groupDetails.category': { $regex: search, $options: 'i' } },
        { 'groupDetails.country': { $regex: search, $options: 'i' } },
      ];
    }

    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(reports);
  } catch (error: any) {
    console.error('Reports fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}