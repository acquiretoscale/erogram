import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Image } from '@/lib/models';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await connectDB();
        const image = await Image.findById(id).lean() as any;

        if (!image || !image.data) {
            return new NextResponse('Image not found', { status: 404 });
        }

        // Convert Binary/Buffer to Buffer if needed
        const buffer = Buffer.isBuffer(image.data)
            ? image.data
            : Buffer.from(image.data.buffer || image.data);

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': image.contentType || 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Content-Length': buffer.length.toString(),
            },
        });
    } catch (error: any) {
        console.error('Image serve error:', error);
        return new NextResponse('Image not found', { status: 404 });
    }
}
