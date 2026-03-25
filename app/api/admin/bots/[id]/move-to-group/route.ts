import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Group, Bot } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (user && user.isAdmin) return user;
  } catch {
    return null;
  }
  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const bot = await Bot.findById(id).lean() as any;
    if (!bot) {
      return NextResponse.json({ message: 'Bot not found' }, { status: 404 });
    }

    let slug = bot.slug as string;
    const existing = await Group.findOne({ slug });
    if (existing) {
      slug = `${slug}-group`;
    }

    const group = await Group.create({
      name: bot.name,
      slug,
      category: bot.category || '',
      country: bot.country || '',
      categories: bot.categories || [],
      telegramLink: bot.telegramLink,
      description: bot.description,
      description_de: bot.description_de || '',
      description_es: bot.description_es || '',
      image: bot.image || '/assets/image.jpg',
      createdBy: bot.createdBy,
      createdByUsername: bot.createdByUsername || '',
      status: bot.status || 'pending',
      views: bot.views || 0,
      clickCount: bot.clickCount || 0,
      memberCount: bot.memberCount || 0,
      createdAt: bot.createdAt,
    });

    await Bot.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Moved to groups successfully', groupId: group._id, slug: group.slug });
  } catch (err: any) {
    console.error('move-to-group error:', err);
    return NextResponse.json({ message: err.message || 'Internal error' }, { status: 500 });
  }
}
