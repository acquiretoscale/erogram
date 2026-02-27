import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Campaign } from '@/lib/models';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const campaigns = await Campaign.find({
      slot: 'feed',
      status: 'active',
      isVisible: true,
      startDate: { $lte: now },
      endDate: { $gte: startOfToday },
    })
      .select('_id name creative videoUrl destinationUrl description buttonText badgeText verified')
      .lean() as any[];

    const video = campaigns.find((c) => c.videoUrl);
    const image = campaigns.find((c) => !c.videoUrl && c.creative);

    return NextResponse.json({
      video: video
        ? {
            _id: video._id.toString(),
            name: video.name,
            creative: video.creative || '',
            videoUrl: video.videoUrl || '',
            destinationUrl: video.destinationUrl,
            description: video.description || '',
            buttonText: video.buttonText || 'Visit Site',
            badgeText: video.badgeText || '',
            verified: Boolean(video.verified),
          }
        : null,
      image: image
        ? {
            _id: image._id.toString(),
            name: image.name,
            creative: image.creative || '',
            destinationUrl: image.destinationUrl,
            description: image.description || '',
            buttonText: image.buttonText || 'Visit Site',
            badgeText: image.badgeText || '',
            verified: Boolean(image.verified),
          }
        : null,
    });
  } catch {
    return NextResponse.json({ video: null, image: null });
  }
}
