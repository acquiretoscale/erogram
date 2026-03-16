import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { Advertiser } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    await connectDB();
    const advertiser = await Advertiser.findOne({
      email: { $regex: new RegExp(`^${email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      status: 'active',
    }).lean() as any;

    if (!advertiser) {
      return NextResponse.json({ message: 'No active advertiser account found for this email' }, { status: 401 });
    }

    const token = jwt.sign(
      { advertiserId: advertiser._id.toString(), email: advertiser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      token,
      advertiser: {
        _id: advertiser._id.toString(),
        name: advertiser.name,
        email: advertiser.email,
        company: advertiser.company || '',
        logo: advertiser.logo || '',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Server error' }, { status: 500 });
  }
}
