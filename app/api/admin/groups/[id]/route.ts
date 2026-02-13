import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Group } from '@/lib/models';
import { sendNewGroupTelegramNotification } from '@/lib/utils/telegramNotify';
import { submitToIndexNow } from '@/lib/utils/indexNow';

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

// Update a group
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
    
    // Remove fields that shouldn't be updated directly
    const { _id, __v, createdAt, ...updateData } = body;
    
    // Fetch existing group to preserve image if not provided
    const oldGroup = await Group.findById(id);
    if (!oldGroup) {
      return NextResponse.json(
        { message: 'Group not found' },
        { status: 404 }
      );
    }
    
    // If image is not provided or is placeholder, preserve existing image
    if (!updateData.image || updateData.image === '/assets/image.jpg' || updateData.image === '') {
      // Don't update image - preserve the existing one
      delete updateData.image;
      console.log('[Group Update] Image not provided in update, preserving existing image from database');
    } else {
      // Validate and prepare image if provided
      if (updateData.image.startsWith('data:image/')) {
        // Validate base64 data URI format
        const base64Match = updateData.image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!base64Match || !base64Match[2]) {
          console.warn('[Group Update] Invalid base64 image format, keeping existing image');
          delete updateData.image; // Don't update with invalid image
        } else {
          console.log(`[Group Update] Updating with base64 image (type: ${base64Match[1]}, length: ${updateData.image.length})`);
        }
      }
    }
    
    const group = await Group.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!group) {
      return NextResponse.json(
        { message: 'Group not found' },
        { status: 404 }
      );
    }
    
    // Send Telegram notification if status changed to approved
    if (body.status === 'approved' && oldGroup.status !== 'approved') {
      try {
        // Fetch the group with image field explicitly included
        // Use the updated group object which should have the latest data
        const groupWithImage = await Group.findById(id).lean() as any;
        if (!groupWithImage) {
          console.error('[Group Update] Could not fetch group with image for notification');
          return NextResponse.json(group);
        }
        
        // Debug: Log the image value from database
        const imagePreview = groupWithImage.image ? (groupWithImage.image.substring(0, 50) + (groupWithImage.image.length > 50 ? '...' : '')) : 'null';
        console.log(`[Group Update] Fetched image for notification: ${imagePreview} (length: ${groupWithImage.image?.length || 0}, isPlaceholder: ${groupWithImage.image === '/assets/image.jpg'}, isBase64: ${groupWithImage.image?.startsWith('data:image/') || false})`);
        
        // Use the image from the database - it should be the actual uploaded image
        let actualImage = groupWithImage.image;
        
        // If it's the placeholder, check if we have a valid image in the update body
        if (!actualImage || actualImage === '/assets/image.jpg') {
          // Check if image was in the update body and is valid
          if (body.image && body.image !== '/assets/image.jpg') {
            if (body.image.startsWith('data:image/')) {
              actualImage = body.image;
              console.log('[Group Update] Using valid base64 image from update body');
            } else {
              actualImage = body.image;
              console.log('[Group Update] Using image URL from update body');
            }
          } else {
            console.log(`[Group Update] Warning: Image is placeholder in database for group ${groupWithImage.name}`);
            actualImage = '/assets/image.jpg';
          }
        } else {
          console.log(`[Group Update] Using image from database (isBase64: ${actualImage.startsWith('data:image/')})`);
        }
        
        // Convert to plain object and ensure image is included
        const groupPlainObject = {
          _id: groupWithImage._id.toString(),
          name: groupWithImage.name,
          slug: groupWithImage.slug,
          category: groupWithImage.category,
          country: groupWithImage.country,
          description: groupWithImage.description,
          telegramLink: groupWithImage.telegramLink,
          image: actualImage,
          views: groupWithImage.views || 0
        };
        
        // Debug: Log what we're sending
        console.log(`[Group Update] Sending notification with image: ${actualImage.substring(0, 50)}${actualImage.length > 50 ? '...' : ''} (length: ${actualImage.length}, isBase64: ${actualImage.startsWith('data:image/')})`);
        
        const notificationResult = await sendNewGroupTelegramNotification(groupPlainObject, false);
        if (notificationResult && !notificationResult.success) {
          console.error('[Group Update] Telegram notification failed:', notificationResult.error);
          if (notificationResult.details) {
            console.error('[Group Update] Notification error details:', notificationResult.details);
          }
        } else if (notificationResult?.success) {
          console.log('[Group Update] Telegram notification sent successfully');
        }

        // Submit to IndexNow
        submitToIndexNow([`https://erogram.pro/${group.slug}`]);
      } catch (err) {
        console.error('[Group Update] Failed to send Telegram notification:', err);
        // Don't fail the update if notification fails
      }
    }
    
    return NextResponse.json(group);
  } catch (error: any) {
    console.error('Group update error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update group' },
      { status: 500 }
    );
  }
}

// Delete a group
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
    const group = await Group.findByIdAndDelete(id);
    
    if (!group) {
      return NextResponse.json(
        { message: 'Group not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Group deleted successfully' });
  } catch (error: any) {
    console.error('Group delete error:', error);
    return NextResponse.json(
      { message: 'Failed to delete group' },
      { status: 500 }
    );
  }
}

