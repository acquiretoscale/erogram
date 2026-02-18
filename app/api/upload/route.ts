import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { uploadToR2, isR2Configured } from '@/lib/r2';

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

        if (!file.type.startsWith('image/')) {
            return NextResponse.json(
                { message: 'Invalid file type' },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const isGif = file.type === 'image/gif';

        let finalBuffer: Buffer;
        let key: string;
        let mime: string;

        if (isGif) {
            finalBuffer = buffer;
            key = `uploads/${randomUUID()}.gif`;
            mime = 'image/gif';
        } else {
            let compressed = await sharp(buffer)
                .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();
            if (compressed.length > 200 * 1024) {
                compressed = await sharp(buffer)
                    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 55 })
                    .toBuffer();
            }
            if (compressed.length > 200 * 1024) {
                compressed = await sharp(buffer)
                    .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 45 })
                    .toBuffer();
            }
            key = `uploads/${randomUUID()}.webp`;
            mime = 'image/webp';
            finalBuffer = compressed;
        }

        let url: string;

        if (isR2Configured) {
            url = await uploadToR2(finalBuffer, key, mime);
        } else {
            // Fallback: write to public/uploads so images work without R2 (e.g. local dev)
            const publicDir = path.join(process.cwd(), 'public');
            const uploadsDir = path.join(publicDir, 'uploads');
            await mkdir(uploadsDir, { recursive: true });
            const filePath = path.join(uploadsDir, path.basename(key));
            await writeFile(filePath, finalBuffer);
            url = `/${key}`;
        }

        return NextResponse.json({ url });
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { message: error.message || 'Upload failed' },
            { status: 500 }
        );
    }
}
