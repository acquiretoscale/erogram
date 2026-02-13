import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Bot } from '@/lib/models';
import { sendNewBotTelegramNotification } from '@/lib/utils/telegramNotify';

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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    const body = await req.json();
    
    const bot = await Bot.findById(id);
    if (!bot) {
      return NextResponse.json(
        { message: 'Bot not found' },
        { status: 404 }
      );
    }
    
    const oldStatus = bot.status;
    
    // Update bot
    console.log('Updating bot:', bot._id, 'with data:', body);
    Object.assign(bot, body);
    bot.reviewedBy = admin._id;
    bot.reviewedAt = new Date();
    await bot.save();
    console.log('Bot updated successfully:', bot._id, 'pinned:', bot.pinned);
    
    // Send Telegram notification if status changed from pending to approved
    if (oldStatus === 'pending' && bot.status === 'approved') {
      try {
        await sendNewBotTelegramNotification(bot);
      } catch (err) {
        console.error('Failed to send Telegram notification:', err);
        // Don't fail the request if notification fails
      }
    }
    
    return NextResponse.json(bot);
  } catch (error: any) {
    console.error('Bot update error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update bot' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    const bot = await Bot.findByIdAndDelete(id);
    
    if (!bot) {
      return NextResponse.json(
        { message: 'Bot not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Bot deleted successfully' });
  } catch (error: any) {
    console.error('Bot delete error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to delete bot' },
      { status: 500 }
    );
  }
}

