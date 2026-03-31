import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await connectDB();

        const db = mongoose.connection.db!;

        const redirect = await db
            .collection('imageredirects')
            .findOne({ _id: new mongoose.Types.ObjectId(id) });

        if (redirect?.url) {
            return NextResponse.redirect(redirect.url, 301);
        }

        const image = await db
            .collection('images')
            .findOne({ _id: new mongoose.Types.ObjectId(id) });

        if (!image || !image.data) {
            return new NextResponse('Image not found', { status: 404 });
        }

        const raw = image.data.buffer || image.data;
        const buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);

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
