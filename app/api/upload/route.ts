import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import connectDB from '@/lib/db/mongodb';
import { Image } from '@/lib/models';

const MAX_SIZE_BYTES = 200 * 1024; // 200KB max

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { message: 'No file uploaded' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json(
                { message: 'Invalid file type' },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Compress and resize with sharp
        let compressed = await sharp(buffer)
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 75 })
            .toBuffer();

        // If still over 200KB, reduce quality further
        if (compressed.length > MAX_SIZE_BYTES) {
            compressed = await sharp(buffer)
                .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 50 })
                .toBuffer();
        }

        // If still over 200KB, resize smaller
        if (compressed.length > MAX_SIZE_BYTES) {
            compressed = await sharp(buffer)
                .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 40 })
                .toBuffer();
        }

        // Save to MongoDB
        await connectDB();
        const image = await Image.create({
            data: compressed,
            contentType: 'image/jpeg',
            filename: file.name || 'upload.jpg',
        });

        // Return the API URL for this image
        const url = `/api/images/${image._id}`;
        return NextResponse.json({ url });
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { message: error.message || 'Upload failed' },
            { status: 500 }
        );
    }
}
