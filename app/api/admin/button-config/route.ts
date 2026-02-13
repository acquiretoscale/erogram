import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, ButtonConfig } from '@/lib/models';

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
    
    // Get or create button config
    let config = await ButtonConfig.findOne();
    if (!config) {
      config = await ButtonConfig.create({});
    }
    
    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Button config fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch button config' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    
    // Get or create button config
    let config = await ButtonConfig.findOne();
    if (!config) {
      config = await ButtonConfig.create(body);
    } else {
      config.button1 = body.button1 || config.button1;
      config.button2 = body.button2 || config.button2;
      config.button3 = body.button3 || config.button3;
      await config.save();
    }
    
    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Button config update error:', error);
    return NextResponse.json(
      { message: 'Failed to update button config' },
      { status: 500 }
    );
  }
}

