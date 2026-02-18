import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Group } from '@/lib/models';

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
    const search = searchParams.get('search');
    
    let query: any = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
          { country: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    const groups = await Group.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    return NextResponse.json(groups);
  } catch (error: any) {
    console.error('Groups fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}

