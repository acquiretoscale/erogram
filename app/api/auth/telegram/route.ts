import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8441115133:AAFN2d6HLxcRHkrNXF3uZ1J31ZKzwBIVbNQ';

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
      // Create new Telegram user
      try {
        user = await User.create({
          username: data.username || `tg_${data.id}`,
          email: undefined,
          telegramId: data.id,
          telegramUsername: data.username || null,
          firstName: data.first_name || null,
          photoUrl: data.photo_url || null,
        });
      } catch (error: any) {
        if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
          user = await User.create({
            username: data.username || `tg_${data.id}`,
            telegramId: data.id,
            telegramUsername: data.username || null,
            firstName: data.first_name || null,
            photoUrl: data.photo_url || null,
          });
        } else {
          throw error;
        }
      }
    } else {
      // Update existing Telegram user info if changed
      let updated = false;
      if (data.username && data.username !== user.telegramUsername) {
        user.telegramUsername = data.username;
        updated = true;
      }
      if (data.first_name && data.first_name !== user.firstName) {
        user.firstName = data.first_name;
        updated = true;
      }
      if (data.photo_url && data.photo_url !== user.photoUrl) {
        user.photoUrl = data.photo_url;
        updated = true;
      }
      if (updated) await user.save();
    }

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
    });
  } catch (error: any) {
    console.error('Telegram login error:', error);
    return NextResponse.json(
      { message: 'Server error' },
      { status: 500 }
    );
  }
}

