import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

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

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json(
                { message: 'Invalid file type' },
                { status: 400 }
            );
        }

        // Generate unique filename
        const extension = file.name.split('.').pop() || 'jpg';
        const filename = `${uuidv4()}.${extension}`;
        const uploadDir = join(process.cwd(), 'public/uploads');
        const filepath = join(uploadDir, filename);

        // Write file to disk
        await writeFile(filepath, buffer);

        // Return the URL
        const url = `/uploads/${filename}`;
        return NextResponse.json({ url });
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { message: error.message || 'Upload failed' },
            { status: 500 }
        );
    }
}
