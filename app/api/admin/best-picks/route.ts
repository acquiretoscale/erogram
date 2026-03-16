import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Group, BestGroupPick } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    return user?.isAdmin ? user : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetType = searchParams.get('targetType') || 'category';
    const targetValue = searchParams.get('targetValue');

    if (!targetValue) {
      return NextResponse.json({ message: 'targetValue is required' }, { status: 400 });
    }

    const picks = await BestGroupPick.find({ targetType, targetValue })
      .sort({ position: 1 })
      .populate({
        path: 'group',
        select: 'name slug category country image views memberCount status verified premiumOnly description',
      })
      .lean();

    const validPicks = picks.filter((p: any) => p.group && p.group.status === 'approved');

    return NextResponse.json(validPicks);
  } catch (error: any) {
    console.error('Error fetching best picks:', error);
    return NextResponse.json({ message: 'Failed to fetch best picks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { targetType, targetValue, groupId, position } = await req.json();

    if (!targetType || !targetValue || !groupId || !position) {
      return NextResponse.json({ message: 'targetType, targetValue, groupId, and position are required' }, { status: 400 });
    }

    if (position < 1 || position > 10) {
      return NextResponse.json({ message: 'Position must be between 1 and 10' }, { status: 400 });
    }

    const group = await Group.findById(groupId);
    if (!group || group.status !== 'approved') {
      return NextResponse.json({ message: 'Group not found or not approved' }, { status: 404 });
    }

    const existingPosition = await BestGroupPick.findOne({ targetType, targetValue, position });
    if (existingPosition) {
      await BestGroupPick.deleteOne({ _id: existingPosition._id });
    }

    const existingGroup = await BestGroupPick.findOne({ targetType, targetValue, group: groupId });
    if (existingGroup) {
      await BestGroupPick.deleteOne({ _id: existingGroup._id });
    }

    const pick = await BestGroupPick.create({
      targetType,
      targetValue,
      group: groupId,
      position,
    });

    const populated = await BestGroupPick.findById(pick._id)
      .populate({
        path: 'group',
        select: 'name slug category country image views memberCount status verified premiumOnly description',
      })
      .lean();

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    console.error('Error creating best pick:', error);
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Duplicate pick – position or group already assigned' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to create best pick' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'id is required' }, { status: 400 });
    }

    const deleted = await BestGroupPick.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: 'Pick not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Pick removed' });
  } catch (error: any) {
    console.error('Error deleting best pick:', error);
    return NextResponse.json({ message: 'Failed to delete best pick' }, { status: 500 });
  }
}
