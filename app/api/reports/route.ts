import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Report, Group, User } from '@/lib/models/index';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { groupId, reason, customReason } = body;

    // Validate required fields
    if (!groupId || !reason) {
      return NextResponse.json(
        { error: 'Group ID and reason are required' },
        { status: 400 }
      );
    }

    // Validate reason
    const validReasons = ['Spam', 'Inappropriate Content', 'Fake Group', 'Harassment', 'Other'];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid reason' },
        { status: 400 }
      );
    }

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    // For "Other" reason, custom description is required
    if (reason === 'Other' && !customReason?.trim()) {
      return NextResponse.json(
        { error: 'Custom reason is required when selecting "Other"' },
        { status: 400 }
      );
    }

    // Get group creator details for caching
    let createdBy = null;
    if (group.createdBy) {
      try {
        const user = await User.findById(group.createdBy).select('username');
        if (user) {
          createdBy = {
            username: user.username || 'Unknown',
          };
        }
      } catch (error) {
        console.error('Error fetching group creator:', error);
      }
    }

    // Create the report
    const report = new Report({
      type: 'group',
      targetId: groupId,
      reportedBy: null, // Anonymous report
      reason: reason === 'Other' ? `Other: ${customReason}` : reason,
      status: 'pending',
      groupDetails: {
        name: group.name,
        category: group.category,
        country: group.country,
        description: group.description,
        telegramLink: group.telegramLink,
        slug: group.slug,
      },
      createdBy,
    });

    await report.save();

    return NextResponse.json(
      { message: 'Report submitted successfully' },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error submitting report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}