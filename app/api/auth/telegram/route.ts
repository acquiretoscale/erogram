import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';
import { geoUpdateFields } from '@/lib/utils/geo';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const BOT_TOKEN = process.env.TELEGRAM_PAYMENT_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';

// Check Telegram auth data
function checkTelegramAuth(data: any, botToken: string): boolean {
  const authData = { ...data };
  const hash = authData.hash;
  delete authData.hash;

  const dataCheckString = Object.keys(authData)
    .sort()
    .map(key => `${key}=${authData[key]}`)
    .join('\n');

  const secret = crypto.createHash('sha256').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secret)
    .update(dataCheckString)
    .digest('hex');

  return hmac === hash;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const data = await req.json();

    if (!checkTelegramAuth(data, BOT_TOKEN)) {
      return NextResponse.json(
        { message: 'Invalid Telegram auth data' },
        { status: 401 }
      );
    }

    let user = await User.findOne({ telegramId: data.id });

    if (!user) {
      return NextResponse.json(
        { message: 'No account found. Create an account with email or Google first.' },
        { status: 404 },
      );
    }

    const geo = geoUpdateFields(req);
    if (data.username && data.username !== user.telegramUsername) {
      user.telegramUsername = data.username;
    }
    if (data.first_name && data.first_name !== user.firstName) {
      user.firstName = data.first_name;
    }
    if (data.photo_url && data.photo_url !== user.photoUrl) {
      user.photoUrl = data.photo_url;
    }
    Object.assign(user, geo);
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      token,
      username: user.username,
      isAdmin: user.isAdmin,
      firstName: user.firstName,
      photoUrl: user.photoUrl,
      isNewUser: false,
      onboardingCompleted: !!user.onboardingCompleted,
    });
  } catch (error: any) {
    console.error('Telegram login error:', error);
    return NextResponse.json(
      { message: 'Server error' },
      { status: 500 }
    );
  }
}

