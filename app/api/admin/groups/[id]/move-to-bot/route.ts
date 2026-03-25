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
    const group = await Group.findById(id).lean() as any;
    if (!group) {
      return NextResponse.json({ message: 'Group not found' }, { status: 404 });
    }

    // Ensure the slug is unique in the bots collection; append -bot if taken
    let slug = group.slug as string;
    const existing = await Bot.findOne({ slug });
    if (existing) {
      slug = `${slug}-bot`;
    }

    const bot = await Bot.create({
      name: group.name,
      slug,
      category: group.category || '',
      country: group.country || '',
      categories: group.categories || [],
      telegramLink: group.telegramLink,
      description: group.description,
      description_de: group.description_de || '',
      description_es: group.description_es || '',
      image: group.image || '/assets/image.jpg',
      createdBy: group.createdBy,
      createdByUsername: group.createdByUsername || '',
      status: group.status || 'pending',
      views: group.views || 0,
      clickCount: group.clickCount || 0,
      memberCount: group.memberCount || 0,
      createdAt: group.createdAt,
    });

    await Group.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Moved to bots successfully', botId: bot._id, slug: bot.slug });
  } catch (err: any) {
    console.error('move-to-bot error:', err);
    return NextResponse.json({ message: err.message || 'Internal error' }, { status: 500 });
  }
}
