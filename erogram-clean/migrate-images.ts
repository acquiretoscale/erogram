import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import connectDB from './lib/db/mongodb';
import { Group, Bot, Advert } from './lib/models';

// Config
const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads');

// Ensure directories exist
['groups', 'bots', 'adverts'].forEach(dir => {
    const fullPath = path.join(UPLOAD_DIR, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

async function migrateCollection(Model: any, type: 'groups' | 'bots' | 'adverts') {
    console.log(`Starting migration for ${type}...`);

    const items = await Model.find({
        image: { $regex: /^data:image/ }
    });

    console.log(`Found ${items.length} items with base64 images in ${type}`);

    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
        try {
            if (!item.image || !item.image.startsWith('data:image')) continue;

            // Extract extension and data
            const matches = item.image.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                console.warn(`Invalid base64 format for ${item.slug || item._id}`);
                continue;
            }

            const ext = matches[1].replace('jpeg', 'jpg');
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');

            // Generate filename
            const filename = `${item.slug || item._id}.${ext}`;
            const relativePath = `/uploads/${type}/${filename}`;
            const absolutePath = path.join(UPLOAD_DIR, type, filename);

            // Write file
            fs.writeFileSync(absolutePath, buffer);

            // Update DB
            item.image = relativePath;
            await item.save();

            successCount++;
            if (successCount % 10 === 0) {
                process.stdout.write('.');
            }
        } catch (err) {
            console.error(`Error migrating ${item.slug || item._id}:`, err);
            errorCount++;
        }
    }

    console.log(`\nFinished ${type}: ${successCount} migrated, ${errorCount} errors.`);
}

async function main() {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        await migrateCollection(Group, 'groups');
        await migrateCollection(Bot, 'bots');
        await migrateCollection(Advert, 'adverts');

        console.log('Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

main();
