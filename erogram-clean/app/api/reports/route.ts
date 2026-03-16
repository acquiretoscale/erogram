import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Report, Group, User } from '@/lib/models/index';
import { authenticateUser } from '@/lib/auth';

const VALID_REASONS = [
  'Spam',
  'Inappropriate Content',
  'Fake Group',
  'Harassment',
  'Dead Link',
  'Wrong Category',
  'Duplicate',
  'Other',
];

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { groupId, reason, customReason } = body;

    if (!groupId || !reason) {
      return NextResponse.json({ error: 'Group ID and reason are required' }, { status: 400 });
    }

    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (reason === 'Other' && !customReason?.trim()) {
      return NextResponse.json({ error: 'Custom reason is required when selecting "Other"' }, { status: 400 });
    }

    const user = await authenticateUser(request);

    let createdBy = null;
    if (group.createdBy) {
      try {
        const creator = await User.findById(group.createdBy).select('username');
        if (creator) createdBy = { username: creator.username || 'Unknown' };
      } catch { /* ignore */ }
    }

    const report = new Report({
      type: 'group',
      targetId: groupId,
      reportedBy: user?._id || null,
      reason: reason === 'Other' ? `Other: ${customReason}` : reason,
      status: 'pending',
      groupDetails: {
        name: group.name,
        category: group.category,
        categories: group.categories,
        country: group.country,
        description: group.description,
        telegramLink: group.telegramLink,
        slug: group.slug,
      },
      createdBy,
    });

    await report.save();

    return NextResponse.json({ message: 'Report submitted successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error submitting report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}