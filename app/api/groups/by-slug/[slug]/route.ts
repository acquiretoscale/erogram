import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Group } from '@/lib/models';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    
    const { slug } = await params;
    
    const group = await Group.findOne({ slug })
      .populate('createdBy', 'username showNicknameUnderGroups')
      .lean();
    
    if (!group) {
      return NextResponse.json(
        { message: 'Group not found' },
        { status: 404 }
      );
    }

    // Increment view count (fire and forget)
    const groupId = (group as any)._id;
    Group.findByIdAndUpdate(groupId, {
      $inc: { views: 1 }
    }).catch(err => console.error('Error updating views:', err));
    
    return NextResponse.json(group);
  } catch (error: any) {
    console.error('Error fetching group:', error);
    return NextResponse.json(
      { message: 'Failed to load group' },
      { status: 500 }
    );
  }
}

