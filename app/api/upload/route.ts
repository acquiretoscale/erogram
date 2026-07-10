import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { uploadToR2, isR2Configured } from '@/lib/r2';

const isVercel = process.env.VERCEL === '1';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        // Optional keyword-rich basename (e.g. article slug) for SEO-friendly R2 keys.
        const nameHint = formData.get('name') as string | null;
        // Optional folder target. 'ainsfw' → SEO name {name}-{category}.webp, capped 100KB.
        const folder = formData.get('folder') as string | null;
        const categoryHint = formData.get('category') as string | null;

        const slug = (s: string | null) => (s || '')
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 90);

        // Slugify a hint into a safe, keyword-rich filename; '' if none usable.
        const keywordBase = slug(nameHint);
        const isAinsfw = folder === 'ainsfw' && keywordBase;
        const ainsfwKey = isAinsfw
            ? `ainsfw/${keywordBase}${categoryHint ? `-${slug(categoryHint)}` : ''}.webp`
            : '';

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

        // For article uploads with a keyword hint, store under articles/ with the
        // keyword name (+ short suffix to avoid overwrites). Otherwise keep legacy UUID.
        const shortId = randomUUID().slice(0, 8);
        const basename = (ext: string) =>
            keywordBase
                ? `articles/${keywordBase}-${shortId}.${ext}`
                : `uploads/${randomUUID()}.${ext}`;

        if (isGif && !isAinsfw) {
            finalBuffer = buffer;
            key = basename('gif');
            mime = 'image/gif';
        } else if (isAinsfw) {
            // AI NSFW tool images: WebP, capped at 100KB, SEO-named in ainsfw/.
            const MAX = 100 * 1024;
            const attempts = [
                { w: 800, q: 82 }, { w: 800, q: 70 }, { w: 700, q: 62 },
                { w: 640, q: 55 }, { w: 600, q: 48 }, { w: 520, q: 42 },
                { w: 460, q: 38 }, { w: 400, q: 34 },
            ];
            let compressed: Buffer = buffer;
            for (const a of attempts) {
                compressed = await sharp(buffer)
                    .rotate()
                    .resize(a.w, a.w, { fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: a.q })
                    .toBuffer();
                if (compressed.length <= MAX) break;
            }
            key = ainsfwKey;
            mime = 'image/webp';
            finalBuffer = compressed;
        } else {
            let compressed = await sharp(buffer)
                .rotate()
                .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();
            if (compressed.length > 200 * 1024) {
                compressed = await sharp(buffer)
                    .rotate()
                    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 55 })
                    .toBuffer();
            }
            if (compressed.length > 200 * 1024) {
                compressed = await sharp(buffer)
                    .rotate()
                    .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 45 })
                    .toBuffer();
            }
            key = basename('webp');
            mime = 'image/webp';
            finalBuffer = compressed;
        }

        let url: string;

        if (isR2Configured()) {
            url = await uploadToR2(finalBuffer, key, mime);
        } else if (isVercel) {
            return NextResponse.json(
                {
                    message:
                        'Image upload is not configured. In Vercel, add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_PUBLIC_URL to Environment Variables, then redeploy.',
                },
                { status: 503 }
            );
        } else {
            // Local dev only: write to public/uploads (never used on Vercel)
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
